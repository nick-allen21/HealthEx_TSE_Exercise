#!/usr/bin/env python3
"""Run the public immunization skill pipeline in one invocation."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict, List


SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from compare_schedule import compare  # noqa: E402
from format_output import format_output, load_skill_version  # noqa: E402
from normalize_immunizations import normalize_immunization_rows  # noqa: E402
from paginate import merge_rows, parse_pagination_lines  # noqa: E402
from parse_summary import parse_health_summary  # noqa: E402
from parse_tabular import parse_health_ex_tabular  # noqa: E402
from parse_titers import parse_titers  # noqa: E402


def _parse_windows(windows: List[object]) -> List[Dict[str, object]]:
    parsed = []
    for window in windows:
        if isinstance(window, str):
            parsed.append(parse_health_ex_tabular(window).to_dict())
        elif isinstance(window, dict):
            parsed.append(window)
    return parsed


def _flatten_labs(lab_windows: List[object]) -> List[Dict[str, object]]:
    rows: List[Dict[str, object]] = []
    for window in lab_windows:
        if isinstance(window, str):
            parsed = parse_health_ex_tabular(window).to_dict()
            rows.extend(parsed.get("rows", []))
        elif isinstance(window, dict):
            rows.extend(window.get("rows", []))
    return rows


def _compute_age_band(dob: str | None, now: str | None) -> str:
    if not dob:
        return "unknown"
    if not now:
        now = dob
    dob_year = int(dob[:4])
    now_year = int(now[:4])
    approx_age = max(0, now_year - dob_year)
    return "child/adolescent" if approx_age < 19 else "adult"


def run_analysis(payload: Dict[str, object]) -> Dict[str, object]:
    parsed_immunization_windows = _parse_windows(payload.get("immunization_windows", []))
    merged_rows = merge_rows(parsed_immunization_windows)
    normalized = normalize_immunization_rows(merged_rows)

    health_summary = payload.get("health_summary")
    if isinstance(health_summary, str):
        parsed_summary = parse_health_summary(health_summary)
    else:
        parsed_summary = health_summary or {}

    lab_rows = _flatten_labs(payload.get("lab_windows", []))
    titer_status = parse_titers({"rows": lab_rows})

    patient = dict(payload.get("patient", {}))
    if not patient.get("dob"):
        patient["dob"] = parsed_summary.get("dob")
    patient.setdefault("data_source", "live HealthEx connector")
    patient["full_history_completed"] = bool(parsed_immunization_windows) and not parse_pagination_lines(
        parsed_immunization_windows[-1].get("pagination_lines", [])
    ).more_available
    patient["age_band"] = _compute_age_band(patient.get("dob"), payload.get("now"))

    comparison = compare(
        {
            "normalized": normalized,
            "patient": patient,
            "now": payload.get("now"),
            "schedule_source": payload.get("schedule_source"),
            "titer_status_by_antigen": titer_status,
            "include_childhood_audit": payload.get("include_childhood_audit", True),
        }
    )

    output_payload = {
        "patient": patient,
        "freshness": payload.get("freshness", {}),
        "normalized": normalized,
        "comparison": comparison,
        "supporting_tools": payload.get("supporting_tools", []),
        "corrective_actions": payload.get("corrective_actions", []),
        "assumptions": payload.get("assumptions", []),
        "skill_version": load_skill_version(),
        "degraded_analysis": payload.get("degraded_analysis"),
    }

    result = {"final_output": format_output(output_payload)}
    if payload.get("include_checkpoints"):
        result["checkpoints"] = {
            "parsed_immunization_windows": parsed_immunization_windows,
            "normalized": normalized,
            "parsed_summary": parsed_summary,
            "titer_status_by_antigen": titer_status,
            "comparison": comparison,
        }
    return result


def main() -> int:
    payload = json.load(sys.stdin)
    json.dump(run_analysis(payload), sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
