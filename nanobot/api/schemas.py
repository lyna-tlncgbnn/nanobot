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
