"""Tests for the data processor core logic."""

import pytest
from src.processor import validate_record, transform_record, process_batch, process_pipeline


class TestValidateRecord:
    def test_valid_record(self):
        record = {"id": 1, "name": "Alice", "value": 100}
        assert validate_record(record) is True

    def test_missing_id(self):
        record = {"name": "Alice", "value": 100}
        assert validate_record(record) is False

    def test_missing_name(self):
        record = {"id": 1, "value": 100}
        assert validate_record(record) is False

    def test_missing_value(self):
        record = {"id": 1, "name": "Alice"}
        assert validate_record(record) is False

    def test_non_numeric_value(self):
        record = {"id": 1, "name": "Alice", "value": "abc"}
        assert validate_record(record) is False

    def test_float_value_valid(self):
        record = {"id": 1, "name": "Alice", "value": 99.5}
        assert validate_record(record) is True


class TestTransformRecord:
    def test_transforms_name_to_title_case(self):
        record = {"id": 1, "name": "alice smith", "value": 100}
        result = transform_record(record)
        assert result["name"] == "Alice Smith"

    def test_rounds_value(self):
        record = {"id": 1, "name": "Bob", "value": 99.999}
        result = transform_record(record)
        assert result["value"] == 100.0

    def test_sets_processed_flag(self):
        record = {"id": 1, "name": "Charlie", "value": 50}
        result = transform_record(record)
        assert result["processed"] is True

    def test_strips_whitespace_from_name(self):
        record = {"id": 1, "name": "  dave  ", "value": 75}
        result = transform_record(record)
        assert result["name"] == "Dave"


class TestProcessBatch:
    def test_processes_valid_records(self):
        records = [
            {"id": 1, "name": "Alice", "value": 100},
            {"id": 2, "name": "Bob", "value": 200},
        ]
        results = process_batch(records)
        assert len(results) == 2

    def test_skips_invalid_records(self):
        records = [
            {"id": 1, "name": "Alice", "value": 100},
            {"id": 2, "name": "Bob"},  # missing value
            {"id": 3, "name": "Charlie", "value": 300},
        ]
        results = process_batch(records)
        assert len(results) == 2

    def test_empty_batch(self):
        assert process_batch([]) == []


class TestProcessPipeline:
    def test_pipeline_returns_summary(self):
        records = [
            {"id": 1, "name": "Alice", "value": 100},
            {"id": 2, "name": "Bob", "value": 200},
        ]
        result = process_pipeline(records)
        assert result["count"] == 2
        assert result["total_value"] == 300.0

    def test_pipeline_with_filter(self):
        records = [
            {"id": 1, "name": "Alice", "value": 100},
            {"id": 2, "name": "Bob", "value": 200},
        ]
        result = process_pipeline(records, filter_fn=lambda r: r["value"] > 150)
        assert result["count"] == 1
        assert result["records"][0]["name"] == "Bob"
