#!/usr/bin/env python3
"""Format immunization-gap analysis into the public skill output contract."""

from __future__ import annotations

import json
import sys
from typing import Dict, List


SKILL_VERSION = "1.0.0"


def _bullet_lines(items: List[str]) -> List[str]:
    if not items:
        return ["- none noted"]
    return [f"- {item}" for item in items]


def format_output(payload: Dict[str, object]) -> str:
    patient = payload.get("patient", {})
    freshness = payload.get("freshness", {})
    normalized = payload.get("normalized", {})
    comparison = payload.get("comparison", {})
    classifications = comparison.get("classifications", [])

    likely_current = [item for item in classifications if item["status"] == "likely current"]
    potential_gaps = [item for item in classifications if item["status"] != "likely current"]

    quality_flags = []
    summary = normalized.get("summary", {})
    if summary.get("external_records"):
        quality_flags.append(f"{summary['external_records']} imported or externally reconciled immunization record(s)")
    if summary.get("missing_cvx_records"):
        quality_flags.append(f"{summary['missing_cvx_records']} record(s) missing CVX")
    if summary.get("unsupported_cvx_records"):
        quality_flags.append(f"{summary['unsupported_cvx_records']} record(s) with CVX outside the bundled public mapping")
    if summary.get("duplicate_records"):
        quality_flags.append(f"{summary['duplicate_records']} duplicate occurrence/CVX artifact(s) were deduplicated")
    if summary.get("skipped_records"):
        quality_flags.append(f"{summary['skipped_records']} record(s) were skipped from schedule math due to missing dates")
    if freshness.get("is_stale"):
        quality_flags.append("records may be stale or unsynced")

    supporting_tools = payload.get("supporting_tools", [])
    assumptions = payload.get("assumptions", [])
    if summary.get("external_records"):
        assumptions.append("imported records may omit product-level details")
    if freshness.get("is_stale"):
        assumptions.append("recent vaccines may be missing because the record sync appears stale")

    lines: List[str] = []
    lines.extend(
        [
            "## 1. Patient Context",
            "",
            * _bullet_lines(
                [
                    f"age band: {patient.get('age_band', 'unknown')}",
                    f"data source: {patient.get('data_source', 'live HealthEx connector')}",
                    f"full paginated history pull completed: {'yes' if patient.get('full_history_completed', True) else 'no'}",
                ]
            ),
            "",
            "## 2. Record Freshness",
            "",
            * _bullet_lines(
                [
                    f"last synced: {freshness.get('last_updated', 'unknown')}",
                    f"stale warning: {'yes' if freshness.get('is_stale') else 'no'}",
                    f"reconnect guidance: {freshness.get('reconnect_url', 'not provided')}",
                ]
            ),
            "",
            "## 3. Data Reviewed",
            "",
            * _bullet_lines(
                [
                    f"{summary.get('total_records', 0)} normalized immunization record(s)",
                    f"schedule reference: {comparison.get('schedule_source', 'unknown')} ({comparison.get('schedule_version_date', 'unknown')})",
                    f"supporting tools used: {', '.join(supporting_tools) if supporting_tools else 'none beyond immunization history'}",
                ]
            ),
            "",
            "## 4. Data Quality Flags",
            "",
            * _bullet_lines(quality_flags),
            "",
            "## 5. Immunizations Likely Current",
            "",
        ]
    )

    if likely_current:
        for item in likely_current:
            lines.append(f"- {item['antigen']}: {item['reason']}")
    else:
        lines.append("- none identified with high confidence")

    lines.extend(["", "## 6. Potential Gaps Or Overdue Items", ""])

    if potential_gaps:
        for item in potential_gaps:
            lines.append(f"- {item['antigen']}: {item['status']} - {item['reason']}")
    else:
        lines.append("- no likely gaps identified from the available record")

    lines.extend(
        [
            "",
            "## 7. Corrective Actions To Consider",
            "",
            * _bullet_lines(payload.get("corrective_actions", [])),
            "",
            "## 8. Assumptions And Missing Data",
            "",
            * _bullet_lines(assumptions),
            "",
            "## 9. Non-Clinical Disclaimer",
            "",
            "A few things to keep in mind: This analysis only includes vaccines in your HealthEx-connected records. Shots given at pharmacies, travel clinics, military sites, or outside this health system may not appear. The recommendation logic is based on the bundled schedule snapshot cited in this answer. This is a summary of your records, not medical advice; confirm any gaps or next steps with your clinician before acting.",
            "",
            f"immunization-gap-analysis v{SKILL_VERSION} · {comparison.get('schedule_source', 'schedule')} {comparison.get('schedule_version_date', 'unknown')} · synced {freshness.get('last_updated', 'unknown')}",
        ]
    )

    return "\n".join(lines)


def main() -> int:
    payload = json.load(sys.stdin)
    sys.stdout.write(format_output(payload))
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
