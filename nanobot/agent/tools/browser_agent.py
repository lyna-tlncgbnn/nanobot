"""High-level browser automation tool backed by browser-use."""

import asyncio
import json
import os
import subprocess
from urllib.parse import urlparse
from urllib.request import urlopen
from pathlib import Path
from typing import Any

from nanobot.agent.tools.base import Tool


class BrowserAgentTool(Tool):
    """通过独立 browser-use 子进程执行完整浏览器任务。"""

    def __init__(
        self,
        python_path: str,
        script_path: str,
        model: str,
        api_key: str | None,
        api_base: str | None,
        extra_headers: dict[str, str] | None = None,
        timeout: int = 180,
        download_dir: str | None = None,
        headless: bool = False,
        user_data_dir: str | None = None,
        cdp_url: str | None = None,
    ):
        self.python_path = python_path
        self.script_path = script_path
        self.model = model
        self.api_key = api_key or ""
        self.api_base = api_base or ""
        self.extra_headers = extra_headers or {}
        self.timeout = timeout
        self.download_dir = download_dir
        self.headless = headless
        self.user_data_dir = user_data_dir
        self.cdp_url = cdp_url

    @property
    def name(self) -> str:
        return "browser_agent_run"

    @property
    def description(self) -> str:
        return "Use browser-use to complete a full browser task in a separate process and return a structured JSON result."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "task": {"type": "string", "description": "The full browser task to complete."},
                "max_steps": {"type": "integer", "description": "Maximum browser agent steps.", "minimum": 1, "maximum": 100},
                "allowed_domains": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional allowlist of domains the browser agent may visit.",
                },
                "use_vision": {"type": "boolean", "description": "Whether screenshots/vision may be used."},
                "headless": {"type": "boolean", "description": "Override the default headless setting for this run."},
            },
            "required": ["task"],
        }

    async def execute(
        self,
        task: str,
        max_steps: int = 30,
        allowed_domains: list[str] | None = None,
        use_vision: bool = True,
        headless: bool | None = None,
        **kwargs: Any,
    ) -> str:
        python_path = Path(self.python_path)
        script_path = Path(self.script_path)
        if not python_path.exists():
            return f"Error: browser agent python not found: {self.python_path}"
        if not script_path.exists():
            return f"Error: browser agent script not found: {self.script_path}"
        if not self._is_raw_script(script_path) and not self.api_key:
            return "Error: No provider API key available for browser_agent_run."

        if self._is_raw_script(script_path):
            return await self._execute_raw_script(script_path, python_path)

        resolved_cdp_url = self._resolve_cdp_url(self.cdp_url)
        # 这里组装的是“单次工具调用”的 payload。
        # 上面 __init__ 里的字段大多来自 config.json，
        # 这里再叠加本次 tool call 传入的 task/max_steps/use_vision 等参数。
        payload = {
            "task": task,
            "max_steps": max_steps,
            "allowed_domains": allowed_domains or [],
            "use_vision": use_vision,
            "headless": self.headless if headless is None else headless,
            "model": self.model,
            "api_key": self.api_key,
            "api_base": self.api_base,
            "extra_headers": self.extra_headers,
            "downloads_path": self.download_dir,
            "user_data_dir": self.user_data_dir,
            "cdp_url": resolved_cdp_url,
        }
        if self.download_dir:
            try:
                Path(self.download_dir).mkdir(parents=True, exist_ok=True)
            except Exception as exc:
                return f"Error: failed to prepare browser download directory: {exc}"
        env = os.environ.copy()
        for key in ("PYTHONHOME", "PYTHONPATH", "VIRTUAL_ENV"):
            env.pop(key, None)
        # 这些环境变量是给 browser-use 子进程用的，不是给 nanobot 自己用的。
        env["BROWSER_USE_SETUP_LOGGING"] = "false"
        env["PYTHONIOENCODING"] = "utf-8"
        env["PYTHONUTF8"] = "1"

        def _run() -> subprocess.CompletedProcess[str]:
            # timeout 是 nanobot 工具层的等待时间。
            # 超时后 nanobot 会结束这次子进程调用，并把错误结果返回给主模型。
            return subprocess.run(
                [str(python_path), str(script_path)],
                input=json.dumps(payload, ensure_ascii=False),
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=self.timeout,
                env=env,
                cwd=str(script_path.parent),
            )

        try:
            process = await asyncio.to_thread(_run)
        except subprocess.TimeoutExpired:
            return f"Error: browser agent timed out after {self.timeout} seconds"
        except Exception as exc:
            return f"Error: failed to launch browser agent: {exc}"

        stdout = (process.stdout or "").strip()
        stderr = (process.stderr or "").strip()
        if process.returncode != 0 and not stdout:
            return (
                "Error: browser agent failed with exit code "
                f"{process.returncode}. STDERR: {stderr or '(empty)'}"
            )

        try:
            result = json.loads(stdout)
        except json.JSONDecodeError:
            return (
                "Error: browser agent returned non-JSON output. "
                f"STDOUT: {stdout[:800] or '(empty)'} "
                f"STDERR: {stderr[:800] or '(empty)'}"
            )

        if stderr:
            result["stderr"] = stderr[:2000]
        return json.dumps(result, ensure_ascii=False)

    async def _execute_raw_script(self, script_path: Path, python_path: Path) -> str:
        env = os.environ.copy()
        for key in ("PYTHONHOME", "PYTHONPATH", "VIRTUAL_ENV"):
            env.pop(key, None)
        # 兼容直接跑 test_vllm.py 这类脚本时的 Windows 控制台编码问题。
        env["PYTHONIOENCODING"] = "utf-8"
        env["PYTHONUTF8"] = "1"

        def _run() -> subprocess.CompletedProcess[str]:
            return subprocess.run(
                [str(python_path), str(script_path)],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=self.timeout,
                env=env,
                cwd=str(script_path.parent),
            )

        try:
            process = await asyncio.to_thread(_run)
        except subprocess.TimeoutExpired:
            return f"Error: browser agent timed out after {self.timeout} seconds"
        except Exception as exc:
            return f"Error: failed to launch browser agent script: {exc}"

        stdout = (process.stdout or "").strip()
        stderr = (process.stderr or "").strip()
        return json.dumps(
            {
                "success": process.returncode == 0,
                "final_result": stdout or None,
                "errors": [] if process.returncode == 0 else [stderr or f"exit code {process.returncode}"],
                "visited_urls": [],
                "artifacts": [],
                "steps": 0,
                "stderr": stderr[:2000] if stderr else None,
            },
            ensure_ascii=False,
        )

    def _resolve_cdp_url(self, cdp_url: str | None) -> str | None:
        if not cdp_url:
            return cdp_url

        parsed = urlparse(cdp_url)
        if parsed.scheme.startswith("ws"):
            return cdp_url
        if parsed.scheme not in {"http", "https"}:
            return cdp_url

        version_url = cdp_url.rstrip("/")
        if not version_url.endswith("/json/version"):
            version_url = f"{version_url}/json/version"

        try:
            with urlopen(version_url, timeout=5) as response:
                data = json.loads(response.read().decode("utf-8"))
            websocket_url = data.get("webSocketDebuggerUrl")
            return str(websocket_url) if websocket_url else cdp_url
        except Exception:
            return cdp_url

    def _is_raw_script(self, script_path: Path) -> bool:
        return script_path.name.lower() == "test_vllm.py"
