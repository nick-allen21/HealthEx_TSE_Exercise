#!/usr/bin/env python3
"""Compare normalized immunization data against bundled schedule snapshots."""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path
from typing import Dict, List, Optional


REFERENCE_DIR = Path(__file__).resolve().parent.parent / "references"
SCHEDULE_PATHS = {
    "cdc_adult": REFERENCE_DIR / "cdc_adult_schedule.json",
    "cdc_child": REFERENCE_DIR / "cdc_child_schedule.json",
    "ecdc": REFERENCE_DIR / "ecdc_schedule.json",
}


def _parse_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    return datetime.strptime(value, "%Y-%m-%d").date()


def _compute_age_years(dob: Optional[str], today: date) -> Optional[int]:
    dob_date = _parse_date(dob)
    if not dob_date:
        return None
    years = today.year - dob_date.year
    if (today.month, today.day) < (dob_date.month, dob_date.day):
        years -= 1
    return years


def _load_schedule(source_key: str) -> Dict[str, object]:
    return json.loads(SCHEDULE_PATHS[source_key].read_text())


def _status_for_logic(logic: Dict[str, object], records: List[Dict[str, object]], today: date, has_missing_history: bool, immune_by_lab: bool) -> Dict[str, str]:
    logic_type = logic.get("type")
    count = len(records)
    latest = _parse_date(records[0]["occurrence_date"]) if records else None

    if immune_by_lab and logic_type in {"at_least_one", "min_dose_count"}:
        return {
            "status": "likely current",
            "reason": "supporting lab evidence suggests immunity even if vaccine history is incomplete",
        }

    if logic_type == "annual":
        interval_years = int(logic.get("interval_years", 1))
        if latest and (today - latest).days <= 365 * interval_years:
            return {"status": "likely current", "reason": "a recent dose appears within the expected annual window"}
        return {
            "status": "possibly due pending missing history" if has_missing_history else "likely due",
            "reason": "no recent dose appears within the expected annual window",
        }

    if logic_type == "interval_years":
        interval_years = int(logic.get("interval_years", 1))
        if latest and (today - latest).days <= 365 * interval_years:
            return {"status": "likely current", "reason": "the latest recorded dose appears within the expected booster interval"}
        return {
            "status": "possibly due pending missing history" if has_missing_history else "likely due",
            "reason": "the latest recorded dose appears older than the expected booster interval",
        }

    if logic_type == "min_dose_count":
        required_doses = int(logic.get("required_doses", 1))
        if count >= required_doses:
            return {"status": "likely current", "reason": f"the record shows at least {required_doses} documented dose(s)"}
        return {
            "status": "possibly due pending missing history" if has_missing_history else "likely due",
            "reason": f"the record shows {count} documented dose(s), below the simplified expected count of {required_doses}",
        }

    if logic_type == "at_least_one":
        if count >= 1:
            return {"status": "likely current", "reason": "the record shows at least one documented dose"}
        return {
            "status": "possibly due pending missing history" if has_missing_history else "likely due",
            "reason": "no documented dose was found in the available record",
        }

    return {
        "status": "unable to determine from available record",
        "reason": "this recommendation depends on additional age, risk, country, or clinical context not encoded in the simplified public schedule snapshot",
    }


def compare(payload: Dict[str, object]) -> Dict[str, object]:
    today = _parse_date(payload.get("now")) or date.today()
    patient = payload.get("patient", {})
    schedule_source = payload.get("schedule_source")
    if schedule_source not in SCHEDULE_PATHS:
        age_years = payload.get("age_years")
        if age_years is None:
            age_years = _compute_age_years(patient.get("dob"), today)
        schedule_source = "cdc_child" if age_years is not None and age_years < 19 else "cdc_adult"

    schedule_payload = _load_schedule(schedule_source)
    normalized = payload.get("normalized", payload)
    records = normalized.get("records", [])
    duplicates = normalized.get("duplicates", [])
    skipped = normalized.get("skipped", [])
    titer_status = payload.get("titer_status_by_antigen", {})

    records_by_group: Dict[str, List[Dict[str, object]]] = defaultdict(list)
    for record in records:
        records_by_group[record.get("antigen_group", "unclassified")].append(record)

    for antigen_records in records_by_group.values():
        antigen_records.sort(key=lambda row: row.get("occurrence_date") or "", reverse=True)

    classifications = []
    for rule in schedule_payload.get("schedule", []):
        antigen_group = rule["antigen_group"]
        antigen_records = records_by_group.get(antigen_group, [])
        has_missing_history = bool(skipped) or any("external_record" in record["quality_flags"] for record in antigen_records)
        immune_by_lab = bool(titer_status.get(antigen_group, {}).get("immune"))
        result = _status_for_logic(rule["logic"], antigen_records, today, has_missing_history, immune_by_lab)
        classifications.append(
            {
                "antigen": rule["antigen"],
                "antigen_group": antigen_group,
                "status": result["status"],
                "reason": result["reason"],
                "count": len(antigen_records),
                "latest_date": antigen_records[0]["occurrence_date"] if antigen_records else None,
                "notes": rule.get("notes"),
                "supporting_lab": titer_status.get(antigen_group),
            }
        )

    unclassified_records = [record for record in records if record.get("antigen_group") == "unclassified"]

    return {
        "schedule_source": schedule_payload["source"],
        "schedule_source_url": schedule_payload["source_url"],
        "schedule_version_date": schedule_payload["version_date"],
        "classifications": classifications,
        "summary": {
            "record_count": len(records),
            "duplicate_count": len(duplicates),
            "skipped_count": len(skipped),
            "unclassified_count": len(unclassified_records),
        },
    }


def main() -> int:
    payload = json.load(sys.stdin)
    json.dump(compare(payload), sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
