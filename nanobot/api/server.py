"""FastAPI server exposing nanobot chat and session APIs."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from nanobot.api.schemas import (
    ChatRequest,
    ChatResponse,
    SessionDetailResponse,
    SessionSummary,
)
from nanobot.api.services import get_session_detail, list_sessions, run_chat, stream_chat


def create_app() -> FastAPI:
    app = FastAPI(title="nanobot API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/api/chat", response_model=ChatResponse)
    async def chat(payload: ChatRequest) -> ChatResponse:
        reply = await run_chat(payload.message, payload.session_id)
        return ChatResponse(session_id=payload.session_id, reply=reply)

    @app.post("/api/chat/stream")
    async def chat_stream(payload: ChatRequest) -> StreamingResponse:
        return StreamingResponse(
            stream_chat(payload.message, payload.session_id),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    @app.get("/api/sessions", response_model=list[SessionSummary])
    async def sessions() -> list[SessionSummary]:
        return [SessionSummary.model_validate(item) for item in list_sessions()]

    @app.get("/api/sessions/{session_id}", response_model=SessionDetailResponse)
    async def session_detail(session_id: str) -> SessionDetailResponse:
        return SessionDetailResponse.model_validate(get_session_detail(session_id))

    return app


app = create_app()
