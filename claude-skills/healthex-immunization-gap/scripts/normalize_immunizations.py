#!/usr/bin/env python3
"""Normalize parsed HealthEx immunization rows into a canonical structure."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple

REFERENCE_DIR = Path(__file__).resolve().parent.parent / "references"
CVX_CODES_PATH = REFERENCE_DIR / "cvx_codes.json"


def load_cvx_mappings() -> Dict[str, Dict[str, str]]:
    payload = json.loads(CVX_CODES_PATH.read_text())
    mappings: Dict[str, Dict[str, str]] = {}
    for item in payload.get("codes", []):
        cvx = str(item["cvx"]).zfill(2) if int(item["cvx"]) < 100 else str(item["cvx"])
        mappings[cvx] = {
            "display_name": item["display_name"],
            "antigen_group": item["antigen_group"],
        }
    return mappings


def parse_mixed_date(value: str) -> Optional[str]:
    value = (value or "").strip()
    if not value:
        return None

    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S.%fZ"):
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            continue
    return value


def canonical_cvx(value: str) -> Optional[str]:
    value = (value or "").strip()
    if not value:
        return None
    digits = re.sub(r"\D", "", value)
    if not digits:
        return value
    return digits.zfill(2) if len(digits) < 3 else digits


def _dedupe_key(record: Dict[str, object]) -> Tuple[Optional[str], Optional[str]]:
    return record.get("occurrence_date"), record.get("cvx")


def normalize_immunization_rows(rows: List[Dict[str, str]]) -> Dict[str, object]:
    cvx_mappings = load_cvx_mappings()
    normalized_rows: List[Dict[str, object]] = []
    duplicates: List[Dict[str, object]] = []
    skipped: List[Dict[str, object]] = []
    seen_by_key: Dict[Tuple[Optional[str], Optional[str]], Dict[str, object]] = {}

    for row in rows:
        occurrence_date = parse_mixed_date(row.get("OccurrenceDate", "")) or parse_mixed_date(row.get("Date", ""))
        cvx = canonical_cvx(row.get("CVX", ""))
        status = (row.get("Status", "") or "").strip().lower()
        primary_source = row.get("PrimarySource") or "No"
        mapping = cvx_mappings.get(cvx or "")

        if not occurrence_date:
            skipped.append(
                {
                    "reason": "missing_occurrence_date",
                    "display_name": row.get("Immunization") or None,
                    "cvx": cvx,
                    "raw_row": row,
                }
            )
            continue

        normalized = {
            "occurrence_date": occurrence_date,
            "recorded_date": parse_mixed_date(row.get("Date", "")),
            "occurrence_date_source": row.get("OccurDateSource") or None,
            "cvx": cvx,
            "antigen_group": mapping["antigen_group"] if mapping else "unclassified",
            "display_name": row.get("Immunization") or (mapping["display_name"] if mapping else None),
            "normalized_display_name": mapping["display_name"] if mapping else None,
            "status": status or None,
            "status_reason": row.get("StatusReason") or None,
            "primary_source": primary_source,
            "report_origin": row.get("ReportOrigin") or None,
            "lot_number": row.get("LotNumber") or None,
            "expiration_date": parse_mixed_date(row.get("ExpirationDate", "")),
            "dose": row.get("Dose") or None,
            "route": row.get("Route") or None,
            "site": row.get("Site") or None,
            "manufacturer": row.get("Manufacturer") or None,
            "location": row.get("Location") or None,
            "ndc": row.get("NDC") or None,
            "snomed": row.get("SNOMED") or None,
            "encounter_id": row.get("EncounterId") or None,
            "last_updated": parse_mixed_date(row.get("LastUpdated", "")),
            "quality_flags": [],
            "raw_row": row,
        }

        if not cvx:
            normalized["quality_flags"].append("missing_cvx")
        elif not mapping:
            normalized["quality_flags"].append("unsupported_cvx")
        if row.get("PrimarySource") in ("", None):
            normalized["quality_flags"].append("missing_primary_source_assumed_external")
        if normalized["primary_source"] == "No":
            normalized["quality_flags"].append("external_record")
        if normalized["expiration_date"] and occurrence_date and normalized["expiration_date"] < occurrence_date:
            normalized["quality_flags"].append("expiration_before_occurrence")
        if status and status not in {"completed"}:
            normalized["quality_flags"].append(f"status_{status}")

        dedupe_key = _dedupe_key(normalized)
        if all(dedupe_key):
            existing = seen_by_key.get(dedupe_key)
            if existing:
                # Prefer the primary-source record when choosing the retained row.
                keep_new = existing.get("primary_source") != "Yes" and normalized.get("primary_source") == "Yes"
                duplicate_record = dict(existing if keep_new else normalized)
                duplicate_record["quality_flags"] = list(duplicate_record["quality_flags"]) + ["duplicate_occurrence_cvx"]
                duplicates.append(duplicate_record)
                if keep_new:
                    normalized_rows.remove(existing)
                    normalized_rows.append(normalized)
                    seen_by_key[dedupe_key] = normalized
                continue

            seen_by_key[dedupe_key] = normalized

        normalized_rows.append(normalized)

    normalized_rows.sort(key=lambda row: (row.get("occurrence_date") or "", row.get("cvx") or ""), reverse=True)

    return {
        "records": normalized_rows,
        "duplicates": duplicates,
        "skipped": skipped,
        "summary": {
            "total_records": len(normalized_rows),
            "duplicate_records": len(duplicates),
            "skipped_records": len(skipped),
            "external_records": sum(1 for row in normalized_rows if "external_record" in row["quality_flags"]),
            "missing_cvx_records": sum(1 for row in normalized_rows if "missing_cvx" in row["quality_flags"]),
            "unsupported_cvx_records": sum(1 for row in normalized_rows if "unsupported_cvx" in row["quality_flags"]),
        },
    }


def main() -> int:
    payload = json.load(sys.stdin)
    rows = payload.get("rows", payload)
    json.dump(normalize_immunization_rows(rows), sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
