import { LiveHealthExViewer } from "@/components/live-healthex-viewer";
import { loadLocalHealthExSummary } from "@/lib/local-healthex-bundle";

export default async function HomePage() {
  const summary = await loadLocalHealthExSummary();

  if (!summary) {
    return (
      <main className="app-shell">
        <LiveHealthExViewer fallbackSummary={null} />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <LiveHealthExViewer fallbackSummary={summary} />
    </main>
  );
}
