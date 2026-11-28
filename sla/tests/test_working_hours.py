from datetime import UTC, datetime, time
from zoneinfo import ZoneInfo

import pytest

from working_hours import (
    WorkingSchedule,
    add_working_minutes,
    next_working_start,
    working_minutes,
)


def utc(day: int, hour: int, minute: int = 0) -> datetime:
    return datetime(2026, 11, day, hour, minute, tzinfo=UTC)


@pytest.fixture
def weekdays() -> WorkingSchedule:
    return WorkingSchedule(
        timezone="Europe/Moscow",
        shifts={day: (time(9), time(18)) for day in range(1, 6)},
    )


@pytest.mark.parametrize(
    ("start", "expected"),
    [
        (utc(27, 5), utc(27, 6)),
        (utc(27, 6), utc(27, 6)),
        (utc(27, 14, 55), utc(27, 14, 55)),
        (utc(27, 15), utc(30, 6)),
        (utc(28, 10), utc(30, 6)),
    ],
)
def test_next_working_start(weekdays, start, expected):
    assert next_working_start(weekdays, start) == expected


@pytest.mark.parametrize(
    ("start", "end", "expected"),
    [
        (utc(27, 5), utc(27, 7), 60),
        (utc(26, 14, 55), utc(27, 6, 10), 15),
        (utc(27, 14, 55), utc(30, 6, 10), 15),
        (utc(27, 6), utc(30, 15), 1080),
        (utc(28, 6), utc(29, 15), 0),
        (utc(27, 15), utc(27, 15), 0),
    ],
)
def test_working_minutes_counts_only_shift_overlaps(weekdays, start, end, expected):
    assert working_minutes(weekdays, start, end) == expected


@pytest.mark.parametrize(
    ("start", "minutes", "expected"),
    [
        (utc(27, 5), 15, utc(27, 6, 15)),
        (utc(27, 14, 55), 5, utc(27, 15)),
        (utc(27, 14, 55), 15, utc(30, 6, 10)),
        (utc(28, 10), 0, utc(30, 6)),
        (utc(27, 6), 0.5, utc(27, 6).replace(second=30)),
    ],
)
def test_add_working_minutes(weekdays, start, minutes, expected):
    assert add_working_minutes(weekdays, start, minutes) == expected


def test_same_local_shift_starts_at_different_utc_times(weekdays):
    tokyo_schedule = WorkingSchedule("Asia/Tokyo", weekdays.shifts)
    start = utc(27, 0)

    assert next_working_start(weekdays, start) == utc(27, 6)
    assert next_working_start(tokyo_schedule, start) == utc(27, 0)


def test_shift_spanning_daylight_saving_change_uses_elapsed_time():
    berlin = ZoneInfo("Europe/Berlin")
    schedule = WorkingSchedule("Europe/Berlin", {7: (time(1), time(5))})
    start = datetime(2026, 3, 29, 1, tzinfo=berlin)
    end = datetime(2026, 3, 29, 5, tzinfo=berlin)

    assert working_minutes(schedule, start, end) == 180
    assert add_working_minutes(schedule, start, 180) == end


def test_empty_schedule_has_no_next_shift_or_deadline():
    schedule = WorkingSchedule("Europe/Moscow", {})
    start = utc(27, 6)

    assert next_working_start(schedule, start) is None
    assert add_working_minutes(schedule, start, 15) is None
    assert working_minutes(schedule, start, utc(30, 15)) == 0


@pytest.mark.parametrize(
    ("day", "start", "end"),
    [(0, time(9), time(18)), (8, time(9), time(18)), (1, time(18), time(9))],
)
def test_invalid_shift_is_rejected(day, start, end):
    with pytest.raises(ValueError):
        WorkingSchedule("Europe/Moscow", {day: (start, end)})


def test_naive_datetime_is_rejected(weekdays):
    with pytest.raises(ValueError, match="timezone"):
        next_working_start(weekdays, datetime(2026, 11, 27, 9))


def test_negative_duration_is_rejected(weekdays):
    with pytest.raises(ValueError, match="non-negative"):
        add_working_minutes(weekdays, utc(27, 6), -1)
