"""Hidden tests for the CLI tool."""

import os
import sys
import tempfile
import subprocess

import pytest


@pytest.fixture
def sample_file():
    """Create a temporary sample text file."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False,
                                      encoding="utf-8") as f:
        f.write("Hello World\n\nThis is a test file.\nIt has multiple lines.\n")
        path = f.name
    yield path
    os.unlink(path)


@pytest.fixture
def output_file():
    """Create a path for output file."""
    path = tempfile.mktemp(suffix=".txt")
    yield path
    if os.path.exists(path):
        os.unlink(path)


class TestCLIProcess:
    def test_process_uppercase(self, sample_file, output_file):
        from src.cli import main
        sys.argv = ["textproc", "process", sample_file, "--transform", "upper",
                     "--output", output_file]
        main()
        with open(output_file) as f:
            content = f.read()
        assert "HELLO WORLD" in content

    def test_process_lowercase(self, sample_file, output_file):
        from src.cli import main
        sys.argv = ["textproc", "process", sample_file, "--transform", "lower",
                     "--output", output_file]
        main()
        with open(output_file) as f:
            content = f.read()
        assert "hello world" in content

    def test_process_missing_file(self):
        from src.cli import main
        sys.argv = ["textproc", "process", "/nonexistent/file.txt",
                     "--transform", "upper", "--output", "/tmp/out.txt"]
        with pytest.raises(SystemExit) as exc_info:
            main()
        assert exc_info.value.code != 0


class TestCLIStats:
    def test_stats_output(self, sample_file, capsys):
        from src.cli import main
        sys.argv = ["textproc", "stats", sample_file]
        main()
        captured = capsys.readouterr()
        # Should contain word count, line count, and char count
        output = captured.out.lower()
        assert "word" in output or "words" in output
        assert "line" in output or "lines" in output
        assert "char" in output or "character" in output

    def test_stats_missing_file(self):
        from src.cli import main
        sys.argv = ["textproc", "stats", "/nonexistent/file.txt"]
        with pytest.raises(SystemExit) as exc_info:
            main()
        assert exc_info.value.code != 0


class TestCLIConvert:
    def test_convert_encoding(self, sample_file, output_file):
        from src.cli import main
        sys.argv = ["textproc", "convert", sample_file, output_file,
                     "--from-encoding", "utf-8", "--to-encoding", "latin-1"]
        main()
        with open(output_file, encoding="latin-1") as f:
            content = f.read()
        assert "Hello World" in content

    def test_convert_missing_input(self, output_file):
        from src.cli import main
        sys.argv = ["textproc", "convert", "/nonexistent/file.txt",
                     output_file, "--from-encoding", "utf-8",
                     "--to-encoding", "latin-1"]
        with pytest.raises(SystemExit) as exc_info:
            main()
        assert exc_info.value.code != 0


class TestCLIHelp:
    def test_help_shows_subcommands(self, capsys):
        from src.cli import main
        sys.argv = ["textproc", "--help"]
        with pytest.raises(SystemExit) as exc_info:
            main()
        captured = capsys.readouterr()
        assert "process" in captured.out
        assert "stats" in captured.out
        assert "convert" in captured.out

    def test_invalid_subcommand(self):
        from src.cli import main
        sys.argv = ["textproc", "invalid"]
        with pytest.raises(SystemExit) as exc_info:
            main()
        assert exc_info.value.code != 0


class TestCLIUsesArgparse:
    def test_uses_argparse(self):
        import ast
        import importlib.util
        spec = importlib.util.find_spec("src.cli")
        if spec is None or spec.origin is None:
            pytest.skip("cli module not found")
        with open(spec.origin) as f:
            source = f.read()
        assert "argparse" in source, "CLI must use argparse"
        assert "add_subparsers" in source or "subparsers" in source, \
            "CLI must use argparse subcommands"
