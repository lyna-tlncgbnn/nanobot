"""Service helpers backing the nanobot HTTP API."""

from __future__ import annotations

import asyncio
import contextlib
import json
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx

from nanobot.agent.loop import AgentLoop
from nanobot.bus.queue import MessageBus
from nanobot.config.loader import load_config
from nanobot.config.schema import Config
from nanobot.cron.service import CronService
from nanobot.cron.types import CronJob, CronJobState, CronPayload, CronSchedule
from nanobot.session.manager import SessionManager
from nanobot.utils.helpers import get_cron_history_path, get_cron_store_path


def _make_provider_for_api(config: Config):
    """Create an LLM provider for API usage.

    This intentionally duplicates the CLI provider factory to keep the API layer
    isolated and avoid reshaping existing CLI startup code.
    """
    from nanobot.providers.custom_provider import CustomProvider
    from nanobot.providers.litellm_provider import LiteLLMProvider
    from nanobot.providers.openai_codex_provider import OpenAICodexProvider
    from nanobot.providers.registry import find_by_name

    model = config.agents.defaults.model
    provider_name = config.get_provider_name(model)
    provider_cfg = config.get_provider(model)

    if provider_name == "openai_codex" or model.startswith("openai-codex/"):
        return OpenAICodexProvider(default_model=model)

    if provider_name == "custom":
        return CustomProvider(
            api_key=provider_cfg.api_key if provider_cfg else "no-key",
            api_base=config.get_api_base(model) or "http://localhost:8000/v1",
            default_model=model,
        )

    spec = find_by_name(provider_name)
    if not model.startswith("bedrock/") and not (provider_cfg and provider_cfg.api_key) and not (
        spec and spec.is_oauth
    ):
        raise RuntimeError("No API key configured. Set one in ./config.json under providers section")

    return LiteLLMProvider(
        api_key=provider_cfg.api_key if provider_cfg else None,
        api_base=config.get_api_base(model),
        default_model=model,
        extra_headers=provider_cfg.extra_headers if provider_cfg else None,
        provider_name=provider_name,
    )


def _build_agent_loop(config: Config) -> AgentLoop:
    """Create a fresh AgentLoop for one API request lifecycle."""
    provider = _make_provider_for_api(config)
    provider_cfg = config.get_provider(config.agents.defaults.model)
    # Web/API 层里 agent 自己调用 cron 工具时，不能再绑定一个临时本地 CronService。
    # 否则工具调用只会写 workspace/jobs.json，却不会进入正在运行的 gateway 调度器。
    # 这里改成 gateway 代理版，让 Web 聊天里的“帮我 2 分钟后提醒”与右侧任务面板走同一条调度链路。
    cron = GatewayCronServiceProxy(config)
    browser_agent_model = config.tools.browser_agent.model or config.agents.defaults.model
    browser_agent_api_key = config.tools.browser_agent.api_key or (
        provider_cfg.api_key if provider_cfg else None
    )
    browser_agent_api_base = config.tools.browser_agent.api_base or config.get_api_base(
        browser_agent_model
    )
    browser_agent_extra_headers = config.tools.browser_agent.extra_headers
    if browser_agent_extra_headers is None and browser_agent_model == config.agents.defaults.model:
        browser_agent_extra_headers = provider_cfg.extra_headers if provider_cfg else None

    return AgentLoop(
        bus=MessageBus(),
        provider=provider,
        workspace=config.workspace_path,
        model=config.agents.defaults.model,
        temperature=config.agents.defaults.temperature,
        max_tokens=config.agents.defaults.max_tokens,
        max_iterations=config.agents.defaults.max_tool_iterations,
        memory_window=config.agents.defaults.memory_window,
        brave_api_key=config.tools.web.search.api_key or None,
        exec_config=config.tools.exec,
        cron_service=cron,
        restrict_to_workspace=config.tools.restrict_to_workspace,
        mcp_servers=config.tools.mcp_servers,
        channels_config=config.channels,
        browser_agent_config=config.tools.browser_agent,
        browser_agent_api_key=browser_agent_api_key,
        browser_agent_api_base=browser_agent_api_base,
        browser_agent_extra_headers=browser_agent_extra_headers,
    )


