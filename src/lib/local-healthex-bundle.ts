import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { buildSummaryFromBundle, formatDisplayDate, type FhirBundle, type HealthExSummary } from "@/lib/healthex-summary";

async function getLatestBundlePath() {
  const bundleDirectory = path.join(process.cwd(), "tmp", "healthex-fhir");
  let directoryEntries;

  try {
    directoryEntries = await readdir(bundleDirectory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }

  const bundleFiles = directoryEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort()
    .reverse();

  if (bundleFiles.length === 0) {
    return null;
  }

  return path.join(bundleDirectory, bundleFiles[0]);
}

export async function loadLocalHealthExSummary(): Promise<HealthExSummary | null> {
  const bundlePath = await getLatestBundlePath();

  if (!bundlePath) {
    return null;
  }

  const bundleContent = await readFile(bundlePath, "utf8");
  const bundle = JSON.parse(bundleContent) as FhirBundle;
  const sourceFile = path.basename(bundlePath);
  const bundleStats = await stat(bundlePath);
  const lastPulledLabel =
    formatDisplayDate(bundleStats.mtime.toISOString()) ?? "Recently";

  return buildSummaryFromBundle(bundle, {
    lastPulledLabel,
    sourceFile,
  });
}
