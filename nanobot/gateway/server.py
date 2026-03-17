"""Gateway-local HTTP API for managing cron jobs in the running gateway process."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query

from nanobot.api.schemas import JobCreateRequest, JobHistoryItem, JobResponse, JobUpdateRequest
from nanobot.cron.service import CronService
from nanobot.cron.types import CronJob, CronSchedule


def _format_timestamp(ms: int | None) -> str | None:
    """把毫秒时间戳转换为 ISO 字符串，便于接口直接返回给前端。"""
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
    """把 CronJob 转成前端可消费的响应结构。"""
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


def create_gateway_app(cron_service: CronService, history_path: Path) -> FastAPI:
    """创建运行在 gateway 进程内的 jobs 管理接口。"""
    app = FastAPI(title="nanobot Gateway API", version="0.1.0")

    @app.get("/internal/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/internal/jobs", response_model=list[JobResponse])
    async def jobs(
        include_disabled: bool = Query(True, description="是否包含已禁用任务"),
    ) -> list[JobResponse]:
        items = [
            JobResponse.model_validate(_serialize_job(job))
            for job in cron_service.list_jobs(include_disabled=include_disabled)
        ]
        return items

    @app.get("/internal/jobs/history", response_model=list[JobHistoryItem])
    async def job_history(
        job_id: str | None = Query(None, description="按任务 ID 过滤"),
    ) -> list[JobHistoryItem]:
        items = _read_job_history(history_path)
        if job_id:
            items = [item for item in items if item.get("job_id") == job_id]
        return [JobHistoryItem.model_validate(item) for item in items]

    @app.get("/internal/jobs/{job_id}", response_model=JobResponse)
    async def job_detail(job_id: str) -> JobResponse:
        for job in cron_service.list_jobs(include_disabled=True):
            if job.id == job_id:
                return JobResponse.model_validate(_serialize_job(job))
        raise HTTPException(status_code=404, detail="Job not found")

    @app.post("/internal/jobs", response_model=JobResponse)
    async def job_create(payload: JobCreateRequest) -> JobResponse:
        data = payload.model_dump()
        tz = data.get("tz")
        cron_expr = data.get("cron_expr")
        at = data.get("at")
        every_seconds = data.get("every_seconds")

        if tz and not cron_expr:
            raise HTTPException(status_code=400, detail="tz can only be used with cron_expr")

        if every_seconds:
            schedule = CronSchedule(kind="every", every_ms=every_seconds * 1000)
            delete_after_run = False
        elif cron_expr:
            schedule = CronSchedule(kind="cron", expr=cron_expr, tz=tz)
            delete_after_run = False
        elif at:
            dt = datetime.fromisoformat(at)
            schedule = CronSchedule(kind="at", at_ms=int(dt.timestamp() * 1000))
            delete_after_run = True
        else:
            raise HTTPException(status_code=400, detail="Must specify every_seconds, cron_expr, or at")

        try:
            job = cron_service.add_job(
                name=data["name"],
                schedule=schedule,
                message=data["message"],
                deliver=data.get("deliver", True),
                channel=data.get("channel"),
                to=data.get("to"),
                delete_after_run=delete_after_run,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        return JobResponse.model_validate(_serialize_job(job))

    @app.patch("/internal/jobs/{job_id}", response_model=JobResponse)
    async def job_update(job_id: str, payload: JobUpdateRequest) -> JobResponse:
        job = cron_service.enable_job(job_id, enabled=payload.enabled)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return JobResponse.model_validate(_serialize_job(job))

    @app.delete("/internal/jobs/{job_id}")
    async def job_delete(job_id: str) -> dict[str, bool]:
        removed = cron_service.remove_job(job_id)
        if not removed:
            raise HTTPException(status_code=404, detail="Job not found")
        return {"ok": True}

    return app