def _deserialize_job(payload: dict[str, Any]) -> CronJob:
    """把 gateway/API 返回的任务结构还原成 CronJob，供 cron 工具复用。"""
    schedule_payload = payload.get("schedule", {})
    state_payload = payload.get("state", {})
    payload_payload = payload.get("payload", {})
    return CronJob(
        id=str(payload.get("id", "")),
        name=str(payload.get("name", "")),
        enabled=bool(payload.get("enabled", True)),
        schedule=CronSchedule(
            kind=str(schedule_payload.get("kind", "every")),
            at_ms=schedule_payload.get("at_ms"),
            every_ms=schedule_payload.get("every_ms"),
            expr=schedule_payload.get("expr"),
            tz=schedule_payload.get("tz"),
        ),
        payload=CronPayload(
            kind=str(payload_payload.get("kind", "agent_turn")),
            message=str(payload_payload.get("message", "")),
            deliver=bool(payload_payload.get("deliver", False)),
            channel=payload_payload.get("channel"),
            to=payload_payload.get("to"),
        ),
        state=CronJobState(
            next_run_at_ms=state_payload.get("next_run_at_ms"),
            last_run_at_ms=state_payload.get("last_run_at_ms"),
            last_status=state_payload.get("last_status"),
            last_error=state_payload.get("last_error"),
        ),
        created_at_ms=int(payload.get("created_at_ms", 0) or 0),
        updated_at_ms=int(payload.get("updated_at_ms", 0) or 0),
        delete_after_run=bool(payload.get("delete_after_run", False)),
    )


