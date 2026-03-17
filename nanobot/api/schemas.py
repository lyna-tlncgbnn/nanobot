"""Pydantic schemas for the nanobot HTTP API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Single chat request from the frontend."""

    session_id: str = Field(default="web:default")
    message: str


class ChatResponse(BaseModel):
    """Single chat response returned to the frontend."""

    session_id: str
    reply: str


class SessionSummary(BaseModel):
    """Lightweight session summary for list views."""

    id: str
    created_at: str | None = None
    updated_at: str | None = None
    path: str | None = None
    message_count: int = 0


class SessionMessage(BaseModel):
    """Serializable session message."""

    id: str
    role: str
    content: str = ""
    timestamp: str | None = None
    name: str | None = None
    tool_call_id: str | None = None
    tool_calls: list[dict] | None = None


class SessionDetailResponse(BaseModel):
    """Full session payload used by the chat surface."""

    session_id: str
    messages: list[SessionMessage]


class ChatStreamEvent(BaseModel):
    """SSE event emitted to the Web frontend during one chat turn."""

    type: str
    session_id: str
    message: SessionMessage | None = None
    reply: str | None = None
    error: str | None = None


class JobSchedule(BaseModel):
    """任务调度信息。"""

    kind: str
    at_ms: int | None = None
    every_ms: int | None = None
    expr: str | None = None
    tz: str | None = None
    at: str | None = None


class JobPayload(BaseModel):
    """任务执行载荷。"""

    kind: str
    message: str
    deliver: bool = False
    channel: str | None = None
    to: str | None = None


class JobState(BaseModel):
    """任务运行状态。"""

    next_run_at_ms: int | None = None
    next_run_at: str | None = None
    last_run_at_ms: int | None = None
    last_run_at: str | None = None
    last_status: str | None = None
    last_error: str | None = None


class JobResponse(BaseModel):
    """任务详情返回结构。"""

    id: str
    name: str
    enabled: bool
    schedule: JobSchedule
    payload: JobPayload
    state: JobState
    created_at_ms: int
    created_at: str | None = None
    updated_at_ms: int
    updated_at: str | None = None
    delete_after_run: bool = False


class JobCreateRequest(BaseModel):
    """创建任务请求。"""

    name: str
    message: str
    every_seconds: int | None = None
    cron_expr: str | None = None
    tz: str | None = None
    at: str | None = None
    deliver: bool = True
    channel: str | None = None
    to: str | None = None


class JobUpdateRequest(BaseModel):
    """任务状态更新请求。"""

    enabled: bool


class JobHistoryItem(BaseModel):
    """任务执行历史记录。"""

    run_id: str
    job_id: str
    job_name: str
    message: str
    channel: str | None = None
    target: str | None = None
    schedule_kind: str
    scheduled_for_ms: int | None = None
    scheduled_for: str | None = None
    executed_at_ms: int
    executed_at: str
    status: str
    response: str | None = None
    response_preview: str | None = None
    error: str | None = None
    cron_session_key: str | None = None
