"""Tests for the record serializer - basic types only."""

import json
import pytest
from src.serializer import serialize_record


class TestSerializeBasicTypes:
    def test_string_values(self):
        record = {"name": "Alice", "city": "Portland"}
        result = serialize_record(record)
        parsed = json.loads(result)
        assert parsed == record

    def test_numeric_values(self):
        record = {"count": 42, "price": 19.99, "negative": -5}
        result = serialize_record(record)
        parsed = json.loads(result)
        assert parsed == record

    def test_boolean_and_none(self):
        record = {"active": True, "deleted": False, "metadata": None}
        result = serialize_record(record)
        parsed = json.loads(result)
        assert parsed == record

    def test_nested_dict(self):
        record = {
            "user": {
                "name": "Bob",
                "age": 30,
                "address": {
                    "street": "123 Main St",
                    "city": "Springfield",
                },
            }
        }
        result = serialize_record(record)
        parsed = json.loads(result)
        assert parsed == record

    def test_list_values(self):
        record = {"tags": ["python", "json", "testing"], "scores": [98, 85, 92]}
        result = serialize_record(record)
        parsed = json.loads(result)
        assert parsed == record

    def test_empty_record(self):
        record = {}
        result = serialize_record(record)
        parsed = json.loads(result)
        assert parsed == record

    def test_output_is_valid_json(self):
        record = {"key": "value", "number": 123}
        result = serialize_record(record)
        # Should not raise
        json.loads(result)

    def test_keys_are_sorted(self):
        record = {"zebra": 1, "apple": 2, "mango": 3}
        result = serialize_record(record)
        parsed = json.loads(result)
        keys = list(parsed.keys())
        assert keys == sorted(keys)
