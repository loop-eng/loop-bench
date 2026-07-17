"""Tests for text processing functions."""

import os
import tempfile

import pytest

from src.processor import (
    uppercase,
    lowercase,
    titlecase,
    reverse_lines,
    remove_blank_lines,
    word_count,
    line_count,
    char_count,
    read_file,
    write_file,
    convert_encoding,
    TRANSFORMS,
)


class TestTransforms:
    def test_uppercase(self):
        assert uppercase("hello world") == "HELLO WORLD"

    def test_lowercase(self):
        assert lowercase("HELLO WORLD") == "hello world"

    def test_titlecase(self):
        assert titlecase("hello world") == "Hello World"

    def test_reverse_lines(self):
        text = "line1\nline2\nline3"
        assert reverse_lines(text) == "line3\nline2\nline1"

    def test_remove_blank_lines(self):
        text = "line1\n\nline2\n\n\nline3"
        assert remove_blank_lines(text) == "line1\nline2\nline3"


class TestCounts:
    def test_word_count(self):
        assert word_count("hello world foo bar") == 4

    def test_word_count_empty(self):
        assert word_count("") == 0

    def test_line_count(self):
        assert line_count("a\nb\nc") == 3

    def test_line_count_empty(self):
        assert line_count("") == 0

    def test_char_count(self):
        assert char_count("hello\nworld") == 10

    def test_char_count_empty(self):
        assert char_count("") == 0


class TestFileOps:
    def test_read_write_roundtrip(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("test content")
            path = f.name

        try:
            result = read_file(path)
            assert result == "test content"
        finally:
            os.unlink(path)

    def test_convert_encoding(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt",
                                          delete=False, encoding="utf-8") as f:
            f.write("hello world")
            src = f.name

        dst = src + ".latin1"
        try:
            convert_encoding(src, dst, "utf-8", "latin-1")
            with open(dst, "r", encoding="latin-1") as f:
                assert f.read() == "hello world"
        finally:
            os.unlink(src)
            if os.path.exists(dst):
                os.unlink(dst)


class TestTransformRegistry:
    def test_all_transforms_present(self):
        assert "upper" in TRANSFORMS
        assert "lower" in TRANSFORMS
        assert "title" in TRANSFORMS
        assert "reverse" in TRANSFORMS
        assert "strip-blank" in TRANSFORMS

    def test_transforms_are_callable(self):
        for name, fn in TRANSFORMS.items():
            assert callable(fn), f"{name} is not callable"
