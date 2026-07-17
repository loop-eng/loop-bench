"""File processor application with hardcoded configuration."""

import os
import sys


# Hardcoded configuration
INPUT_FILE = "data/input.txt"
OUTPUT_FILE = "data/output.txt"
VERBOSE = False


def read_input(filepath: str) -> str:
    """Read content from the input file."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Input file not found: {filepath}")
    with open(filepath, "r") as f:
        return f.read()


def process_content(content: str) -> str:
    """Process the content by normalizing whitespace and uppercasing."""
    lines = content.strip().splitlines()
    processed = []
    for line in lines:
        cleaned = " ".join(line.split())
        processed.append(cleaned.upper())
    return "\n".join(processed)


def write_output(filepath: str, content: str) -> None:
    """Write processed content to the output file."""
    os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
    with open(filepath, "w") as f:
        f.write(content)


def run(input_path: str, output_path: str, verbose: bool = False) -> None:
    """Run the file processing pipeline."""
    if verbose:
        print(f"Reading from: {input_path}")

    content = read_input(input_path)

    if verbose:
        print(f"Processing {len(content)} characters")

    result = process_content(content)

    if verbose:
        print(f"Writing to: {output_path}")

    write_output(output_path, result)

    if verbose:
        print("Done.")


def main() -> None:
    """Main entry point using hardcoded paths."""
    run(INPUT_FILE, OUTPUT_FILE, VERBOSE)


if __name__ == "__main__":
    main()
