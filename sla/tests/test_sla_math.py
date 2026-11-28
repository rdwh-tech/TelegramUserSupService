from datetime import UTC, datetime, time

import pytest

from sla_math import SLAStatus, calculate_art, calculate_sla
from working_hours import WorkingSchedule


def utc(day: int, hour: int, minute: int = 0, second: int = 0) -> datetime:
    return datetime(2026, 11, day, hour, minute, second, tzinfo=UTC)


@pytest.fixture
def weekdays():
    return WorkingSchedule(
        timezone="Europe/Moscow",
        shifts={day: (time(9), time(18)) for day in range(1, 6)},
    )


def ticket_sla(schedule, *, start=None, now, **changes):
    start = start or utc(27, 6)
    arguments = {
        "now": now,
        "frt_started_at": start,
        "ttr_started_at": start,
        "frt_limit_minutes": 10,
        "ttr_limit_minutes": 120,
        **changes,
    }
    return calculate_sla(schedule, **arguments)


@pytest.mark.parametrize(
    ("now", "expected_status", "breached"),
    [
        (utc(27, 6, 6, 59), SLAStatus.OK, False),
        (utc(27, 6, 7), SLAStatus.WARNING, False),
        (utc(27, 6, 10), SLAStatus.WARNING, False),
        (utc(27, 6, 10, 1), SLAStatus.BREACHED, True),
    ],
)
def test_open_ticket_crosses_frt_thresholds(weekdays, now, expected_status, breached):
    result = ticket_sla(weekdays, now=now)

    assert result.status == expected_status
    assert result.frt.actual_minutes is None
    assert result.frt.breached is breached
    assert result.is_sla_violated is breached


def test_different_timer_starts_produce_different_deadlines(weekdays):
    result = ticket_sla(
        weekdays,
        now=utc(27, 7),
        frt_started_at=utc(27, 7),
        frt_limit_minutes=5,
        ttr_limit_minutes=60,
    )

    assert result.frt.deadline == utc(27, 7, 5)
    assert result.ttr.deadline == utc(27, 7)
    assert result.status == SLAStatus.WARNING


def test_deadlines_and_remaining_minutes_skip_the_weekend(weekdays):
    result = ticket_sla(
        weekdays,
        start=utc(27, 14, 55),
        now=utc(28, 12),
        frt_limit_minutes=15,
    )

    assert result.frt.deadline == utc(30, 6, 10)
    assert result.frt.remaining_minutes == 10
    assert result.ttr.deadline == utc(30, 7, 55)
    assert result.ttr.remaining_minutes == 115


def test_exact_end_of_shift_deadline_does_not_breach_over_weekend(weekdays):
    result = ticket_sla(weekdays, start=utc(27, 14, 50), now=utc(29, 12))

    assert result.frt.deadline == utc(27, 15)
    assert result.frt.remaining_minutes == 0
    assert result.status == SLAStatus.WARNING
    assert result.is_sla_violated is False


@pytest.mark.parametrize(
    ("response_minute", "expected_status", "breached"),
    [(9, SLAStatus.OK, False), (11, SLAStatus.BREACHED, True)],
)
def test_completed_frt_stays_fixed_after_first_response(
    weekdays, response_minute, expected_status, breached
):
    result = ticket_sla(
        weekdays, now=utc(27, 7), first_response_at=utc(27, 6, response_minute)
    )

    assert result.frt.actual_minutes == response_minute
    assert result.frt.remaining_minutes == 0
    assert result.frt.breached is breached
    assert result.status == expected_status


@pytest.mark.parametrize(
    ("closed_at", "expected_ttr", "expected_status"),
    [(utc(27, 8), 120, SLAStatus.OK), (utc(27, 8, 1), 121, SLAStatus.BREACHED)],
)
def test_closed_ticket_uses_actual_resolution_time(
    weekdays, closed_at, expected_ttr, expected_status
):
    result = ticket_sla(
        weekdays, now=utc(30, 13), first_response_at=utc(27, 6, 9), closed_at=closed_at
    )

    assert result.ttr.actual_minutes == expected_ttr
    assert result.ttr.remaining_minutes == 0
    assert result.status == expected_status


def test_empty_schedule_has_no_deadlines_and_does_not_count_time():
    result = ticket_sla(WorkingSchedule("Europe/Moscow", {}), now=utc(30, 10))

    assert result.frt.deadline is None
    assert result.ttr.deadline is None
    assert result.frt.remaining_minutes == 10
    assert result.ttr.remaining_minutes == 120
    assert result.status == SLAStatus.OK


def test_nonpositive_limit_is_rejected(weekdays):
    with pytest.raises(ValueError, match="positive"):
        ticket_sla(weekdays, now=utc(27, 6), ttr_limit_minutes=0)


def test_art_averages_completed_waits_in_working_minutes(weekdays):
    waits = [
        (utc(27, 14, 55), utc(30, 6, 5)),
        (utc(30, 6, 10), utc(30, 6, 30)),
        (utc(30, 6, 35), None),
    ]

    assert calculate_art(weekdays, iter(waits)) == 15


@pytest.mark.parametrize("waits", [[], [(utc(27, 7), None)]])
def test_art_is_absent_without_completed_waits(weekdays, waits):
    assert calculate_art(weekdays, waits) is None


def test_open_ticket_ttr_can_breach_after_frt_has_finished(weekdays):
    result = ticket_sla(
        weekdays, now=utc(27, 8, 1), first_response_at=utc(27, 6, 1)
    )

    assert not result.frt.breached
    assert result.ttr.breached
    assert result.ttr.actual_minutes is None
    assert result.status == SLAStatus.BREACHED


def test_closed_ticket_retains_frt_breach_when_ttr_is_on_time(weekdays):
    result = ticket_sla(
        weekdays,
        now=utc(30, 10),
        first_response_at=utc(27, 6, 11),
        closed_at=utc(27, 7),
    )

    assert result.frt.breached
    assert not result.ttr.breached
    assert result.is_sla_violated
    assert result.status == SLAStatus.BREACHED


def test_fractional_warning_boundary(weekdays):
    result = ticket_sla(weekdays, now=utc(27, 6, 10, 30), frt_limit_minutes=15)

    assert result.status == SLAStatus.WARNING
    assert result.frt.remaining_minutes == 4.5
