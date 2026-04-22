"use client";

import { useMemo, useState } from "react";

import { StreamingChartSummary } from "@/components/streaming-chart-summary";
import {
  buildSummaryFromBundle,
  decodeJwtSub,
  prettifyUnit,
  type ClinicalItem,
  type ClinicalOccurrence,
  type ClinicalTab,
  type ClinicalTabId,
  type FhirBundle,
  type HealthExSummary,
} from "@/lib/healthex-summary";
import {
  RecordSelectionProvider,
  selectionKey,
  useRecordSelection,
} from "@/lib/record-selection";

type LiveHealthExViewerProps = {
  fallbackSummary: HealthExSummary | null;
};

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { message: string; status: "error" }
  | { status: "success"; summary: HealthExSummary };

async function fetchAllPages(personId: string, token: string) {
  const entries: NonNullable<FhirBundle["entry"]> = [];
  const seen = new Set<string>();
  let remoteTotal = 0;
  let url = `https://api.healthex.io/FHIR/R4/Person/${personId}/$everything?_count=200`;

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`HealthEx request failed (${response.status}): ${text}`);
    }

    const bundle = JSON.parse(text) as FhirBundle & {
      link?: Array<{ relation?: string; url?: string }>;
      total?: number;
    };

    remoteTotal = Math.max(remoteTotal, Number(bundle.total ?? 0));

    for (const entry of bundle.entry ?? []) {
      const key =
        entry.resource?.id && entry.resource?.resourceType
          ? `${entry.resource.resourceType}/${entry.resource.id}`
          : JSON.stringify(entry.resource ?? entry);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      entries.push(entry);
    }

    const nextUrl = bundle.link?.find((link) => link.relation === "next")?.url;
    url = nextUrl ?? "";
  }

  return {
    bundle: {
      entry: entries,
      total: remoteTotal || entries.length,
    } satisfies FhirBundle,
    remoteTotal,
  };
}

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function filterClinicalItems(items: ClinicalItem[], query: string) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) =>
    [item.label, item.description, ...item.metadata]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(normalizedQuery)),
  );
}

function getNumericOccurrences(occurrences: ClinicalOccurrence[]) {
  return occurrences
    .filter(
      (occurrence) =>
        typeof occurrence.numericValue === "number" &&
        Number.isFinite(occurrence.numericValue) &&
        occurrence.sortTime > Number.NEGATIVE_INFINITY,
    )
    .sort((left, right) => left.sortTime - right.sortTime);
}

type SparklinePoint = { time: number; value: number; raw: ClinicalOccurrence };

function formatNumeric(value: number) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  const hasFraction = Math.abs(value - Math.round(value)) > 0.01;
  return hasFraction ? value.toFixed(1) : String(Math.round(value));
}

