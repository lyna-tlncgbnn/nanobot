"""Service helpers backing the nanobot HTTP API."""

from __future__ import annotations

import asyncio
import contextlib
import json
from typing import Any

from nanobot.agent.loop import AgentLoop
from nanobot.bus.queue import MessageBus
from nanobot.config.loader import load_config
from nanobot.config.schema import Config
from nanobot.cron.service import CronService
from nanobot.session.manager import SessionManager
from nanobot.utils.helpers import get_data_path


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
    cron_store_path = get_data_path() / "cron" / "jobs.json"
    cron = CronService(cron_store_path)
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
