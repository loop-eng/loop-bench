import pytest
from datetime import datetime
from src.dateutil import parse_timestamp, format_timestamp, timestamp_to_epoch


class TestParseTimestamp:
    def test_parses_basic_iso_format(self):
        result = parse_timestamp("2026-07-01T10:00:00")
        assert result.year == 2026
        assert result.month == 7
        assert result.day == 1
        assert result.hour == 10
        assert result.minute == 0
        assert result.second == 0

    def test_parses_date_only(self):
        result = parse_timestamp("2026-07-01")
        assert result.year == 2026
        assert result.month == 7
        assert result.day == 1

    def test_parses_with_microseconds(self):
        result = parse_timestamp("2026-07-01T10:30:45.123456")
        assert result.microsecond == 123456

    def test_returns_datetime_instance(self):
        result = parse_timestamp("2026-07-01T10:00:00")
        assert isinstance(result, datetime)


class TestFormatTimestamp:
    def test_formats_naive_datetime(self):
        dt = datetime(2026, 7, 1, 10, 0, 0)
        result = format_timestamp(dt)
        assert result == "2026-07-01T10:00:00"

    def test_round_trips_naive_timestamp(self):
        original = "2026-07-01T10:30:45"
        dt = parse_timestamp(original)
        result = format_timestamp(dt)
        assert result == original


class TestTimestampToEpoch:
    def test_converts_naive_datetime(self):
        dt = datetime(2026, 1, 1, 0, 0, 0)
        epoch = timestamp_to_epoch(dt)
        assert isinstance(epoch, float)
        assert epoch > 0
