import pytest
from datetime import datetime, timezone, timedelta
from src.dateutil import parse_timestamp, format_timestamp


class TestParseTimestampTimezones:
    def test_preserves_positive_offset(self):
        result = parse_timestamp("2026-07-01T10:00:00+05:30")
        assert result.tzinfo is not None
        offset = result.utcoffset()
        assert offset == timedelta(hours=5, minutes=30)

    def test_preserves_negative_offset(self):
        result = parse_timestamp("2026-07-01T10:00:00-08:00")
        assert result.tzinfo is not None
        offset = result.utcoffset()
        assert offset == timedelta(hours=-8)

    def test_preserves_utc_z_suffix(self):
        result = parse_timestamp("2026-07-01T10:00:00+00:00")
        assert result.tzinfo is not None
        offset = result.utcoffset()
        assert offset == timedelta(0)

    def test_naive_input_stays_naive(self):
        result = parse_timestamp("2026-07-01T10:00:00")
        assert result.tzinfo is None

    def test_hour_value_not_shifted(self):
        """The hour in the result must match the input, not be converted."""
        result = parse_timestamp("2026-07-01T10:00:00+05:30")
        assert result.hour == 10

    def test_positive_offset_epoch_correct(self):
        """Ensure the timezone-aware datetime converts to the right epoch."""
        result = parse_timestamp("2026-07-01T10:00:00+05:30")
        # 10:00 IST = 04:30 UTC
        utc_equivalent = result.astimezone(timezone.utc)
        assert utc_equivalent.hour == 4
        assert utc_equivalent.minute == 30

    def test_different_offsets_produce_different_epochs(self):
        """Same wall-clock time with different offsets should differ in epoch."""
        ist = parse_timestamp("2026-07-01T10:00:00+05:30")
        pst = parse_timestamp("2026-07-01T10:00:00-08:00")
        assert ist.timestamp() != pst.timestamp()

    def test_format_round_trips_with_timezone(self):
        original = "2026-07-01T10:00:00+05:30"
        dt = parse_timestamp(original)
        formatted = format_timestamp(dt, include_tz=True)
        reparsed = parse_timestamp(formatted)
        assert reparsed == dt
