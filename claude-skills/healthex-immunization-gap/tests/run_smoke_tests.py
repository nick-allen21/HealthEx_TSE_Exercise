#!/usr/bin/env python3
"""Smoke tests for feedback-driven immunization skill fixtures."""

from __future__ import annotations

import json
import sys
from pathlib import Path


TEST_DIR = Path(__file__).resolve().parent
SKILL_DIR = TEST_DIR.parent
SCRIPT_DIR = SKILL_DIR / "scripts"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from run_analysis import run_analysis  # noqa: E402


def main() -> int:
    fixtures_dir = TEST_DIR / "fixtures"
    failures = []

    for fixture_path in sorted(fixtures_dir.glob("*.json")):
        fixture = json.loads(fixture_path.read_text())
        result = run_analysis(fixture["payload"])
        final_output = result["final_output"]
        expectations = fixture.get("expectations", {})

        for text in expectations.get("contains", []):
            if text not in final_output:
                failures.append(f"{fixture_path.name}: missing expected text -> {text}")

        for text in expectations.get("not_contains", []):
            if text in final_output:
                failures.append(f"{fixture_path.name}: found forbidden text -> {text}")

    if failures:
        print("smoke test failures:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("all smoke tests passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
