from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from statistics import fmean

from working_hours import WorkingSchedule, add_working_minutes, working_minutes


class SLAStatus(StrEnum):
    OK = "ok"
    WARNING = "warning"
    BREACHED = "breached"


@dataclass(frozen=True)
class TimerResult:
    deadline: datetime | None
    actual_minutes: float | None
    remaining_minutes: float
    breached: bool


@dataclass(frozen=True)
class SLAResult:
    frt: TimerResult
    ttr: TimerResult
    status: SLAStatus

    @property
    def is_sla_violated(self) -> bool:
        return self.frt.breached or self.ttr.breached


def _calculate_timer(
    schedule: WorkingSchedule,
    *,
    started_at: datetime,
    limit_minutes: int,
    as_of: datetime,
    completed_at: datetime | None,
    ticket_closed: bool,
) -> tuple[TimerResult, bool]:
    if limit_minutes <= 0:
        raise ValueError("SLA limit must be positive")

    active = completed_at is None and not ticket_closed
    elapsed = working_minutes(schedule, started_at, completed_at or as_of)
    result = TimerResult(
        deadline=add_working_minutes(schedule, started_at, limit_minutes),
        actual_minutes=elapsed if completed_at is not None else None,
        remaining_minutes=max(0.0, limit_minutes - elapsed) if active else 0.0,
        breached=elapsed > limit_minutes,
    )
    warning = active and elapsed >= limit_minutes * 7 / 10
    return result, warning


def calculate_sla(
    schedule: WorkingSchedule,
    *,
    now: datetime,
    frt_started_at: datetime,
    ttr_started_at: datetime,
    frt_limit_minutes: int,
    ttr_limit_minutes: int,
    first_response_at: datetime | None = None,
    closed_at: datetime | None = None,
) -> SLAResult:
    """Calculate the first-response and resolution timers for a ticket."""
    as_of = closed_at or now
    frt, frt_warning = _calculate_timer(
        schedule,
        started_at=frt_started_at,
        limit_minutes=frt_limit_minutes,
        as_of=as_of,
        completed_at=first_response_at,
        ticket_closed=closed_at is not None,
    )
    ttr, ttr_warning = _calculate_timer(
        schedule,
        started_at=ttr_started_at,
        limit_minutes=ttr_limit_minutes,
        as_of=as_of,
        completed_at=closed_at,
        ticket_closed=closed_at is not None,
    )

    if frt.breached or ttr.breached:
        status = SLAStatus.BREACHED
    elif frt_warning or ttr_warning:
        status = SLAStatus.WARNING
    else:
        status = SLAStatus.OK

    return SLAResult(frt=frt, ttr=ttr, status=status)


def calculate_art(
    schedule: WorkingSchedule,
    waits: Iterable[tuple[datetime, datetime | None]],
) -> float | None:
    """Average the working minutes for subsequent customer replies."""
    durations = [
        working_minutes(schedule, sent_at, answered_at)
        for sent_at, answered_at in waits
        if answered_at is not None
    ]
    return fmean(durations) if durations else None
