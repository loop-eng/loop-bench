"""Data processor that transforms records from a source."""

from typing import Any


def validate_record(record: dict[str, Any]) -> bool:
    """Validate that a record has required fields."""
    required = ["id", "name", "value"]
    for field in required:
        if field not in record:
            print(f"WARN: Record missing required field: {field}")
            return False
    if not isinstance(record["value"], (int, float)):
        print(f"WARN: Record {record['id']} has non-numeric value")
        return False
    return True


def transform_record(record: dict[str, Any]) -> dict[str, Any]:
    """Transform a single record by normalizing values."""
    print(f"DEBUG: Transforming record {record['id']}")
    transformed = {
        "id": record["id"],
        "name": record["name"].strip().title(),
        "value": round(float(record["value"]), 2),
        "processed": True,
    }
    print(f"DEBUG: Record {record['id']} transformed successfully")
    return transformed


def process_batch(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Process a batch of records, skipping invalid ones."""
    print(f"INFO: Starting batch processing of {len(records)} records")
    results = []
    skipped = 0

    for record in records:
        if not validate_record(record):
            print(f"WARN: Skipping invalid record: {record}")
            skipped += 1
            continue
        try:
            transformed = transform_record(record)
            results.append(transformed)
        except Exception as e:
            print(f"ERROR: Failed to transform record {record.get('id', '?')}: {e}")
            skipped += 1

    print(f"INFO: Batch complete. Processed: {len(results)}, Skipped: {skipped}")
    return results


def process_pipeline(
    records: list[dict[str, Any]],
    filter_fn: Any = None,
) -> dict[str, Any]:
    """Run the full processing pipeline on records."""
    print("INFO: Pipeline started")

    if filter_fn is not None:
        print("DEBUG: Applying pre-filter")
        records = [r for r in records if filter_fn(r)]
        print(f"DEBUG: {len(records)} records after filtering")

    results = process_batch(records)

    total_value = sum(r["value"] for r in results)
    print(f"INFO: Pipeline complete. Total value: {total_value}")

    return {
        "records": results,
        "count": len(results),
        "total_value": total_value,
    }
