"""Record serializer for converting Python dicts to JSON strings."""

import base64
from datetime import datetime
import json
from typing import Any


def _default_handler(obj: Any) -> Any:
    """Fallback handler for non-serializable types.

    NOTE: This silently converts unknown types to their string
    representation, which loses type information and may corrupt data.
    """
    if isinstance(obj, bytes):
        return {"__type__": "bytes", "value": base64.b64encode(obj).decode("ascii")}
    if isinstance(obj, datetime):
        return {"__type__": "datetime", "value": obj.isoformat()}
    raise TypeError(
        f"Object of type {type(obj).__name__} is not JSON serializable"
    )


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


def _decode_typed_values(obj: Any) -> Any:
    """Recursively decode type-wrapped values in parsed JSON."""
    if isinstance(obj, dict):
        if "__type__" in obj and "value" in obj:
            type_tag = obj["__type__"]
            if type_tag == "bytes":
                return base64.b64decode(obj["value"])
            if type_tag == "datetime":
                return datetime.fromisoformat(obj["value"])
        return {k: _decode_typed_values(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_decode_typed_values(item) for item in obj]
    return obj


def deserialize_record(json_str: str) -> dict[str, Any]:
    """Deserialize a JSON string back to a record dict.

    Reverses serialize_record, restoring bytes and datetime objects
    from their type-tagged representations.

    Args:
        json_str: JSON string produced by serialize_record.

    Returns:
        Dictionary with original Python types restored.
    """
    parsed = json.loads(json_str)
    return _decode_typed_values(parsed)
