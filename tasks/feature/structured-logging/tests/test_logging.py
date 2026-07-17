"""Hidden evaluation tests for structured JSON logging feature."""

import ast
import json
import subprocess
import sys
import os
import textwrap
import pytest


REPO_DIR = os.path.join(os.path.dirname(__file__), "..", "repo")


def run_script(code: str) -> subprocess.CompletedProcess:
    """Run a Python snippet that imports from the processor module."""
    return subprocess.run(
        [sys.executable, "-c", code],
        capture_output=True,
        text=True,
        cwd=REPO_DIR,
    )


def get_log_lines(code: str) -> list[str]:
    """Run code and return non-empty stderr lines (where logging typically goes)."""
    result = run_script(code)
    # Check both stderr and stdout for log output
    output = result.stderr + result.stdout
    return [line for line in output.strip().splitlines() if line.strip()]


class TestNoMorePrint:
    def test_no_print_calls_in_processor(self):
        """Verify no print() calls remain in processor.py."""
        proc_path = os.path.join(REPO_DIR, "src", "processor.py")
        with open(proc_path, "r") as f:
            source = f.read()
        tree = ast.parse(source)
        print_calls = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                func = node.func
                if isinstance(func, ast.Name) and func.id == "print":
                    print_calls.append(node.lineno)
        assert print_calls == [], f"print() calls found on lines: {print_calls}"


class TestJsonFormat:
    def test_log_output_is_valid_json(self):
        """Each log line must be parseable as JSON."""
        code = textwrap.dedent("""\
            from src.processor import process_batch
            records = [{"id": 1, "name": "Alice", "value": 100}]
            process_batch(records)
        """)
        lines = get_log_lines(code)
        assert len(lines) > 0, "Expected log output but got none"
        for line in lines:
            try:
                parsed = json.loads(line)
            except json.JSONDecodeError:
                pytest.fail(f"Log line is not valid JSON: {line!r}")

    def test_log_contains_message_field(self):
        """Each JSON log must have a message field."""
        code = textwrap.dedent("""\
            from src.processor import process_batch
            records = [{"id": 1, "name": "Alice", "value": 100}]
            process_batch(records)
        """)
        lines = get_log_lines(code)
        assert len(lines) > 0
        for line in lines:
            data = json.loads(line)
            assert "message" in data, f"Missing 'message' field in: {data}"


class TestTimestampAndLevel:
    def test_log_contains_timestamp(self):
        """Each JSON log must include a timestamp field."""
        code = textwrap.dedent("""\
            from src.processor import process_batch
            records = [{"id": 1, "name": "Alice", "value": 100}]
            process_batch(records)
        """)
        lines = get_log_lines(code)
        assert len(lines) > 0
        for line in lines:
            data = json.loads(line)
            assert "timestamp" in data, f"Missing 'timestamp' field in: {data}"

    def test_log_contains_level(self):
        """Each JSON log must include a level field."""
        code = textwrap.dedent("""\
            from src.processor import process_batch
            records = [{"id": 1, "name": "Alice", "value": 100}]
            process_batch(records)
        """)
        lines = get_log_lines(code)
        assert len(lines) > 0
        for line in lines:
            data = json.loads(line)
            assert "level" in data, f"Missing 'level' field in: {data}"


class TestLogLevels:
    def test_info_level_logged(self):
        """INFO level messages should appear in output."""
        code = textwrap.dedent("""\
            from src.processor import process_batch
            records = [{"id": 1, "name": "Alice", "value": 100}]
            process_batch(records)
        """)
        lines = get_log_lines(code)
        levels = [json.loads(line).get("level", "").upper() for line in lines]
        assert "INFO" in levels, f"No INFO level found in levels: {levels}"

    def test_warning_level_for_invalid_records(self):
        """Invalid records should produce WARNING level logs."""
        code = textwrap.dedent("""\
            from src.processor import process_batch
            records = [{"id": 1, "name": "Alice"}]  # missing value
            process_batch(records)
        """)
        lines = get_log_lines(code)
        levels = [json.loads(line).get("level", "").upper() for line in lines]
        assert "WARNING" in levels, f"No WARNING level found in levels: {levels}"

    def test_debug_level_for_transforms(self):
        """Transform operations should produce DEBUG level logs."""
        code = textwrap.dedent("""\
            import logging
            logging.getLogger("processor").setLevel(logging.DEBUG)
            from src.processor import transform_record
            transform_record({"id": 1, "name": "Alice", "value": 100})
        """)
        lines = get_log_lines(code)
        levels = [json.loads(line).get("level", "").upper() for line in lines]
        assert "DEBUG" in levels, f"No DEBUG level found in levels: {levels}"
