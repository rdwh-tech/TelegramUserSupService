from collections.abc import Iterator, Mapping
from dataclasses import InitVar, dataclass, field
from datetime import UTC, date, datetime, time, timedelta
from types import MappingProxyType
from zoneinfo import ZoneInfo


@dataclass(frozen=True)
class WorkingSchedule:
    """Weekly shifts keyed by ISO weekday (Monday=1, Sunday=7)."""

    timezone: InitVar[str]
    shifts: Mapping[int, tuple[time, time]]
    zone: ZoneInfo = field(init=False, repr=False)

    def __post_init__(self, timezone: str) -> None:
        for day, (opens, closes) in self.shifts.items():
            if not 1 <= day <= 7:
                raise ValueError("shift weekday must be between 1 and 7")
            if opens.tzinfo is not None or closes.tzinfo is not None:
                raise ValueError("shift boundaries must be local times without a timezone")
            if opens >= closes:
                raise ValueError("shift must close after it opens on the same day")

        object.__setattr__(self, "zone", ZoneInfo(timezone))
        object.__setattr__(self, "shifts", MappingProxyType(dict(self.shifts)))


def _as_utc(instant: datetime) -> datetime:
    if instant.utcoffset() is None:
        raise ValueError("datetime must include a timezone")
    return instant.astimezone(UTC)


def _upcoming_shifts(
    schedule: WorkingSchedule, instant: datetime
) -> Iterator[tuple[datetime, datetime]]:
    if not schedule.shifts:
        return

    day: date = instant.astimezone(schedule.zone).date()
    while True:
        shift = schedule.shifts.get(day.isoweekday())
        if shift is not None:
            opens, closes = shift
            start = datetime.combine(day, opens, schedule.zone).astimezone(UTC)
            end = datetime.combine(day, closes, schedule.zone).astimezone(UTC)
            start = max(instant, start)
            if start < end:
                yield start, end
        day += timedelta(days=1)


def next_working_start(
    schedule: WorkingSchedule, instant: datetime
) -> datetime | None:
    """Return the given instant or the next shift's opening in UTC."""
    interval = next(_upcoming_shifts(schedule, _as_utc(instant)), None)
    return interval[0] if interval else None


def working_minutes(
    schedule: WorkingSchedule, start: datetime, end: datetime
) -> float:
    """Count the elapsed minutes that fall within working shifts."""
    start_utc, end_utc = _as_utc(start), _as_utc(end)
    if end_utc <= start_utc:
        return 0.0

    total = timedelta()
    for opens, closes in _upcoming_shifts(schedule, start_utc):
        if opens >= end_utc:
            break
        total += min(closes, end_utc) - opens
        if closes >= end_utc:
            break
    return total.total_seconds() / 60


def add_working_minutes(
    schedule: WorkingSchedule, start: datetime, minutes: float
) -> datetime | None:
    """Return the UTC deadline, or None when there are no working shifts."""
    if minutes < 0:
        raise ValueError("working minutes must be non-negative")

    remaining = timedelta(minutes=minutes)
    for opens, closes in _upcoming_shifts(schedule, _as_utc(start)):
        available = closes - opens
        if remaining <= available:
            return opens + remaining
        remaining -= available
    return None
