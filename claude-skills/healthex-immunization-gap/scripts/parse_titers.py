#!/usr/bin/env python3
"""Parse immunity-related titers from HealthEx lab rows."""

from __future__ import annotations

import json
import re
import sys
from typing import Dict, Iterable, List, Optional


ANTIGEN_RULES = [
    ("mmr", re.compile(r"measles|mumps|rubella", re.I)),
    ("varicella", re.compile(r"varicella|vzv", re.I)),
    ("hepb", re.compile(r"anti-?hbs|hepatitis\s*b.*surface.*ab|hepatitis\s*b.*surface.*antibody", re.I)),
    ("hepa", re.compile(r"anti-?hav|hepatitis\s*a", re.I)),
]
IMMUNE_WORD_RE = re.compile(r"\bimmune\b|\breactive\b|\bpositive\b", re.I)
NONIMMUNE_WORD_RE = re.compile(r"non-?immune|\bnegative\b|\bnot immune\b", re.I)
NUMBER_RE = re.compile(r"(-?\d+(?:\.\d+)?)")


def _as_rows(payload: object) -> List[Dict[str, object]]:
    if isinstance(payload, dict) and "rows" in payload:
        return payload["rows"]
    if isinstance(payload, list):
        return payload
    return []


def _match_antigen(name: str) -> Optional[str]:
    for antigen_group, pattern in ANTIGEN_RULES:
        if pattern.search(name):
            return antigen_group
    return None


def _interpret_value(antigen_group: str, text: str) -> Optional[bool]:
    lowered = text.lower()
    if NONIMMUNE_WORD_RE.search(lowered):
        return False
    if IMMUNE_WORD_RE.search(lowered):
        return True

    number_match = NUMBER_RE.search(text)
    if not number_match:
        return None

    value = float(number_match.group(1))
    if antigen_group == "hepb":
        return value >= 10.0
    return None


def parse_titers(payload: object) -> Dict[str, Dict[str, object]]:
    rows = _as_rows(payload)
    results: Dict[str, Dict[str, object]] = {}

    for row in rows:
        raw_name = " ".join(
            str(row.get(key, "") or "")
            for key in ("Lab", "Name", "Test", "Observation", "Description")
        ).strip()
        antigen_group = _match_antigen(raw_name)
        if not antigen_group:
            continue

        raw_value = " ".join(
            str(row.get(key, "") or "")
            for key in ("Value", "Result", "Interpretation", "ReferenceRange", "RefRange")
        ).strip()
        immune = _interpret_value(antigen_group, raw_value)
        if immune is None:
            continue

        existing = results.get(antigen_group)
        if existing and existing.get("immune") is True:
            continue

        results[antigen_group] = {
            "immune": immune,
            "source": raw_name or "lab result",
            "raw_value": raw_value,
        }

    return results


def main() -> int:
    payload = json.load(sys.stdin)
    json.dump(parse_titers(payload), sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
