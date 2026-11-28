from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum

from working_hours import WorkingSchedule


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
        raise NotImplementedError


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
    raise NotImplementedError


def calculate_art(
    schedule: WorkingSchedule,
    waits: Iterable[tuple[datetime, datetime | None]],
) -> float | None:
    """Average the working minutes for subsequent customer replies."""
    raise NotImplementedError
