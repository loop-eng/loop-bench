import re
from typing import Any


class ParseError(Exception):
    """Error raised when parsing fails."""
    pass


def parse_config(text: str) -> dict[str, Any]:
    """Parse a custom config format into a dictionary.

    Uses regex patterns to extract configuration blocks and key-value pairs.
    """
    result: dict[str, Any] = {}

    # Remove comments
    text = re.sub(r'#[^\n]*', '', text)

    # Match top-level blocks: name { ... }
    block_pattern = re.compile(
        r'(\w+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}',
        re.DOTALL
    )

    for match in block_pattern.finditer(text):
        block_name = match.group(1)
        block_content = match.group(2)
        result[block_name] = _parse_block(block_content)

    return result


def _parse_block(content: str) -> dict[str, Any]:
    """Parse the content of a configuration block."""
    result: dict[str, Any] = {}

    # Check for nested blocks first
    nested_pattern = re.compile(
        r'(\w+)\s*\{([^{}]*)\}',
        re.DOTALL
    )

    # Extract nested blocks
    nested_positions: list[tuple[int, int]] = []
    for match in nested_pattern.finditer(content):
        nested_name = match.group(1)
        nested_content = match.group(2)
        result[nested_name] = _parse_block(nested_content)
        nested_positions.append((match.start(), match.end()))

    # Remove nested blocks from content to parse remaining key-value pairs
    remaining = content
    for start, end in reversed(nested_positions):
        remaining = remaining[:start] + remaining[end:]

    # Parse key-value pairs
    # Match: key = "string_value"
    string_pattern = re.compile(r'(\w+)\s*=\s*"([^"]*)"')
    for match in string_pattern.finditer(remaining):
        result[match.group(1)] = match.group(2)

    # Match: key = number
    number_pattern = re.compile(r'(\w+)\s*=\s*(\d+(?:\.\d+)?)')
    for match in number_pattern.finditer(remaining):
        key = match.group(1)
        if key not in result:  # Don't override string matches
            value = match.group(2)
            result[key] = float(value) if '.' in value else int(value)

    # Match: key = true/false
    bool_pattern = re.compile(r'(\w+)\s*=\s*(true|false)')
    for match in bool_pattern.finditer(remaining):
        key = match.group(1)
        if key not in result:
            result[key] = match.group(2) == 'true'

    # Match: key = [array]
    array_pattern = re.compile(r'(\w+)\s*=\s*\[([^\]]*)\]')
    for match in array_pattern.finditer(remaining):
        key = match.group(1)
        if key not in result:
            items_str = match.group(2)
            items = re.findall(r'"([^"]*)"', items_str)
            result[key] = items

    return result


def parse_file(filepath: str) -> dict[str, Any]:
    """Parse a config file from disk."""
    with open(filepath, 'r') as f:
        return parse_config(f.read())
