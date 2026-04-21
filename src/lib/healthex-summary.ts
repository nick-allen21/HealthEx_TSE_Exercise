export const SUPPORTED_TYPES = [
  "Observation",
  "MedicationRequest",
  "Condition",
  "AllergyIntolerance",
  "Immunization",
  "DocumentReference",
] as const;

export type SupportedType = (typeof SUPPORTED_TYPES)[number];
export type SectionStatus = "lead" | "available" | "empty";

export const SUPPORTED_TYPE_LABELS: Record<SupportedType, string> = {
  Observation: "Observations",
  MedicationRequest: "Medications",
  Condition: "Conditions",
  AllergyIntolerance: "Allergies",
  Immunization: "Immunizations",
  DocumentReference: "Documents",
};

type Coding = {
  code?: string;
  display?: string;
  system?: string;
};

type CodeableConcept = {
  coding?: Coding[];
  text?: string;
};

type FhirReference = {
  display?: string;
  reference?: string;
};

export type FhirResource = {
  resourceType?: string;
  id?: string;
  birthDate?: string;
  gender?: string;
  name?: Array<{
    family?: string;
    given?: string[];
  }>;
  clinicalStatus?: { coding?: Coding[] };
  verificationStatus?: { coding?: Coding[] };
  status?: string;
  code?: CodeableConcept;
  patient?: FhirReference;
  subject?: FhirReference;
  medicationCodeableConcept?: CodeableConcept;
  medicationReference?: FhirReference;
  authoredOn?: string;
  effectiveDateTime?: string;
  issued?: string;
  onsetDateTime?: string;
  onsetPeriod?: { start?: string; end?: string };
  recordedDate?: string;
  occurrenceDateTime?: string;
  vaccineCode?: CodeableConcept;
  type?: CodeableConcept;
  date?: string;
  contentType?: string;
  meta?: { source?: string };
};

export type BundleEntry = {
  resource?: FhirResource;
};

export type FhirBundle = {
  entry?: BundleEntry[];
  total?: number;
};

export type ClinicalSection = {
  count: number;
  emptyMessage: string;
  guidance?: string;
  items: Array<{
    description?: string;
    label: string;
    metadata: string[];
  }>;
  status: SectionStatus;
  title: string;
  type: SupportedType;
};

export type HealthExSummary = {
  binaryCount: number;
  documentHeavy: boolean;
  lastPulledLabel: string;
  leadTypes: SupportedType[];
  notes: string[];
  patientName: string;
  resourceCounts: Record<string, number>;
  sections: ClinicalSection[];
  sourceFile: string | null;
  supportedResourceTotal: number;
};

export function formatDisplayDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function pickCodeText(concept?: CodeableConcept) {
  return concept?.text ?? concept?.coding?.find((coding) => coding.display)?.display ?? "Unknown";
}

function pickCodingLabel(codings?: Coding[]) {
  return codings?.find((coding) => coding.display)?.display;
}

function pickPatientName(resources: FhirResource[]) {
  const personOrPatient = resources.find(
    (resource) => resource.resourceType === "Person" || resource.resourceType === "Patient",
  );

  const firstName = personOrPatient?.name?.[0];
  const fullName = [firstName?.given?.join(" "), firstName?.family].filter(Boolean).join(" ");

  return fullName || "HealthEx patient";
}

function buildObservationLabel(resource: FhirResource) {
  const valueQuantity = (resource as FhirResource & { valueQuantity?: { unit?: string; value?: number | string } })
    .valueQuantity;
  const valueString = (resource as FhirResource & { valueString?: string }).valueString;
  const valueCodeableConcept = (
    resource as FhirResource & { valueCodeableConcept?: CodeableConcept }
  ).valueCodeableConcept;

  if (valueQuantity?.value !== undefined) {
    return `${valueQuantity.value}${valueQuantity.unit ? ` ${valueQuantity.unit}` : ""}`;
  }

  if (valueString) {
    return valueString;
  }

  if (valueCodeableConcept) {
    return pickCodeText(valueCodeableConcept);
  }

  return "Result available";
}

