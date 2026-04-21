# Data Quality Flags

Use these flags to decide whether confidence should be lowered before telling a
user they are up to date or due for something.

## High-Value Flags

### `PrimarySource = No`

Meaning:

- imported or auto-reconciled from an outside source
- often missing lot number, route, site, dose, or manufacturer

Implication:

- usable for broad history and gap review
- weaker for product-specific conclusions, forms, and recall questions

### Stale `lastUpdated`

Meaning:

- the chart may not include recent vaccinations or imports

Implication:

- warn the user that a missing vaccine might reflect sync lag rather than a true
  gap
- surface reconnect guidance when available

### Missing `CVX`

Meaning:

- the record cannot be reliably mapped to a known vaccine code

Implication:

- keep the record as `unclassified`
- do not force it into a schedule bucket

### Duplicate `(OccurrenceDate, CVX)` rows

Meaning:

- common import artifact

Implication:

- deduplicate for broad schedule reasoning
- mention the artifact in assumptions when it materially affects the count

### Missing product-level detail

Examples:

- missing manufacturer
- missing lot number
- missing route or site
- missing dose

Implication:

- lower confidence for product-specific reasoning
- do not overstate conclusions for recall checks, product sequence questions, or
  form generation

### `ExpirationDate < OccurrenceDate`

Meaning:

- possible data-entry issue or administration issue

Implication:

- flag for review
- do not silently treat the record as unquestionably clean

## Confidence Guidance

- `high confidence`: fresh chart, primary-source records, clear CVX, clear
  occurrence dates
- `moderate confidence`: some imported records or missing product fields, but
  enough evidence for cautious guidance
- `low confidence`: stale chart, mostly imported data, missing CVX, unresolved
  duplicates, or missing context that changes the actual recommendation
