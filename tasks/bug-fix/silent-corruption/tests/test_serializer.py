"""Hidden tests for the serializer - tests bytes and datetime handling."""

import json
import base64
from datetime import datetime, timezone, timedelta

import pytest
from src.serializer import serialize_record, deserialize_record


class TestBytesHandling:
    def test_bytes_are_base64_encoded(self):
        data = b"hello world"
        record = {"payload": data}
        result = serialize_record(record)
        parsed = json.loads(result)

        # The serialized form should contain base64, not repr()
        payload = parsed["payload"]
        # Should not be "b'hello world'" (the str() representation)
        assert "b'" not in result
        # Should contain base64 encoded value
        expected_b64 = base64.b64encode(data).decode("ascii")
        assert expected_b64 in result

    def test_bytes_roundtrip(self):
        original = {"payload": b"binary data \x00\x01\x02\xff"}
        serialized = serialize_record(original)
        deserialized = deserialize_record(serialized)
        assert deserialized["payload"] == original["payload"]
        assert isinstance(deserialized["payload"], bytes)

    def test_empty_bytes(self):
        original = {"data": b""}
        serialized = serialize_record(original)
        deserialized = deserialize_record(serialized)
        assert deserialized["data"] == b""


class TestDatetimeHandling:
    def test_datetime_includes_timezone(self):
        dt = datetime(2024, 6, 15, 10, 30, 0, tzinfo=timezone.utc)
        record = {"created_at": dt}
        result = serialize_record(record)

        # Should contain ISO 8601 with timezone
        assert "2024-06-15" in result
        # Should not just be str() output without tz info
        parsed = json.loads(result)

    def test_datetime_roundtrip_utc(self):
        original_dt = datetime(2024, 1, 15, 12, 30, 45, tzinfo=timezone.utc)
        original = {"timestamp": original_dt}
        serialized = serialize_record(original)
        deserialized = deserialize_record(serialized)
        assert deserialized["timestamp"] == original_dt
        assert deserialized["timestamp"].tzinfo is not None

    def test_datetime_roundtrip_with_offset(self):
        tz = timezone(timedelta(hours=-5))
        original_dt = datetime(2024, 3, 20, 8, 0, 0, tzinfo=tz)
        original = {"event_time": original_dt}
        serialized = serialize_record(original)
        deserialized = deserialize_record(serialized)
        assert deserialized["event_time"] == original_dt

    def test_datetime_preserves_microseconds(self):
        dt = datetime(2024, 6, 15, 10, 30, 0, 123456, tzinfo=timezone.utc)
        original = {"precise_time": dt}
        serialized = serialize_record(original)
        deserialized = deserialize_record(serialized)
        assert deserialized["precise_time"].microsecond == 123456


class TestMixedTypes:
    def test_mixed_record_roundtrip(self):
        original = {
            "name": "test_record",
            "count": 42,
            "price": 19.99,
            "active": True,
            "data": b"\x00\x01\x02\x03",
            "created_at": datetime(2024, 6, 15, 10, 30, 0, tzinfo=timezone.utc),
            "tags": ["a", "b", "c"],
        }
        serialized = serialize_record(original)

        # Must be valid JSON
        json.loads(serialized)

        deserialized = deserialize_record(serialized)
        assert deserialized["name"] == "test_record"
        assert deserialized["count"] == 42
        assert deserialized["price"] == 19.99
        assert deserialized["active"] is True
        assert deserialized["data"] == b"\x00\x01\x02\x03"
        assert deserialized["created_at"] == datetime(
            2024, 6, 15, 10, 30, 0, tzinfo=timezone.utc
        )
        assert deserialized["tags"] == ["a", "b", "c"]

    def test_nested_complex_types(self):
        original = {
            "metadata": {
                "binary_hash": b"\xde\xad\xbe\xef",
                "updated": datetime(2024, 12, 25, 0, 0, 0, tzinfo=timezone.utc),
            }
        }
        serialized = serialize_record(original)
        deserialized = deserialize_record(serialized)
        assert deserialized["metadata"]["binary_hash"] == b"\xde\xad\xbe\xef"
        assert deserialized["metadata"]["updated"] == datetime(
            2024, 12, 25, 0, 0, 0, tzinfo=timezone.utc
        )


class TestExistingBehaviorPreserved:
    """Ensure the fix doesn't break existing basic type handling."""

    def test_basic_types_still_work(self):
        record = {"s": "hello", "n": 42, "f": 3.14, "b": True, "none": None}
        serialized = serialize_record(record)
        deserialized = deserialize_record(serialized)
        assert deserialized == record

    def test_serialize_output_is_valid_json(self):
        record = {"key": "value"}
        result = serialize_record(record)
        json.loads(result)  # should not raise
