"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { HealthExSummary } from "@/lib/healthex-summary";
import { useRecordSelection, type SerializedSelection } from "@/lib/record-selection";

type StreamingChartSummaryProps = {
  summary: HealthExSummary | null;
  useLiveSummary: boolean;
};

type MessageStatus = "streaming" | "done" | "error";

type ChatMessage = {
  content: string;
  id: string;
  kind: "summary" | "reply";
  pinsSnapshot?: SerializedSelection[];
  role: "assistant" | "user";
  status: MessageStatus;
};

type ThreadStatus = "idle" | "loading" | "streaming" | "done" | "error";

function createMessageId() {
  return `msg-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

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
  const { clear: clearPins, pinnedCount, selections, unpin } = useRecordSelection();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadStatus, setThreadStatus] = useState<ThreadStatus>("idle");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);

  const summaryPayload = useMemo(() => {
    if (!summary || !useLiveSummary) {
      return null;
    }

    return buildSummaryPayload(summary);
  }, [summary, useLiveSummary]);

  const replaceMessage = useCallback(
    (id: string, update: (previous: ChatMessage) => ChatMessage) => {
      setMessages((current) =>
        current.map((message) => (message.id === id ? update(message) : message)),
      );
    },
    [],
  );

  // Stream the opening chart summary whenever the live bundle changes.
  useEffect(() => {
    if (!useLiveSummary || !summaryPayload) {
      return;
    }

    const summaryMessage: ChatMessage = {
      content: "",
      id: createMessageId(),
      kind: "summary",
      role: "assistant",
      status: "streaming",
    };

    const controller = new AbortController();

    async function streamOpeningSummary() {
      setMessages([summaryMessage]);
      setThreadStatus("loading");
      setError(null);

      try {
        const response = await fetch("/api/chart-summary", {
          body: JSON.stringify({ summary: summaryPayload }),
          headers: { "Content-Type": "application/json" },
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

          setThreadStatus("streaming");
          replaceMessage(summaryMessage.id, (previous) => ({
            ...previous,
            content: previous.content + chunk,
          }));
        }

        replaceMessage(summaryMessage.id, (previous) => ({ ...previous, status: "done" }));
        setThreadStatus("done");
      } catch (streamError) {
        if (controller.signal.aborted) {
          return;
        }

        setThreadStatus("error");
        setError(
          streamError instanceof Error ? streamError.message : "Chart summary streaming failed.",
        );
        replaceMessage(summaryMessage.id, (previous) => ({ ...previous, status: "error" }));
      }
    }

    void streamOpeningSummary();
    return () => controller.abort();
  }, [replaceMessage, summaryPayload, useLiveSummary]);

  const canSend = useMemo(
    () =>
      useLiveSummary &&
      input.trim().length > 0 &&
      threadStatus !== "loading" &&
      threadStatus !== "streaming",
    [input, threadStatus, useLiveSummary],
  );

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, threadStatus]);

  async function handleSend() {
    if (!canSend) {
      return;
    }

    const question = input.trim();
    const pinsSnapshot: SerializedSelection[] = selections.map((selection) => ({ ...selection }));
    const userMessage: ChatMessage = {
      content: question,
      id: createMessageId(),
      kind: "reply",
      pinsSnapshot,
      role: "user",
      status: "done",
    };
    const assistantMessage: ChatMessage = {
      content: "",
      id: createMessageId(),
      kind: "reply",
      role: "assistant",
      status: "streaming",
    };

    const historyBeforeSend: ChatMessage[] = messages;

    setMessages([...historyBeforeSend, userMessage, assistantMessage]);
    setInput("");
    setThreadStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/record-chat", {
        body: JSON.stringify({
          history: historyBeforeSend
            .filter((message) => message.content.trim().length > 0)
            .map((message) => ({ role: message.role, content: message.content })),
          selections: pinsSnapshot,
          userMessage: question,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Record chat failed.");
      }

      if (!response.body) {
        throw new Error("Record chat stream was unavailable.");
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

        setThreadStatus("streaming");
        replaceMessage(assistantMessage.id, (previous) => ({
          ...previous,
          content: previous.content + chunk,
        }));
      }

      replaceMessage(assistantMessage.id, (previous) => ({ ...previous, status: "done" }));
      setThreadStatus("done");
    } catch (streamError) {
      setThreadStatus("error");
      setError(
        streamError instanceof Error ? streamError.message : "Record chat streaming failed.",
      );
      replaceMessage(assistantMessage.id, (previous) => ({ ...previous, status: "error" }));
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && canSend) {
      event.preventDefault();
      void handleSend();
    }
  }

  function handleClearThread() {
    setMessages((current) => current.filter((message) => message.kind === "summary"));
    setThreadStatus((current) => (current === "error" ? "idle" : current));
    setError(null);
  }

  const hasFollowUps = messages.some((message) => message.kind === "reply");
  const displayStatus: ThreadStatus = useLiveSummary ? threadStatus : "idle";

  return (
    <section className="summary-stream-card">
      <div className="summary-stream-header">
        <div>
          <h2 className="summary-stream-title">Chart conversation</h2>
          <p className="summary-stream-subtitle">
            Streamed opening summary, then ask follow-ups. Double-click any record to pin it here.
          </p>
        </div>
        <div className="summary-stream-header-actions">
          <span className={`summary-stream-status summary-stream-status-${displayStatus}`}>
            {displayStatus === "idle" && !useLiveSummary
              ? "Waiting for live bundle"
              : displayStatus === "done"
                ? "Ready"
                : displayStatus}
          </span>
          {useLiveSummary ? (
            <div className="summary-stream-header-links">
              <button
                type="button"
                className="summary-stream-link"
                onClick={handleClearThread}
                disabled={!hasFollowUps}
              >
                Clear follow-ups
              </button>
              <button
                type="button"
                className="summary-stream-link"
                onClick={clearPins}
                disabled={pinnedCount === 0}
              >
                Unpin all ({pinnedCount})
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {useLiveSummary ? (
        <>
          <div className="summary-stream-thread" ref={threadRef}>
            {messages.length === 0 ? (
              <p className="summary-stream-placeholder">
                Building a concise reviewer summary from the live bundle...
              </p>
            ) : (
              messages.map((message) => (
                <ChatBubble key={message.id} message={message} onUnpin={unpin} />
              ))
            )}
          </div>

          {pinnedCount > 0 ? (
            <div className="summary-stream-pending-pins" aria-label="Records pinned for next message">
              <span className="summary-stream-pending-pins-label">
                Pinned for next message ({pinnedCount})
              </span>
              <ul>
                {selections.map((selection) => (
                  <li key={selection.key}>
                    <span>{selection.label}</span>
                    <button
                      type="button"
                      onClick={() => unpin(selection.key)}
                      aria-label={`Unpin ${selection.label}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="summary-stream-compose">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                pinnedCount > 0
                  ? "Ask about the chart or the pinned records. Cmd/Ctrl+Enter to send."
                  : "Ask a follow-up question. Double-click a record below to add it as context."
              }
              rows={2}
            />
            <button
              type="button"
              className="summary-stream-send"
              onClick={() => void handleSend()}
              disabled={!canSend}
              aria-label={
                threadStatus === "loading" || threadStatus === "streaming"
                  ? "Sending"
                  : "Send message"
              }
              title="Send (Cmd/Ctrl+Enter)"
            >
              {threadStatus === "loading" || threadStatus === "streaming" ? (
                <span className="summary-stream-send-spinner" aria-hidden="true" />
              ) : (
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10 15.5V4.5" />
                  <path d="M5 9.5l5-5 5 5" />
                </svg>
              )}
            </button>
          </div>
        </>
      ) : (
        <p className="summary-stream-placeholder">
          Load a live HealthEx bundle to generate the streamed review summary. Local fallback data
          can still be reviewed below, but it does not trigger the AI conversation.
        </p>
      )}

      {error ? <p className="status-message error-message summary-stream-error">{error}</p> : null}
    </section>
  );
}

function ChatBubble({
  message,
  onUnpin,
}: {
  message: ChatMessage;
  onUnpin: (key: string) => void;
}) {
  const isUser = message.role === "user";
  const showPlaceholder = message.status === "streaming" && message.content.length === 0;

  return (
    <div className={`summary-stream-message summary-stream-message-${isUser ? "user" : "assistant"}`}>
      <span className="summary-stream-message-role">
        {isUser ? "You" : message.kind === "summary" ? "Chart summary" : "Assistant"}
      </span>
      {message.pinsSnapshot && message.pinsSnapshot.length > 0 ? (
        <ul className="summary-stream-message-pins">
          {message.pinsSnapshot.map((pin) => (
            <li key={pin.key}>
              <span>{pin.label}</span>
              {isUser ? (
                <button
                  type="button"
                  onClick={() => onUnpin(pin.key)}
                  aria-label={`Unpin ${pin.label}`}
                  title="Unpin (affects future messages only)"
                >
                  ×
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="summary-stream-message-body">
        {showPlaceholder ? "…" : message.content}
      </p>
    </div>
  );
}
