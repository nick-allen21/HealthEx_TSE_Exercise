#!/usr/bin/env python3
"""Parse HealthEx dictionary-compressed tabular tool output."""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field
from typing import Dict, List, Optional


HEADER_RE = re.compile(r"^#(?P<category>.+?)\s+(?P<window>[^|]+)\|Total:(?P<total>\d+)$")
DICT_RE = re.compile(r"^(?P<token>[A-Za-z][A-Za-z0-9_]*):(?P<index>\d+)=(?P<value>.*)$")


def _normalize_label(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def _header_aliases(header: str) -> List[str]:
    parts = re.split(r"[^A-Za-z0-9]+", header)
    parts = [part for part in parts if part]
    normalized = _normalize_label(header)
    aliases = {normalized}
    if parts:
        aliases.add("".join(part[0].lower() for part in parts))
        aliases.add("".join(part.lower() for part in parts))
        aliases.add(parts[0][:2].lower())
    return sorted(alias for alias in aliases if alias)


@dataclass
class ParsedTable:
    category: Optional[str] = None
    window: Optional[str] = None
    total: Optional[int] = None
    metadata_lines: List[str] = field(default_factory=list)
    note: Optional[str] = None
    headers: List[str] = field(default_factory=list)
    rows: List[Dict[str, str]] = field(default_factory=list)
    pagination_lines: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, object]:
        return {
            "category": self.category,
            "window": self.window,
            "total": self.total,
            "metadata_lines": self.metadata_lines,
            "note": self.note,
            "headers": self.headers,
            "rows": self.rows,
            "pagination_lines": self.pagination_lines,
        }


def _resolve_dictionary_columns(headers: List[str], dictionary_tokens: List[str]) -> Dict[str, str]:
    alias_to_header: Dict[str, str] = {}
    for header in headers:
        for alias in _header_aliases(header):
            alias_to_header.setdefault(alias, header)

    mapping: Dict[str, str] = {}
    for token in dictionary_tokens:
        normalized = _normalize_label(token)
        if normalized in alias_to_header:
            mapping[token] = alias_to_header[normalized]
            continue

        for alias, header in alias_to_header.items():
            if alias.startswith(normalized) or normalized.startswith(alias):
                mapping[token] = header
                break
    return mapping


def parse_health_ex_tabular(text: str) -> ParsedTable:
    parsed = ParsedTable()
    dictionary_by_token: Dict[str, Dict[str, str]] = {}
    lines = text.splitlines()

    data_started = False
    in_pagination = False

    for raw_line in lines:
        line = raw_line.rstrip("\n")
        stripped = line.strip()

        if not stripped:
            continue

        if stripped == "---":
            in_pagination = True
            continue

        if in_pagination:
            parsed.pagination_lines.append(stripped)
            continue

        header_match = HEADER_RE.match(stripped)
        if header_match:
            parsed.category = header_match.group("category")
            parsed.window = header_match.group("window")
            parsed.total = int(header_match.group("total"))
            continue

        dict_match = DICT_RE.match(stripped)
        if dict_match and not data_started:
            token = dict_match.group("token")
            index = dict_match.group("index")
            value = dict_match.group("value")
            dictionary_by_token.setdefault(token, {})[index] = value
            continue

        if stripped.startswith("Note:"):
            parsed.note = stripped
            continue

        if "|" in stripped and not parsed.headers:
            parsed.headers = [value.strip() for value in stripped.split("|")]
            continue

        if parsed.headers:
            data_started = True
            cells = [value.strip() for value in stripped.split("|")]
            if len(cells) < len(parsed.headers):
                cells.extend([""] * (len(parsed.headers) - len(cells)))
            elif len(cells) > len(parsed.headers):
                cells = cells[: len(parsed.headers)]

            row = dict(zip(parsed.headers, cells))
            parsed.rows.append(row)
            continue

        parsed.metadata_lines.append(stripped)

    token_to_header = _resolve_dictionary_columns(parsed.headers, list(dictionary_by_token))
    previous_values: Dict[str, str] = {}

    for row in parsed.rows:
        for header in parsed.headers:
            value = row.get(header, "")
            if value.startswith("@"):
                token_index = value[1:]
                token_header = next(
                    (mapped_header for token, mapped_header in token_to_header.items() if mapped_header == header and token_index in dictionary_by_token.get(token, {})),
                    None,
                )
                if token_header:
                    token = next(
                        token for token, mapped_header in token_to_header.items() if mapped_header == token_header and token_index in dictionary_by_token.get(token, {})
                    )
                    row[header] = dictionary_by_token[token][token_index]
                else:
                    row[header] = value
            elif value == "" and header in previous_values:
                row[header] = previous_values[header]

            if row.get(header, "") != "":
                previous_values[header] = row[header]

    return parsed


def main() -> int:
    payload = sys.stdin.read()
    parsed = parse_health_ex_tabular(payload)
    json.dump(parsed.to_dict(), sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
