"""Tests for the core processing logic."""

import os
import tempfile
import pytest
from src.app import process_content, read_input, write_output, run


class TestProcessContent:
    def test_uppercases_text(self):
        assert process_content("hello world") == "HELLO WORLD"

    def test_normalizes_whitespace(self):
        assert process_content("hello   world") == "HELLO WORLD"

    def test_handles_multiple_lines(self):
        result = process_content("line one\nline two")
        assert result == "LINE ONE\nLINE TWO"

    def test_strips_leading_trailing_whitespace(self):
        result = process_content("  hello  \n  world  ")
        assert result == "HELLO\nWORLD"

    def test_empty_input(self):
        assert process_content("") == ""


class TestReadInput:
    def test_reads_file_content(self, tmp_path):
        f = tmp_path / "input.txt"
        f.write_text("test content")
        assert read_input(str(f)) == "test content"

    def test_raises_on_missing_file(self):
        with pytest.raises(FileNotFoundError):
            read_input("/nonexistent/path.txt")


class TestWriteOutput:
    def test_writes_content(self, tmp_path):
        f = tmp_path / "output.txt"
        write_output(str(f), "result")
        assert f.read_text() == "result"

    def test_creates_directories(self, tmp_path):
        f = tmp_path / "sub" / "dir" / "output.txt"
        write_output(str(f), "result")
        assert f.read_text() == "result"


class TestRun:
    def test_full_pipeline(self, tmp_path):
        inp = tmp_path / "in.txt"
        out = tmp_path / "out.txt"
        inp.write_text("hello world")
        run(str(inp), str(out))
        assert out.read_text() == "HELLO WORLD"