function buildSectionStatus(type: SupportedType, resourceCounts: Record<string, number>, leadTypes: SupportedType[]) {
  const count = resourceCounts[type] ?? 0;

  if (count === 0) {
    return "empty" satisfies SectionStatus;
  }

  if (leadTypes.includes(type)) {
    return "lead" satisfies SectionStatus;
  }

  return "available" satisfies SectionStatus;
}

function buildSectionGuidance(
  type: SupportedType,
  status: SectionStatus,
  resourceCounts: Record<string, number>,
  binaryCount: number,
) {
  if (status === "lead") {
    return "This is currently one of the strongest structured sections in the saved bundle.";
  }

  if (status === "available") {
    return undefined;
  }

  if (type === "DocumentReference" && binaryCount > 0) {
    return "This saved snapshot contains Binary attachments, but no structured DocumentReference resources.";
  }

  if (type === "Immunization") {
    return "Immunization availability is still an open validation item and may require a fresh live browser pull.";
  }

  if ((resourceCounts[type] ?? 0) === 0) {
    return "No resources of this supported type were returned in the current bundle.";
  }

  return undefined;
}

function buildSection(
  type: SupportedType,
  resources: FhirResource[],
  resourceCounts: Record<string, number>,
  leadTypes: SupportedType[],
  binaryCount: number,
): ClinicalSection {
  const sectionResources = resources.filter((resource) => resource.resourceType === type);
  const status = buildSectionStatus(type, resourceCounts, leadTypes);
  const count = sectionResources.length;
  const guidance = buildSectionGuidance(type, status, resourceCounts, binaryCount);

  if (type === "AllergyIntolerance") {
    return {
      count,
      type,
      status,
      title: "Allergies",
      emptyMessage: "No allergy records were found in the current HealthEx bundle.",
      guidance,
      items: sectionResources.map((resource) => ({
        label: pickCodeText(resource.code),
        description: resource.patient?.display ?? resource.subject?.display,
        metadata: [
          pickCodingLabel(resource.clinicalStatus?.coding),
          pickCodingLabel(resource.verificationStatus?.coding),
          formatDisplayDate(resource.recordedDate),
        ].filter(Boolean) as string[],
      })),
    };
  }

  if (type === "Condition") {
    return {
      count,
      type,
      status,
      title: "Conditions",
      emptyMessage: "No structured condition resources were found in the current HealthEx bundle.",
      guidance,
      items: sectionResources.map((resource) => ({
        label: pickCodeText(resource.code),
        description: resource.subject?.display,
        metadata: [
          pickCodingLabel(resource.clinicalStatus?.coding),
          formatDisplayDate(resource.onsetDateTime ?? resource.onsetPeriod?.start),
        ].filter(Boolean) as string[],
      })),
    };
  }

  if (type === "MedicationRequest") {
    return {
      count,
      type,
      status,
      title: "Medications",
      emptyMessage: "No medication requests were found in the current HealthEx bundle.",
      guidance,
      items: sectionResources.map((resource) => ({
        label: resource.medicationCodeableConcept
          ? pickCodeText(resource.medicationCodeableConcept)
          : resource.medicationReference?.display ?? "Medication",
        description: resource.subject?.display,
        metadata: [resource.status, formatDisplayDate(resource.authoredOn)].filter(Boolean) as string[],
      })),
    };
  }

  if (type === "Observation") {
    return {
      count,
      type,
      status,
      title: "Observations",
      emptyMessage: "No structured observations were found in the current HealthEx bundle.",
      guidance,
      items: sectionResources.map((resource) => ({
        label: pickCodeText(resource.code),
        description: buildObservationLabel(resource),
        metadata: [formatDisplayDate(resource.effectiveDateTime ?? resource.issued)].filter(Boolean) as string[],
      })),
    };
  }

  if (type === "Immunization") {
    return {
      count,
      type,
      status,
      title: "Immunizations",
      emptyMessage: "No immunization resources are currently available in the current HealthEx bundle.",
      guidance,
      items: sectionResources.map((resource) => ({
        label: pickCodeText(resource.vaccineCode),
        description: resource.patient?.display ?? resource.subject?.display,
        metadata: [resource.status, formatDisplayDate(resource.occurrenceDateTime)].filter(Boolean) as string[],
      })),
    };
  }

  return {
    count,
    type,
    status,
    title: "Documents",
    emptyMessage: "No document references were found in the current HealthEx bundle.",
    guidance,
    items: sectionResources.map((resource) => ({
      label: pickCodeText(resource.type),
      description: resource.subject?.display,
      metadata: [resource.status, formatDisplayDate(resource.date)].filter(Boolean) as string[],
    })),
  };
}

