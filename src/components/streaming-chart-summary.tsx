"use client";

import { useEffect, useMemo, useState } from "react";

import type { HealthExSummary } from "@/lib/healthex-summary";

type StreamingChartSummaryProps = {
  summary: HealthExSummary | null;
  useLiveSummary: boolean;
};

type SummaryStatus = "idle" | "loading" | "streaming" | "done" | "error";

function buildSummaryPayload(summary: HealthExSummary) {
  return {
    binaryCount: summary.binaryCount,
    documentHeavy: summary.documentHeavy,
    lastPulledLabel: summary.lastPulledLabel,
    notes: summary.notes,
    patientName: summary.patientName,
    sourceFile: summary.sourceFile,
    supportedResourceTotal: summary.supportedResourceTotal,
    tabs: summary.tabs.map((tab) => ({
      items: tab.items.slice(0, 8).map((item) => ({
        description: item.description,
        label: item.label,
        metadata: item.metadata,
        occurrenceCount: item.occurrenceCount,
        presentation: item.presentation,
      })),
      label: tab.label,
      totalCount: tab.totalCount,
    })),
  };
}

export function StreamingChartSummary({
  summary,
  useLiveSummary,
}: StreamingChartSummaryProps) {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<SummaryStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const displayStatus = useLiveSummary ? status : "idle";

  const requestBody = useMemo(() => {
    if (!summary || !useLiveSummary) {
      return null;
    }

    return JSON.stringify({ summary: buildSummaryPayload(summary) });
  }, [summary, useLiveSummary]);

  useEffect(() => {
    if (!summary || !useLiveSummary) {
      return;
    }

    if (!requestBody) {
      return;
    }

    const controller = new AbortController();

    async function streamSummary() {
      setContent("");
      setError(null);
      setStatus("loading");

      try {
        const response = await fetch("/api/chart-summary", {
          body: requestBody,
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
          signal: controller.signal,
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Chart summary failed to start.");
        }

        if (!response.body) {
          throw new Error("Chart summary stream was unavailable.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });

          if (!chunk) {
            continue;
          }

          setStatus("streaming");
          setContent((previous) => previous + chunk);
        }

        setStatus("done");
      } catch (streamError) {
        if (controller.signal.aborted) {
          return;
        }

        setStatus("error");
        setError(
          streamError instanceof Error ? streamError.message : "Chart summary streaming failed.",
        );
      }
    }

    void streamSummary();

    return () => controller.abort();
  }, [requestBody, summary, useLiveSummary]);

  return (
    <section className="summary-stream-card">
      <div className="summary-stream-header">
        <div>
          <h2 className="summary-stream-title">Chart summary</h2>
        </div>
        <span className={`summary-stream-status summary-stream-status-${displayStatus}`}>
          {displayStatus === "idle" && !useLiveSummary
            ? "Waiting for live bundle"
            : displayStatus === "done"
              ? "Ready"
              : displayStatus}
        </span>
      </div>

      {useLiveSummary ? (
        content ? (
          <p className="summary-stream-copy">{content}</p>
        ) : (
          <p className="summary-stream-placeholder">
            {status === "loading" || status === "streaming"
              ? "Building a concise reviewer summary from the live bundle..."
              : "A fresh review summary will appear here after the next live bundle load."}
          </p>
        )
      ) : (
        <p className="summary-stream-placeholder">
          Load a live HealthEx bundle to generate the streamed review summary. Local fallback data
          can still be reviewed below, but it does not trigger the AI summary.
        </p>
      )}

      {error ? <p className="status-message error-message">{error}</p> : null}
    </section>
  );
}
