"""Record serializer for converting Python dicts to JSON strings."""

import json
from typing import Any


def _default_handler(obj: Any) -> Any:
    """Fallback handler for non-serializable types.

    NOTE: This silently converts unknown types to their string
    representation, which loses type information and may corrupt data.
    """
    return str(obj)


def serialize_record(record: dict[str, Any]) -> str:
    """Serialize a record dict to a JSON string.

    Supports basic Python types (str, int, float, bool, None, list, dict).
    Other types are converted using their string representation.

    Args:
        record: Dictionary containing the record data.

    Returns:
        JSON string representation of the record.
    """
    return json.dumps(record, default=_default_handler, sort_keys=True)