function pickLeadTypes(resourceCounts: Record<string, number>) {
  return [...SUPPORTED_TYPES]
    .filter((type) => (resourceCounts[type] ?? 0) > 0)
    .sort((left, right) => {
      const countDelta = (resourceCounts[right] ?? 0) - (resourceCounts[left] ?? 0);

      if (countDelta !== 0) {
        return countDelta;
      }

      return SUPPORTED_TYPES.indexOf(left) - SUPPORTED_TYPES.indexOf(right);
    })
    .slice(0, 2);
}

function buildSummaryNotes(
  leadTypes: SupportedType[],
  resourceCounts: Record<string, number>,
  supportedResourceTotal: number,
  binaryCount: number,
) {
  const notes: string[] = [];

  if (leadTypes.length === 0) {
    notes.push(
      "The current snapshot does not yet contain any supported structured resource types, so a fresh live browser pull is still needed.",
    );
  } else if (leadTypes.length === 1) {
    notes.push(
      `The current saved snapshot only validates one clearly usable structured section: ${SUPPORTED_TYPE_LABELS[leadTypes[0]]}.`,
    );
  } else {
    notes.push(
      `The current lead sections are ${leadTypes.map((type) => SUPPORTED_TYPE_LABELS[type]).join(" and ")}.`,
    );
  }

  if (binaryCount > supportedResourceTotal) {
    notes.push(
      "Binary attachments currently outnumber supported structured resources, so this bundle is still document-heavy.",
    );
  }

  if ((resourceCounts.Immunization ?? 0) === 0) {
    notes.push("Immunization data is still unvalidated in the saved snapshot.");
  }

  return notes;
}

function sortSections(left: ClinicalSection, right: ClinicalSection) {
  const statusWeight: Record<SectionStatus, number> = {
    lead: 0,
    available: 1,
    empty: 2,
  };

  const statusDelta = statusWeight[left.status] - statusWeight[right.status];

  if (statusDelta !== 0) {
    return statusDelta;
  }

  const countDelta = right.count - left.count;

  if (countDelta !== 0) {
    return countDelta;
  }

  return SUPPORTED_TYPES.indexOf(left.type) - SUPPORTED_TYPES.indexOf(right.type);
}

export function buildSummaryFromBundle(
  bundle: FhirBundle,
  options?: { sourceFile?: string | null; lastPulledLabel?: string },
) {
  const resources = (bundle.entry ?? [])
    .map((entry) => entry.resource)
    .filter((resource): resource is FhirResource => Boolean(resource));

  const resourceCounts = resources.reduce<Record<string, number>>((counts, resource) => {
    const type = resource.resourceType ?? "Unknown";
    counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {});
  const binaryCount = resourceCounts.Binary ?? 0;
  const supportedResourceTotal = SUPPORTED_TYPES.reduce(
    (total, type) => total + (resourceCounts[type] ?? 0),
    0,
  );
  const leadTypes = pickLeadTypes(resourceCounts);
  const notes = buildSummaryNotes(leadTypes, resourceCounts, supportedResourceTotal, binaryCount);
  const sections = SUPPORTED_TYPES.map((type) =>
    buildSection(type, resources, resourceCounts, leadTypes, binaryCount),
  ).sort(sortSections);

  return {
    binaryCount,
    documentHeavy: binaryCount > supportedResourceTotal,
    lastPulledLabel: options?.lastPulledLabel ?? "Recently",
    leadTypes,
    notes,
    patientName: pickPatientName(resources),
    resourceCounts,
    sections,
    sourceFile: options?.sourceFile ?? null,
    supportedResourceTotal,
  } satisfies HealthExSummary;
}

export function decodeJwtSub(token: string) {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const decoded =
      typeof window === "undefined"
        ? Buffer.from(padded, "base64").toString("utf8")
        : window.atob(padded);
    const parsed = JSON.parse(decoded) as { sub?: string };
    return parsed.sub ?? null;
  } catch {
    return null;
  }
}
