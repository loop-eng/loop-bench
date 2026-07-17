"""Text processing functions for transforming, analyzing, and converting text."""

import os
from typing import TextIO


def uppercase(text: str) -> str:
    """Convert text to uppercase."""
    return text.upper()


def lowercase(text: str) -> str:
    """Convert text to lowercase."""
    return text.lower()


def titlecase(text: str) -> str:
    """Convert text to title case."""
    return text.title()


def reverse_lines(text: str) -> str:
    """Reverse the order of lines in text."""
    lines = text.splitlines()
    return "\n".join(reversed(lines))


def remove_blank_lines(text: str) -> str:
    """Remove blank lines from text."""
    lines = text.splitlines()
    return "\n".join(line for line in lines if line.strip())


def word_count(text: str) -> int:
    """Count the number of words in text."""
    return len(text.split())


def line_count(text: str) -> int:
    """Count the number of lines in text."""
    if not text:
        return 0
    return len(text.splitlines())


def char_count(text: str) -> int:
    """Count the number of characters in text (excluding newlines)."""
    return len(text.replace("\n", "").replace("\r", ""))


def read_file(path: str, encoding: str = "utf-8") -> str:
    """Read text from a file with given encoding."""
    with open(path, "r", encoding=encoding) as f:
        return f.read()


def write_file(path: str, text: str, encoding: str = "utf-8") -> None:
    """Write text to a file with given encoding."""
    with open(path, "w", encoding=encoding) as f:
        f.write(text)


def convert_encoding(input_path: str, output_path: str,
                     from_encoding: str = "utf-8",
                     to_encoding: str = "latin-1") -> None:
    """Convert a file from one encoding to another."""
    text = read_file(input_path, encoding=from_encoding)
    write_file(output_path, text, encoding=to_encoding)


TRANSFORMS = {
    "upper": uppercase,
    "lower": lowercase,
    "title": titlecase,
    "reverse": reverse_lines,
    "strip-blank": remove_blank_lines,
}
