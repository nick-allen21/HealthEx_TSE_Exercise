"use client";

import { useMemo, useState } from "react";

import {
  buildSummaryFromBundle,
  decodeJwtSub,
  type FhirBundle,
  type HealthExSummary,
  SUPPORTED_TYPE_LABELS,
} from "@/lib/healthex-summary";

type LiveHealthExViewerProps = {
  fallbackSummary: HealthExSummary | null;
};

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { message: string; status: "error" }
  | { status: "success"; summary: HealthExSummary };

const sectionStatusLabels = {
  lead: "Lead section",
  available: "Supporting section",
  empty: "Awaiting data",
} as const;

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

export function LiveHealthExViewer({ fallbackSummary }: LiveHealthExViewerProps) {
  const [token, setToken] = useState("");
  const [personId, setPersonId] = useState("");
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });

  const activeSummary =
    fetchState.status === "success" ? fetchState.summary : fallbackSummary;

  const derivedPersonId = useMemo(() => decodeJwtSub(token), [token]);

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

  return (
    <>
      <section className="live-card">
        <div className="live-card-header">
          <div>
            <p className="section-eyebrow">Live HealthEx Fetch</p>
            <h2 className="live-card-title">Browser-side patient pull</h2>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={handleFetch}
            disabled={fetchState.status === "loading"}
          >
            {fetchState.status === "loading" ? "Loading..." : "Load live bundle"}
          </button>
        </div>

        <p className="live-card-copy">
          Paste the current patient token from `app.healthex.io`. The viewer will
          derive the `Person` ID from the JWT `sub` if you leave the field blank,
          then fetch the full paginated `$everything` bundle directly in the
          browser.
        </p>

        <div className="live-form-grid">
          <label className="field-group">
            <span>HealthEx patient token</span>
            <textarea
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste the current bearer token here"
              rows={5}
            />
          </label>

          <div className="live-side-fields">
            <label className="field-group">
              <span>Person ID</span>
              <input
                value={personId}
                onChange={(event) => setPersonId(event.target.value)}
                placeholder={derivedPersonId ?? "Will auto-fill from token sub"}
              />
            </label>

            <div className="derived-hint">
              <span>Derived from token</span>
              <strong>{derivedPersonId ?? "Unavailable until the token parses"}</strong>
            </div>
          </div>
        </div>

        {fetchState.status === "error" ? (
          <p className="status-message error-message">{fetchState.message}</p>
        ) : null}

        {fetchState.status === "success" ? (
          <p className="status-message success-message">
            Live browser fetch succeeded. Rendering the live bundle below.
          </p>
        ) : null}
      </section>

      {activeSummary ? (
        <>
          <section className="hero-card">
            <div className="hero-band">
              <p className="hero-eyebrow">
                {fetchState.status === "success" ? "Live HealthEx Bundle" : "Local HealthEx Pull"}
              </p>
              <h1 className="hero-title">{activeSummary.patientName}</h1>
              <p className="hero-copy">
                This page groups the supported HealthEx FHIR resource types into
                simple sections and swaps automatically from the local snapshot to
                the live browser pull when one succeeds.
              </p>
            </div>

            <div className="hero-body summary-grid">
              <div className="hero-panel">
                <h2 className="hero-panel-title">Bundle snapshot</h2>
                <dl className="stats-list">
                  <div>
                    <dt>Supported resources</dt>
                    <dd>{activeSummary.supportedResourceTotal}</dd>
                  </div>
                  <div>
                    <dt>Lead sections available</dt>
                    <dd>{activeSummary.leadTypes.length}</dd>
                  </div>
                  <div>
                    <dt>Binary assets</dt>
                    <dd>{activeSummary.binaryCount}</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd className="stats-file">{activeSummary.sourceFile}</dd>
                  </div>
                </dl>
              </div>

              <div className="hero-panel">
                <h2 className="hero-panel-title">Phase 2 readout</h2>

                {activeSummary.leadTypes.length > 0 ? (
                  <ul className="pill-list">
                    {activeSummary.leadTypes.map((type) => (
                      <li key={type} className="pill-list-item">
                        <span>{SUPPORTED_TYPE_LABELS[type]}</span>
                        <strong>Lead</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pill-list-empty">No lead sections are available yet in this snapshot.</p>
                )}

                <ul className="hero-note-list">
                  {activeSummary.notes.map((note) => (
                    <li key={note} className="hero-note">
                      {note}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="hero-panel">
                <h2 className="hero-panel-title">Available supported FHIR types</h2>

                {Object.entries(activeSummary.resourceCounts).some(
                  ([type, count]) => Object.hasOwn(SUPPORTED_TYPE_LABELS, type) && count > 0,
                ) ? (
                  <ul className="pill-list">
                    {Object.entries(activeSummary.resourceCounts)
                      .filter(
                        ([type, count]) => Object.hasOwn(SUPPORTED_TYPE_LABELS, type) && count > 0,
                      )
                      .map(([type, count]) => (
                        <li key={type} className="pill-list-item">
                          <span>{SUPPORTED_TYPE_LABELS[type as keyof typeof SUPPORTED_TYPE_LABELS]}</span>
                          <strong>{count}</strong>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="pill-list-empty">
                    This snapshot does not currently include supported structured resources.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="section-grid">
            {activeSummary.sections.map((section) => (
              <article key={section.type} className="section-card">
                <div className="section-card-header">
                  <div>
                    <p className="section-eyebrow">{section.type}</p>
                    <h2>{section.title}</h2>
                  </div>
                  <div className="section-card-meta">
                    <span className={`section-status section-status-${section.status}`}>
                      {sectionStatusLabels[section.status]}
                    </span>
                    <span className="section-count">{section.count}</span>
                  </div>
                </div>

                {section.guidance ? <p className="section-guidance">{section.guidance}</p> : null}

                {section.items.length > 0 ? (
                  <ul className="resource-list">
                    {section.items.map((item, index) => (
                      <li key={`${section.type}-${index}`} className="resource-item">
                        <div className="resource-item-main">
                          <h3>{item.label}</h3>
                          {item.description ? <p>{item.description}</p> : null}
                        </div>
                        {item.metadata.length > 0 ? (
                          <ul className="resource-meta">
                            {item.metadata.map((value) => (
                              <li key={value}>{value}</li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-state">{section.emptyMessage}</p>
                )}
              </article>
            ))}
          </section>
        </>
      ) : null}
    </>
  );
}