function formatShortDate(time: number) {
  if (!Number.isFinite(time)) {
    return "";
  }

  const date = new Date(time);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

function Sparkline({ points }: { points: SparklinePoint[] }) {
  if (points.length < 2) {
    return null;
  }

  const width = 360;
  const height = 140;
  const padTop = 10;
  const padRight = 12;
  const padBottom = 24;
  const padLeft = 46;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const times = points.map((point) => point.time);
  const values = points.map((point) => point.value);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const valRange = rawMax - rawMin;
  const valPad = valRange === 0 ? Math.max(Math.abs(rawMax) * 0.1, 1) : valRange * 0.08;
  const minVal = rawMin - valPad;
  const maxVal = rawMax + valPad;
  const displayValRange = Math.max(maxVal - minVal, 1);
  const useTimeAxis = maxTime - minTime > 60 * 1000;
  const timeRange = Math.max(maxTime - minTime, 1);

  const unit = points[points.length - 1].raw.unit;

  const toX = (point: SparklinePoint, index: number) => {
    if (useTimeAxis) {
      return padLeft + ((point.time - minTime) / timeRange) * innerW;
    }

    const denom = Math.max(points.length - 1, 1);
    return padLeft + (index / denom) * innerW;
  };
  const toY = (value: number) => padTop + (1 - (value - minVal) / displayValRange) * innerH;

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${toX(point, index).toFixed(1)},${toY(point.value).toFixed(1)}`)
    .join(" ");

  const areaBottom = (padTop + innerH).toFixed(1);
  const firstX = toX(points[0], 0).toFixed(1);
  const lastX = toX(points[points.length - 1], points.length - 1).toFixed(1);
  const areaPath = `${path} L${lastX},${areaBottom} L${firstX},${areaBottom} Z`;

  const yTicks = [rawMax, (rawMin + rawMax) / 2, rawMin];
  const unitCaption = prettifyUnit(unit);

  return (
    <svg
      className="item-sparkline"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      {unitCaption ? (
        <text
          className="item-sparkline-unit"
          x={padLeft - 6}
          y={padTop - 2}
          textAnchor="end"
        >
          {unitCaption}
        </text>
      ) : null}
      <g className="item-sparkline-axis">
        {yTicks.map((tick, index) => {
          const y = toY(tick);
          return (
            <g key={`y-tick-${index}`}>
              <line
                className="item-sparkline-gridline"
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
              />
              <text className="item-sparkline-tick" x={padLeft - 6} y={y} textAnchor="end" dominantBaseline="middle">
                {formatNumeric(tick)}
              </text>
            </g>
          );
        })}
      </g>

      <line
        className="item-sparkline-axis-line"
        x1={padLeft}
        x2={width - padRight}
        y1={padTop + innerH}
        y2={padTop + innerH}
      />

      <path className="item-sparkline-area" d={areaPath} />
      <path className="item-sparkline-line" d={path} />
      {points.map((point, index) => (
        <circle
          key={`${point.time}-${index}`}
          className="item-sparkline-dot"
          cx={toX(point, index)}
          cy={toY(point.value)}
          r={2.4}
        />
      ))}

      <text
        className="item-sparkline-axis-label"
        x={padLeft}
        y={height - 6}
        textAnchor="start"
      >
        {useTimeAxis ? formatShortDate(minTime) : `Reading 1`}
      </text>
      <text
        className="item-sparkline-axis-label"
        x={width - padRight}
        y={height - 6}
        textAnchor="end"
      >
        {useTimeAxis ? formatShortDate(maxTime) : `Reading ${points.length}`}
      </text>
    </svg>
  );
}

function DateTimeline({ occurrences }: { occurrences: ClinicalOccurrence[] }) {
  const dated = occurrences
    .filter((occurrence) => occurrence.sortTime > Number.NEGATIVE_INFINITY)
    .sort((left, right) => left.sortTime - right.sortTime);

  if (dated.length === 0) {
    return null;
  }

  if (dated.length === 1) {
    return (
      <div className="item-dateline item-dateline-single">
        <span className="item-dateline-dot" aria-hidden="true" />
        <span>{dated[0].dateLabel ?? "Recorded"}</span>
      </div>
    );
  }

  const minTime = dated[0].sortTime;
  const maxTime = dated[dated.length - 1].sortTime;
  const range = Math.max(maxTime - minTime, 1);

  return (
    <div className="item-dateline" role="img" aria-label="Occurrence timeline">
      <span className="item-dateline-track" aria-hidden="true" />
      {dated.map((occurrence, index) => {
        const position = ((occurrence.sortTime - minTime) / range) * 100;

        return (
          <span
            key={`${occurrence.sortTime}-${index}`}
            className="item-dateline-marker"
            style={{ left: `${position}%` }}
            title={occurrence.dateLabel}
            aria-hidden="true"
          />
        );
      })}
      <div className="item-dateline-labels">
        <span>{dated[0].dateLabel}</span>
        <span>{dated[dated.length - 1].dateLabel}</span>
      </div>
    </div>
  );
}

function OccurrenceList({ occurrences }: { occurrences: ClinicalOccurrence[] }) {
  if (occurrences.length === 0) {
    return null;
  }

  const limited = occurrences.slice(0, 8);

  return (
    <ul className="item-occurrence-list">
      {limited.map((occurrence, index) => (
        <li key={`${occurrence.sortTime}-${index}`} className="item-occurrence">
          <span className="item-occurrence-date">{occurrence.dateLabel ?? "Undated"}</span>
          <span
            className={`item-occurrence-value ${
              occurrence.isPlaceholder ? "item-occurrence-value-placeholder" : ""
            }`}
          >
            {occurrence.isPlaceholder ? "Recorded" : occurrence.valueLabel}
          </span>
        </li>
      ))}
      {occurrences.length > limited.length ? (
        <li className="item-occurrence item-occurrence-more">
          +{occurrences.length - limited.length} earlier entries
        </li>
      ) : null}
    </ul>
  );
}

function summarizeNumericSeries(points: SparklinePoint[]) {
  if (points.length === 0) {
    return null;
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((total, value) => total + value, 0) / values.length;
  const latest = points[points.length - 1];
  const unit = latest.raw.unit;
  const format = (value: number) => {
    if (!Number.isFinite(value)) {
      return "-";
    }

    const hasFraction = Math.abs(value - Math.round(value)) > 0.01;
    return hasFraction ? value.toFixed(1) : String(Math.round(value));
  };

  return {
    latestLabel: `${format(latest.value)}${unit ? ` ${unit}` : ""}`,
    minLabel: `${format(min)}${unit ? ` ${unit}` : ""}`,
    maxLabel: `${format(max)}${unit ? ` ${unit}` : ""}`,
    avgLabel: `${format(avg)}${unit ? ` ${unit}` : ""}`,
  };
}

type RenderItemContext = {
  expanded: boolean;
  isPinned: boolean;
  onToggle: () => void;
  onTogglePin: () => void;
  tabId: ClinicalTabId;
};

function renderItem(item: ClinicalItem, key: string, context: RenderItemContext) {
  const { expanded, isPinned, onToggle, onTogglePin, tabId } = context;
  const occurrenceCount = item.occurrenceCount ?? item.occurrences.length ?? 1;
  const isRollup = item.presentation === "rollup" || occurrenceCount > 1;
  const numericPoints: SparklinePoint[] = getNumericOccurrences(item.occurrences).map(
    (occurrence) => ({
      time: occurrence.sortTime,
      value: occurrence.numericValue as number,
      raw: occurrence,
    }),
  );
  const canSparkline = numericPoints.length >= 2;
  const series = canSparkline ? summarizeNumericSeries(numericPoints) : null;
  const isSingleOccurrence = item.occurrences.length <= 1;
  const isImmunizations = tabId === "immunizations";
  const allPlaceholder =
    item.occurrences.length > 0 && item.occurrences.every((occurrence) => occurrence.isPlaceholder);
  const showChart = canSparkline && !isImmunizations;
  const showDateTimeline = !showChart && !isImmunizations && !isSingleOccurrence;
  const showOccurrenceList =
    !isSingleOccurrence && !showChart && !allPlaceholder;
  const singleOccurrence = isSingleOccurrence ? item.occurrences[0] : null;

  const summaryBits: string[] = [];

  if (item.description) {
    summaryBits.push(item.description);
  }

  if (item.metadata.length > 0) {
    summaryBits.push(item.metadata[0]);
  }

  return (
    <li
      key={key}
      className={`item-row ${expanded ? "item-row-expanded" : ""} ${isPinned ? "item-row-pinned" : ""}`}
      onDoubleClick={onTogglePin}
      title={isPinned ? "Pinned to chat. Double-click to unpin." : "Double-click to pin to chat context."}
    >
      <button type="button" className="item-row-head" onClick={onToggle} aria-expanded={expanded}>
        <span className="item-row-label">
          <span className="item-row-title">
            {item.label}
            {isPinned ? <span className="item-row-pin-dot" aria-label="Pinned to chat" /> : null}
          </span>
          {summaryBits.length > 0 ? (
            <span className="item-row-summary">{summaryBits.join(" · ")}</span>
          ) : null}
        </span>
        <span className="item-row-end">
          {isRollup ? (
            <span className="item-row-count">{occurrenceCount}</span>
          ) : null}
          <span aria-hidden="true" className={`item-row-chevron ${expanded ? "item-row-chevron-open" : ""}`}>
            ›
          </span>
        </span>
      </button>

      {expanded ? (
        <div className={`item-row-body ${isSingleOccurrence ? "item-row-body-single" : ""}`}>
          {singleOccurrence ? (
            <div className="item-row-single-value">
              <span className="item-row-single-date">{singleOccurrence.dateLabel ?? "Undated"}</span>
              <span
                className={`item-row-single-label ${
                  singleOccurrence.isPlaceholder ? "item-row-single-label-placeholder" : ""
                }`}
              >
                {singleOccurrence.isPlaceholder ? "Recorded (no captured value)" : singleOccurrence.valueLabel}
              </span>
            </div>
          ) : (
            <>
              {showChart && series ? (
                <>
                  <div className="item-row-series-meta">
                    <span>
                      <em>Latest</em>
                      <strong>{series.latestLabel}</strong>
                    </span>
                    <span>
                      <em>Min</em>
                      <strong>{series.minLabel}</strong>
                    </span>
                    <span>
                      <em>Max</em>
                      <strong>{series.maxLabel}</strong>
                    </span>
                    <span>
                      <em>Average</em>
                      <strong>{series.avgLabel}</strong>
                    </span>
                  </div>
                  <Sparkline points={numericPoints} />
                </>
              ) : showDateTimeline ? (
                <DateTimeline occurrences={item.occurrences} />
              ) : null}
              {showOccurrenceList ? <OccurrenceList occurrences={item.occurrences} /> : null}
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function LiveHealthExViewer(props: LiveHealthExViewerProps) {
  return (
    <RecordSelectionProvider>
      <LiveHealthExViewerInner {...props} />
    </RecordSelectionProvider>
  );
}

function LiveHealthExViewerInner({ fallbackSummary }: LiveHealthExViewerProps) {
  const selection = useRecordSelection();
  const [token, setToken] = useState("");
  const [personId, setPersonId] = useState("");
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });
  const [selectedTabId, setSelectedTabId] = useState<ClinicalTabId | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [tabSearch, setTabSearch] = useState<Record<string, string>>({});
  const [showSource, setShowSource] = useState(false);

  const activeSummary = fetchState.status === "success" ? fetchState.summary : fallbackSummary;
  const isLiveSummary = fetchState.status === "success";
  const derivedPersonId = useMemo(() => decodeJwtSub(token), [token]);
  const activeTabId =
    activeSummary?.tabs.find((tab) => tab.id === selectedTabId)?.id ??
    activeSummary?.tabs.find((tab) => tab.hasData)?.id ??
    activeSummary?.tabs[0]?.id ??
    null;
  const activeTab = activeSummary?.tabs.find((tab) => tab.id === activeTabId) ?? activeSummary?.tabs[0] ?? null;
  const activeTabKey = `${activeSummary?.lastPulledLabel ?? "empty"}:${activeTabId ?? "none"}`;
  const searchValue = tabSearch[activeTabKey] ?? "";
  const filteredItems = activeTab ? filterClinicalItems(activeTab.items, searchValue) : [];

  async function handleFetch() {
    const authToken = token.trim();
    const resolvedPersonId = personId.trim() || derivedPersonId;

    if (!authToken) {
      setFetchState({
        status: "error",
        message: "Paste a current HealthEx patient token before loading live data.",
      });
      return;
    }

    if (!resolvedPersonId) {
      setFetchState({
        status: "error",
        message: "Enter a Person ID or use a token whose JWT payload includes sub.",
      });
      return;
    }

    setFetchState({ status: "loading" });

    try {
      const { bundle, remoteTotal } = await fetchAllPages(resolvedPersonId, authToken);
      const summary = buildSummaryFromBundle(bundle, {
        lastPulledLabel: `Live pull (${remoteTotal || bundle.entry?.length || 0} entries)`,
        sourceFile: "Live browser fetch",
      });

      setFetchState({
        status: "success",
        summary,
      });
    } catch (error) {
      setFetchState({
        status: "error",
        message: error instanceof Error ? error.message : "Live HealthEx fetch failed.",
      });
    }
  }

  function toggleItem(itemKey: string) {
    setExpandedItems((current) => ({
      ...current,
      [itemKey]: !current[itemKey],
    }));
  }

  function setTabSearchValue(tabKey: string, value: string) {
    setTabSearch((current) => ({
      ...current,
      [tabKey]: value,
    }));
  }

  function renderTabButton(tab: ClinicalTab) {
    return (
      <button
        key={tab.id}
        type="button"
        className={`clinical-tab-button ${activeTabId === tab.id ? "clinical-tab-button-active" : ""}`}
        onClick={() => setSelectedTabId(tab.id)}
      >
        <span>{tab.label}</span>
        <strong>{tab.totalCount}</strong>
      </button>
    );
  }

  const fetchDisabled = fetchState.status === "loading";
  const fetchLabel = fetchState.status === "loading" ? "Loading..." : "Refresh bundle";

  return (
    <>
      <section className={`source-bar ${showSource ? "source-bar-open" : ""}`}>
        <div className="source-bar-head">
          <div className="source-bar-copy">
            <span className="source-bar-title">HealthEx bundle</span>
            <span className="source-bar-meta">
              {fetchState.status === "success"
                ? "Showing the latest live pull."
                : fetchState.status === "loading"
                  ? "Fetching the live bundle..."
                  : fetchState.status === "error"
                    ? "Last fetch failed."
                    : activeSummary
                      ? "Showing the local fallback snapshot."
                      : "No bundle loaded yet."}
            </span>
          </div>
          <div className="source-bar-actions">
            <button
              type="button"
              className="source-bar-link"
              onClick={() => setShowSource((current) => !current)}
              aria-expanded={showSource}
            >
              {showSource ? "Hide source" : "Configure source"}
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleFetch}
              disabled={fetchDisabled}
            >
              {fetchLabel}
            </button>
          </div>
        </div>

        {showSource ? (
          <div className="source-bar-body">
            <label className="field-group">
              <span>Patient token</span>
              <textarea
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste the current bearer token"
                rows={3}
              />
            </label>

            <div className="source-bar-side">
              <label className="field-group">
                <span>Person ID</span>
                <input
                  value={personId}
                  onChange={(event) => setPersonId(event.target.value)}
                  placeholder={derivedPersonId ?? "Auto-fills from token sub"}
                />
              </label>
              <div className="derived-hint">
                <span>From token</span>
                <strong>{derivedPersonId ?? "Unavailable until the token parses"}</strong>
              </div>
            </div>
          </div>
        ) : null}

        {fetchState.status === "error" ? (
          <p className="status-message error-message">{fetchState.message}</p>
        ) : null}
      </section>

      {activeSummary ? (
        <section className="review-shell">
          <StreamingChartSummary summary={activeSummary} useLiveSummary={isLiveSummary} />

          <div className="clinical-tabs-bar clinical-tabs-bar-compact">
            {activeSummary.tabs.map(renderTabButton)}
          </div>

          {activeTab ? (
            <section className="clinical-review-panel">
              <div className="tab-search">
                <input
                  value={searchValue}
                  onChange={(event) => setTabSearchValue(activeTabKey, event.target.value)}
                  placeholder={activeTab.searchPlaceholder}
                  aria-label={activeTab.searchPlaceholder}
                />
              </div>

              {activeTab.items.length === 0 ? (
                <p className="empty-state tab-empty">{activeTab.emptyHint}</p>
              ) : filteredItems.length === 0 ? (
                <p className="empty-state tab-empty">No matches for that search.</p>
              ) : (
                <>
                  {selection.pinnedCount === 0 ? (
                    <p className="tab-pin-hint">
                      Double-click a record to pin it to the chart conversation.
                    </p>
                  ) : null}
                  <ul className="item-list">
                    {filteredItems.map((item, index) => {
                      const itemKey = `${activeTabKey}:${item.label}:${index}`;
                      const pinKey = selectionKey(activeTab.id, item);
                      const pinned = selection.isPinned(pinKey);

                      return renderItem(item, itemKey, {
                        expanded: Boolean(expandedItems[itemKey]),
                        isPinned: pinned,
                        onToggle: () => toggleItem(itemKey),
                        onTogglePin: () => selection.togglePin(item, activeTab.id, activeTab.label),
                        tabId: activeTab.id,
                      });
                    })}
                  </ul>
                </>
              )}
            </section>
          ) : null}
        </section>
      ) : (
        <section className="review-shell review-shell-empty">
          <p className="review-empty-copy">
            Load a live browser pull to render the summary and review workspace. If a local snapshot
            becomes available later, it will appear here as fallback context.
          </p>
        </section>
      )}
    </>
  );
}
