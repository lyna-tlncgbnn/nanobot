"""FastAPI server exposing nanobot chat and session APIs."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from nanobot.api.schemas import (
    ChatRequest,
    ChatResponse,
    JobCreateRequest,
    JobHistoryItem,
    JobResponse,
    JobUpdateRequest,
    SessionDetailResponse,
    SessionSummary,
)
from nanobot.api.services import (
    create_job,
    delete_session,
    delete_job,
    get_job_detail,
    get_session_detail,
    list_job_history,
    list_jobs,
    list_sessions,
    run_chat,
    set_job_enabled,
    stream_chat,
)


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

    def _gateway_error(exc: RuntimeError) -> HTTPException:
        """把 gateway 不可用或内部转发错误统一映射为 503。"""
        return HTTPException(status_code=503, detail=str(exc))

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

    @app.delete("/api/sessions/{session_id}")
    async def session_delete(session_id: str) -> dict[str, bool]:
        removed = delete_session(session_id)
        if not removed:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"ok": True}

    @app.get("/api/jobs", response_model=list[JobResponse])
    async def jobs(
        include_disabled: bool = Query(True, description="是否包含已禁用任务"),
    ) -> list[JobResponse]:
        try:
            items = list_jobs(include_disabled=include_disabled)
        except RuntimeError as exc:
            raise _gateway_error(exc) from exc
        return [JobResponse.model_validate(item) for item in items]

    @app.get("/api/jobs/history", response_model=list[JobHistoryItem])
    async def job_history(
        job_id: str | None = Query(None, description="按任务 ID 过滤"),
    ) -> list[JobHistoryItem]:
        try:
            items = list_job_history(job_id=job_id)
        except RuntimeError as exc:
            raise _gateway_error(exc) from exc
        return [JobHistoryItem.model_validate(item) for item in items]

    @app.get("/api/jobs/{job_id}", response_model=JobResponse)
    async def job_detail(job_id: str) -> JobResponse:
        try:
            job = get_job_detail(job_id)
        except RuntimeError as exc:
            raise _gateway_error(exc) from exc
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return JobResponse.model_validate(job)

    @app.post("/api/jobs", response_model=JobResponse)
    async def job_create(payload: JobCreateRequest) -> JobResponse:
        try:
            job = create_job(**payload.model_dump())
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise _gateway_error(exc) from exc
        return JobResponse.model_validate(job)

    @app.patch("/api/jobs/{job_id}", response_model=JobResponse)
    async def job_update(job_id: str, payload: JobUpdateRequest) -> JobResponse:
        try:
            job = set_job_enabled(job_id, enabled=payload.enabled)
        except RuntimeError as exc:
            raise _gateway_error(exc) from exc
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return JobResponse.model_validate(job)

    @app.delete("/api/jobs/{job_id}")
    async def job_delete(job_id: str) -> dict[str, bool]:
        try:
            removed = delete_job(job_id)
        except RuntimeError as exc:
            raise _gateway_error(exc) from exc
        if not removed:
            raise HTTPException(status_code=404, detail="Job not found")
        return {"ok": True}

    return app


app = create_app()
