import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const options = {
    count: "50",
    allPages: true,
  };

  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      continue;
    }

    const [rawKey, rawValue] = arg.slice(2).split("=", 2);
    const value = rawValue ?? "true";

    switch (rawKey) {
      case "count":
        options.count = value;
        break;
      case "types":
        options.types = value;
        break;
      case "since":
        options.since = value;
        break;
      case "person-id":
        options.personId = value;
        break;
      case "output":
        options.output = value;
        break;
      case "all-pages":
        options.allPages = value !== "false";
        break;
      case "first-page-only":
        options.allPages = false;
        break;
      default:
        throw new Error(`Unknown option: --${rawKey}`);
    }
  }

  return options;
}

function decodeJwtPayload(token) {
  const [, payload] = token.split(".");

  if (!payload) {
    throw new Error("Expected a JWT with three dot-delimited parts.");
  }

  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

function getRequiredToken() {
  const token = process.env.HEALTHEX_ACCESS_TOKEN;

  if (!token) {
    throw new Error(
      "Missing auth token. Set HEALTHEX_ACCESS_TOKEN before running this script.",
    );
  }

  return token;
}

function resolvePersonId(options, token) {
  if (options.personId) {
    return options.personId;
  }

  if (process.env.HEALTHEX_PERSON_ID) {
    return process.env.HEALTHEX_PERSON_ID;
  }

  if (process.env.HEALTHEX_PATIENT_ID) {
    return process.env.HEALTHEX_PATIENT_ID;
  }

  const payload = decodeJwtPayload(token);

  if (!payload.sub) {
    throw new Error("Could not derive a person ID from the JWT payload.");
  }

  return payload.sub;
}

function buildEverythingUrl(baseUrl, personId, options) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const url = new URL(`${normalizedBaseUrl}/Person/${personId}/$everything`);

  if (options.count) {
    url.searchParams.set("_count", options.count);
  }

  if (options.types) {
    url.searchParams.set("_type", options.types);
  }

  if (options.since) {
    url.searchParams.set("_since", options.since);
  }

  return url;
}

async function fetchBundle(url, token) {
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

  return JSON.parse(text);
}

function mergeBundles(bundles) {
  const firstBundle = bundles[0];

  if (!firstBundle) {
    throw new Error("No bundles were fetched.");
  }

  const seen = new Set();
  const mergedEntries = [];

  for (const bundle of bundles) {
    for (const entry of bundle.entry ?? []) {
      const key =
        entry.fullUrl ??
        `${entry.resource?.resourceType ?? "Unknown"}/${entry.resource?.id ?? mergedEntries.length}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      mergedEntries.push(entry);
    }
  }

  return {
    ...firstBundle,
    entry: mergedEntries,
    total: mergedEntries.length,
    link: firstBundle.link ?? [],
  };
}

function resourceCounts(bundle) {
  const counts = new Map();

  for (const entry of bundle.entry ?? []) {
    const type = entry.resource?.resourceType ?? "Unknown";
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }

  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

async function writeBundle(bundle, personId, options) {
  const outputPath =
    options.output ??
    path.join(
      process.cwd(),
      "tmp",
      "healthex-fhir",
      `${personId}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
    );

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  return outputPath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const token = getRequiredToken();
  const personId = resolvePersonId(options, token);
  const payload = decodeJwtPayload(token);
  const baseUrl = process.env.HEALTHEX_FHIR_BASE_URL || "https://api.healthex.io/FHIR/R4";
  const initialUrl = buildEverythingUrl(baseUrl, personId, options);

  const bundles = [];
  let nextUrl = initialUrl;
  let pageCount = 0;
  let remoteTotal = 0;

  while (nextUrl) {
    const bundle = await fetchBundle(nextUrl, token);
    bundles.push(bundle);
    pageCount += 1;
    remoteTotal = Math.max(remoteTotal, Number(bundle.total ?? 0));

    if (!options.allPages) {
      break;
    }

    const nextLink = bundle.link?.find((link) => link.relation === "next")?.url;
    nextUrl = nextLink ? new URL(nextLink) : null;
  }

  const merged = mergeBundles(bundles);
  const outputPath = await writeBundle(merged, personId, options);

  console.log("HealthEx pull succeeded.");
  console.log(`Person ID: ${personId}`);
  console.log(`Token type: ${payload.type ?? "unknown"}`);
  console.log(`Pages fetched: ${pageCount}`);
  console.log(`Server-reported total: ${remoteTotal || "unknown"}`);
  console.log(`Entries saved: ${merged.entry?.length ?? 0}`);
  console.log(`Resource counts: ${JSON.stringify(resourceCounts(merged), null, 2)}`);
  console.log(`Saved bundle: ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
