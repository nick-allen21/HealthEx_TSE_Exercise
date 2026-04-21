#!/usr/bin/env python3
"""Extract and merge HealthEx pagination instructions."""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional


BEFORE_RE = re.compile(r'beforeDate:\s*"(?P<date>[^"]+)"')
YEARS_RE = re.compile(r"years:\s*(?P<years>\d+)")
DATE_RANGE_RE = re.compile(r"Date Range:\s*(?P<start>\S+)\s+to\s+(?P<end>\S+)")


@dataclass
class PaginationInfo:
    more_available: bool = False
    next_before_date: Optional[str] = None
    next_years: Optional[int] = None
    date_range_start: Optional[str] = None
    date_range_end: Optional[str] = None
    raw_lines: Optional[List[str]] = None

    def to_dict(self) -> Dict[str, object]:
        return {
            "more_available": self.more_available,
            "next_before_date": self.next_before_date,
            "next_years": self.next_years,
            "date_range_start": self.date_range_start,
            "date_range_end": self.date_range_end,
            "raw_lines": self.raw_lines or [],
        }


def parse_pagination_lines(lines: Iterable[str]) -> PaginationInfo:
    info = PaginationInfo(raw_lines=list(lines))

    for line in info.raw_lines:
        stripped = line.strip()
        if "More data available: Yes" in stripped:
            info.more_available = True

        date_range_match = DATE_RANGE_RE.search(stripped)
        if date_range_match:
            info.date_range_start = date_range_match.group("start")
            info.date_range_end = date_range_match.group("end")

        before_match = BEFORE_RE.search(stripped)
        if before_match:
            info.next_before_date = before_match.group("date")

        years_match = YEARS_RE.search(stripped)
        if years_match and "Requested" not in stripped:
            info.next_years = int(years_match.group("years"))

    return info


def merge_rows(window_payloads: List[Dict[str, object]]) -> List[Dict[str, object]]:
    merged: List[Dict[str, object]] = []
    for payload in window_payloads:
        merged.extend(payload.get("rows", []))
    return merged


def main() -> int:
    payload = json.load(sys.stdin)

    if isinstance(payload, dict) and "pagination_lines" in payload:
        json.dump(parse_pagination_lines(payload["pagination_lines"]).to_dict(), sys.stdout, indent=2)
        sys.stdout.write("\n")
        return 0

    if isinstance(payload, list):
        json.dump({"rows": merge_rows(payload)}, sys.stdout, indent=2)
        sys.stdout.write("\n")
        return 0

    raise SystemExit("Expected a parsed table object or a list of parsed table objects.")


if __name__ == "__main__":
    raise SystemExit(main())
