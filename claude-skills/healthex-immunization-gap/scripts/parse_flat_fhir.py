#!/usr/bin/env python3
"""Parse flattened-FHIR lines returned by HealthEx search tools."""

from __future__ import annotations

import json
import re
import sys
from typing import Dict, List


SENTENCE_RE = re.compile(r"(?P<field>[A-Za-z0-9_.\[\]-]+)\s+is\s+(?P<value>.+?)(?:\.|$)")


def parse_flat_fhir(text: str) -> List[Dict[str, str]]:
    records: List[Dict[str, str]] = []
    current: Dict[str, str] = {}

    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue

        if stripped.startswith("Relevance Score"):
            if current:
                records.append(current)
                current = {}
            current["relevance"] = stripped
            continue

        for match in SENTENCE_RE.finditer(stripped):
            current[match.group("field")] = match.group("value").strip()

    if current:
        records.append(current)

    return records


def main() -> int:
    payload = sys.stdin.read()
    json.dump(parse_flat_fhir(payload), sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