class GatewayCronServiceProxy:
    """A minimal CronService-compatible proxy that delegates cron tool calls to gateway."""

    def __init__(self, config: Config):
        self._config = config

    def add_job(
        self,
        name: str,
        schedule: CronSchedule,
        message: str,
        deliver: bool = False,
        channel: str | None = None,
        to: str | None = None,
        delete_after_run: bool = False,
    ) -> CronJob:
        json_body = {
            "name": name,
            "message": message,
            "deliver": deliver,
            "channel": channel,
            "to": to,
        }
        if schedule.kind == "every":
            every_ms = schedule.every_ms or 0
            json_body["every_seconds"] = max(1, every_ms // 1000)
        elif schedule.kind == "cron":
            json_body["cron_expr"] = schedule.expr
            json_body["tz"] = schedule.tz
        elif schedule.kind == "at" and schedule.at_ms:
            json_body["at"] = datetime.fromtimestamp(schedule.at_ms / 1000).isoformat()
        else:
            raise ValueError("invalid cron schedule payload")

        created = _request_gateway(self._config, "POST", "/internal/jobs", json_body=json_body)
        if not created:
            raise RuntimeError("Gateway did not return created job")
        return _deserialize_job(created)

    def list_jobs(self, include_disabled: bool = False) -> list[CronJob]:
        items = _request_gateway(
            self._config,
            "GET",
            "/internal/jobs",
            params={"include_disabled": include_disabled},
        ) or []
        return [_deserialize_job(item) for item in items]

    def remove_job(self, job_id: str) -> bool:
        result = _request_gateway(self._config, "DELETE", f"/internal/jobs/{job_id}")
        return bool(result and result.get("ok"))


def _gateway_base_url(config: Config) -> str:
    """返回 API 访问 gateway 内部管理接口时使用的地址。"""
    host = config.gateway.host
    if host in {"0.0.0.0", "::", ""}:
        host = "127.0.0.1"
    return f"http://{host}:{config.gateway.port}"


def _format_timestamp(ms: int | None) -> str | None:
    """把毫秒时间戳转换为 ISO 字符串。"""
    if ms is None:
        return None
    return datetime.fromtimestamp(ms / 1000).isoformat()


def _serialize_schedule(schedule: CronSchedule) -> dict[str, Any]:
    """序列化调度配置。"""
    return {
        "kind": schedule.kind,
        "at_ms": schedule.at_ms,
        "every_ms": schedule.every_ms,
        "expr": schedule.expr,
        "tz": schedule.tz,
        "at": _format_timestamp(schedule.at_ms),
    }


def _serialize_job(job: CronJob) -> dict[str, Any]:
    """把 CronJob 转成前端可消费结构。"""
    return {
        "id": job.id,
        "name": job.name,
        "enabled": job.enabled,
        "schedule": _serialize_schedule(job.schedule),
        "payload": {
            "kind": job.payload.kind,
            "message": job.payload.message,
            "deliver": job.payload.deliver,
            "channel": job.payload.channel,
            "to": job.payload.to,
        },
        "state": {
            "next_run_at_ms": job.state.next_run_at_ms,
            "next_run_at": _format_timestamp(job.state.next_run_at_ms),
            "last_run_at_ms": job.state.last_run_at_ms,
            "last_run_at": _format_timestamp(job.state.last_run_at_ms),
            "last_status": job.state.last_status,
            "last_error": job.state.last_error,
        },
        "created_at_ms": job.created_at_ms,
        "created_at": _format_timestamp(job.created_at_ms),
        "updated_at_ms": job.updated_at_ms,
        "updated_at": _format_timestamp(job.updated_at_ms),
        "delete_after_run": job.delete_after_run,
    }


def _load_cron_service(config: Config) -> CronService:
    """按当前 workspace 构建只读 cron 服务实例。"""
    return CronService(get_cron_store_path(config.workspace_path))


def _history_path(config: Config) -> Path:
    """获取当前 workspace 的 cron 历史文件路径。"""
    return get_cron_history_path(config.workspace_path)


def _read_job_history(history_path: Path) -> list[dict[str, Any]]:
    """读取 cron 执行历史，并按执行时间倒序返回。"""
    if not history_path.exists():
        return []

    items: list[dict[str, Any]] = []
    with open(history_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                items.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    return sorted(items, key=lambda item: item.get("executed_at_ms", 0), reverse=True)


def _request_gateway(
    config: Config,
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    json_body: dict[str, Any] | None = None,
) -> Any:
    """把 jobs 管理操作转发给正在运行的 gateway。"""
    url = f"{_gateway_base_url(config)}{path}"
    try:
        # 这里强制关闭环境代理，保证 API 转发 gateway 内部地址时始终直连本机。
        # 否则某些运行环境下 httpx 可能继承系统代理配置，导致 127.0.0.1 请求异常。
        with httpx.Client(timeout=10.0, trust_env=False) as client:
            response = client.request(method, url, params=params, json=json_body)
    except httpx.HTTPError as exc:
        raise RuntimeError(
            f"Gateway jobs service is unavailable: {exc.__class__.__name__}: {exc}"
        ) from exc

    if response.status_code == 404:
        return None

    if response.status_code >= 400:
        detail = None
        with contextlib.suppress(Exception):
            detail = response.json().get("detail")
        raise RuntimeError(detail or f"Gateway request failed: {response.status_code}")

    if not response.content:
        return None
    return response.json()


def list_jobs(include_disabled: bool = True) -> list[dict[str, Any]]:
    """列出当前 workspace 下仍然存在的任务。

    读取列表走本地文件，避免右侧面板被 gateway 内部 HTTP 的瞬时波动拖垮。
    """
    config = load_config()
    service = _load_cron_service(config)
    return [_serialize_job(job) for job in service.list_jobs(include_disabled=include_disabled)]


def get_job_detail(job_id: str) -> dict[str, Any] | None:
    """获取单个任务详情。"""
    for job in list_jobs(include_disabled=True):
        if job["id"] == job_id:
            return job
    return None


def list_job_history(job_id: str | None = None) -> list[dict[str, Any]]:
    """列出任务执行历史。

    历史同样直接读 workspace 文件，保证即使 gateway 内部接口异常，前端仍能看到已有数据。
    """
    config = load_config()
    items = _read_job_history(_history_path(config))
    if job_id:
        items = [item for item in items if item.get("job_id") == job_id]
    return items


def create_job(
    *,
    name: str,
    message: str,
    every_seconds: int | None = None,
    cron_expr: str | None = None,
    tz: str | None = None,
    at: str | None = None,
    deliver: bool = True,
    channel: str | None = None,
    to: str | None = None,
) -> dict[str, Any]:
    """创建任务，并交给运行中的 gateway 直接写入内存调度器。"""
    if tz and not cron_expr:
        raise ValueError("tz can only be used with cron_expr")
    if not any([every_seconds, cron_expr, at]):
        raise ValueError("Must specify every_seconds, cron_expr, or at")

    config = load_config()
    return _request_gateway(
        config,
        "POST",
        "/internal/jobs",
        json_body={
            "name": name,
            "message": message,
            "every_seconds": every_seconds,
            "cron_expr": cron_expr,
            "tz": tz,
            "at": at,
            "deliver": deliver,
            "channel": channel,
            "to": to,
        },
    )


def delete_job(job_id: str) -> bool:
    """删除任务。"""
    config = load_config()
    try:
        result = _request_gateway(config, "DELETE", f"/internal/jobs/{job_id}")
        return bool(result and result.get("ok"))
    except RuntimeError:
        # jobs 列表本来就是直接读 workspace 下的本地 store。
        # 当 gateway 内部接口不可用时，至少允许把这类“本地可见但删不掉”的任务清理掉，
        # 避免前端长期卡在 503 和脏数据之间。
        service = _load_cron_service(config)
        return service.remove_job(job_id)


def set_job_enabled(job_id: str, enabled: bool) -> dict[str, Any] | None:
    """启用或禁用任务。"""
    config = load_config()
    try:
        return _request_gateway(
            config,
            "PATCH",
            f"/internal/jobs/{job_id}",
            json_body={"enabled": enabled},
        )
    except RuntimeError:
        # 同 delete_job，一旦 gateway 不可达，就退回到 workspace 本地 store 做状态修改，
        # 保证前端至少能处理当前看到的任务条目。
        service = _load_cron_service(config)
        job = service.enable_job(job_id, enabled=enabled)
        return _serialize_job(job) if job else None


async def run_chat(message: str, session_id: str) -> str:
    """Run one direct agent turn for the API layer."""
    config = load_config()
    agent_loop = _build_agent_loop(config)
    try:
        return await agent_loop.process_direct(
            message,
            session_key=session_id,
            channel="web",
            chat_id=session_id,
        )
    finally:
        await agent_loop.close_mcp()
        agent_loop.stop()


async def stream_chat(message: str, session_id: str):
    """Yield message-level events for the Web frontend without changing sync callers."""
    config = load_config()
    agent_loop = _build_agent_loop(config)
    queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()
    stream_index = 0

    async def _on_message(message_payload: dict[str, Any]) -> None:
        nonlocal stream_index
        stream_index += 1
        await queue.put(
            {
                "type": "message",
                "session_id": session_id,
                "message": _serialize_session_message(message_payload, stream_index),
            }
        )

    async def _run() -> None:
        try:
            reply = await agent_loop.process_direct(
                message,
                session_key=session_id,
                channel="web",
                chat_id=session_id,
                on_message=_on_message,
            )
            await queue.put(
                {
                    "type": "done",
                    "session_id": session_id,
                    "reply": reply,
                }
            )
        except Exception as exc:
            await queue.put(
                {
                    "type": "error",
                    "session_id": session_id,
                    "error": str(exc),
                }
            )
        finally:
            await agent_loop.close_mcp()
            agent_loop.stop()
            await queue.put(None)

    task = asyncio.create_task(_run())
    try:
        while True:
            item = await queue.get()
            if item is None:
                break
            yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n"
    finally:
        if not task.done():
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task


def _serialize_session_message(message: dict[str, Any], index: int) -> dict[str, Any]:
    timestamp = message.get("timestamp")
    tool_call_id = message.get("tool_call_id")
    role = str(message.get("role", ""))
    return {
        "id": f"{role}:{timestamp or 'no-ts'}:{tool_call_id or 'no-tool'}:{index}",
        "role": role,
        "content": str(message.get("content", "")),
        "timestamp": timestamp,
        "name": message.get("name"),
        "tool_call_id": tool_call_id,
        "tool_calls": message.get("tool_calls"),
    }


def list_sessions() -> list[dict[str, Any]]:
    """Return workspace sessions for frontend list rendering."""
    config = load_config()
    manager = SessionManager(config.workspace_path)
    summaries: list[dict[str, Any]] = []
    for item in manager.list_sessions():
        session = manager.get_or_create(item["key"])
        summaries.append(
            {
                "id": item["key"],
                "created_at": item.get("created_at"),
                "updated_at": item.get("updated_at"),
                "path": item.get("path"),
                "message_count": len(session.messages),
            }
        )
    return summaries


def get_session_detail(session_id: str) -> dict[str, Any]:
    """Return one session with all persisted messages."""
    config = load_config()
    manager = SessionManager(config.workspace_path)
    session = manager.get_or_create(session_id)
    return {
        "session_id": session_id,
        "messages": [
            _serialize_session_message(message, index)
            for index, message in enumerate(session.messages)
        ],
    }


def delete_session(session_id: str) -> bool:
    """Delete one persisted session."""
    config = load_config()
    manager = SessionManager(config.workspace_path)
    return manager.delete_session(session_id)
