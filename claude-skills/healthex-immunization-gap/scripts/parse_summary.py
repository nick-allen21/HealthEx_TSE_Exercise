#!/usr/bin/env python3
"""Parse the flat HealthEx get_health_summary blob."""

from __future__ import annotations

import json
import re
import sys
from typing import Dict, Optional


PATIENT_RE = re.compile(r"^PATIENT:\s*(?P<name>.*?),\s*DOB\s+(?P<dob>\d{4}-\d{2}-\d{2})$")
SECTION_RE = re.compile(r"^(?P<name>.+?)\((?P<count_info>[^)]+)\):\s*(?P<body>.*)$")


def parse_health_summary(text: str) -> Dict[str, object]:
    result: Dict[str, object] = {"patient_name": None, "dob": None, "sections": {}, "raw_lines": []}

    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        result["raw_lines"].append(stripped)

        patient_match = PATIENT_RE.match(stripped)
        if patient_match:
            result["patient_name"] = patient_match.group("name")
            result["dob"] = patient_match.group("dob")
            continue

        section_match = SECTION_RE.match(stripped)
        if section_match:
            result["sections"][section_match.group("name")] = {
                "count_info": section_match.group("count_info"),
                "body": section_match.group("body"),
            }

    return result


def main() -> int:
    payload = sys.stdin.read()
    json.dump(parse_health_summary(payload), sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
