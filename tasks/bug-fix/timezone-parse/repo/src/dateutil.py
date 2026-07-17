from datetime import datetime, timezone


def parse_timestamp(s: str) -> datetime:
    """Parse an ISO 8601 timestamp string into a datetime object.

    Supports both naive and timezone-aware ISO 8601 strings.

    Args:
        s: An ISO 8601 formatted timestamp string.

    Returns:
        A datetime object representing the parsed timestamp.
    """
    dt = datetime.fromisoformat(s)
    # Normalize to naive datetime for consistent handling
    return dt.replace(tzinfo=None)


def format_timestamp(dt: datetime, include_tz: bool = True) -> str:
    """Format a datetime object into an ISO 8601 string.

    Args:
        dt: A datetime object to format.
        include_tz: Whether to include timezone info if present.

    Returns:
        An ISO 8601 formatted timestamp string.
    """
    if not include_tz or dt.tzinfo is None:
        return dt.strftime("%Y-%m-%dT%H:%M:%S")
    return dt.isoformat()


def timestamp_to_epoch(dt: datetime) -> float:
    """Convert a datetime to a Unix epoch timestamp.

    Args:
        dt: A datetime object. If naive, assumed to be UTC.

    Returns:
        The Unix epoch timestamp as a float.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.timestamp()
