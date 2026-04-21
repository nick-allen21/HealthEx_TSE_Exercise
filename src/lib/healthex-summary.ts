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

export type ClinicalOccurrence = {
  categoryCode?: string;
  date?: string;
  dateLabel?: string;
  isPlaceholder?: boolean;
  note?: string;
  numericValue?: number;
  sortTime: number;
  unit?: string;
  valueLabel: string;
};

export type ClinicalItem = {
  description?: string;
  label: string;
  metadata: string[];
  occurrences: ClinicalOccurrence[];
  occurrenceCount?: number;
  presentation?: "event" | "rollup";
};

export type ClinicalTabId =
  | "conditions"
  | "medications"
  | "labs"
  | "vitals"
  | "immunizations";

export type ClinicalTab = {
  emptyHint: string;
  hasData: boolean;
  id: ClinicalTabId;
  items: ClinicalItem[];
  label: string;
  searchPlaceholder: string;
  totalCount: number;
};

export type ClinicalSection = {
  count: number;
  displayMode?: "events" | "rollup";
  emptyMessage: string;
  guidance?: string;
  items: ClinicalItem[];
  status: SectionStatus;
  summaryCaption?: string;
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
  tabs: ClinicalTab[];
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

function formatClinicalCode(concept?: CodeableConcept) {
  const coding = concept?.coding?.find((entry) => entry.code);

  if (!coding?.code) {
    return undefined;
  }

  if (coding.system?.toLowerCase().includes("snomed")) {
    return `SNOMED ${coding.code}`;
  }

  return coding.code;
}

function pickPatientName(resources: FhirResource[]) {
  const personOrPatient = resources.find(
    (resource) => resource.resourceType === "Person" || resource.resourceType === "Patient",
  );

  const firstName = personOrPatient?.name?.[0];
  const fullName = [firstName?.given?.join(" "), firstName?.family].filter(Boolean).join(" ");

  return fullName || "HealthEx patient";
}

const UCUM_DISPLAY: Record<string, string> = {
  "mm[hg]": "mmHg",
  "cel": "°C",
  "[degf]": "°F",
  "[in_i]": "in",
  "[lb_av]": "lb",
  "kg/m2": "kg/m²",
  "/min": "/min",
};

export function prettifyUnit(unit?: string) {
  if (!unit) {
    return unit;
  }

  const key = unit.toLowerCase();
  return UCUM_DISPLAY[key] ?? unit;
}

const NARRATIVE_OBSERVATION_LABELS = new Set([
  "disclaimer",
  "gross description",
  "microscopic description",
  "comment",
  "color",
  "clinical history",
  "clinical information",
  "significant clinical history",
  "alcohol use history",
  "drug use history",
  "tobacco use history",
  "social history",
  "family history",
  "history",
  "bun/creatinine ratio",
  "final diagnosis",
  "impression",
  "specimen",
  "procedure note",
  "addendum",
  "note",
]);

const NARRATIVE_VALUE_PATTERNS = [/see note/i, /same as/i, /^yes$/i, /^no$/i];

const NARRATIVE_VALUE_LENGTH_THRESHOLD = 80;

function isNarrativeObservation(resource: FhirResource) {
  const label = pickCodeText(resource.code).toLowerCase().trim();

  if (NARRATIVE_OBSERVATION_LABELS.has(label)) {
    return true;
  }

  const valueQuantity = (
    resource as FhirResource & { valueQuantity?: { unit?: string; value?: number | string } }
  ).valueQuantity;

  if (valueQuantity?.value !== undefined) {
    return false;
  }

  const valueString = (resource as FhirResource & { valueString?: string }).valueString;

  if (valueString) {
    const trimmed = valueString.trim();

    if (NARRATIVE_VALUE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
      return true;
    }

    if (trimmed.length > NARRATIVE_VALUE_LENGTH_THRESHOLD) {
      return true;
    }
  }

  return false;
}

type ObservationComponent = {
  code?: CodeableConcept;
  valueQuantity?: { unit?: string; value?: number | string };
};

function toNumericQuantity(value: number | string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function pickPrimaryComponent(components: ObservationComponent[]) {
  const systolic = components.find((component) =>
    pickCodeText(component.code).toLowerCase().includes("systolic"),
  );

  if (systolic?.valueQuantity?.value !== undefined) {
    return systolic;
  }

  return components.find((component) => component.valueQuantity?.value !== undefined);
}

function extractObservationValue(resource: FhirResource): {
  isPlaceholder?: boolean;
  numericValue?: number;
  unit?: string;
  valueLabel: string;
} {
  const valueQuantity = (
    resource as FhirResource & { valueQuantity?: { unit?: string; value?: number | string } }
  ).valueQuantity;
  const valueString = (resource as FhirResource & { valueString?: string }).valueString;
  const valueCodeableConcept = (
    resource as FhirResource & { valueCodeableConcept?: CodeableConcept }
  ).valueCodeableConcept;
  const components = (resource as FhirResource & { component?: ObservationComponent[] }).component;

  if (valueQuantity?.value !== undefined) {
    const numeric = toNumericQuantity(valueQuantity.value);
    const unit = prettifyUnit(valueQuantity.unit);
    const valueLabel = `${valueQuantity.value}${unit ? ` ${unit}` : ""}`;

    return {
      numericValue: numeric,
      unit,
      valueLabel,
    };
  }

  if (components && components.length > 0) {
    const primary = pickPrimaryComponent(components);

    if (primary?.valueQuantity?.value !== undefined) {
      const numeric = toNumericQuantity(primary.valueQuantity.value);
      const unit = prettifyUnit(primary.valueQuantity.unit);
      const primaryLabel = pickCodeText(primary.code).toLowerCase();
      const isBloodPressure = primaryLabel.includes("systolic");
      const diastolic = isBloodPressure
        ? components.find((component) =>
            pickCodeText(component.code).toLowerCase().includes("diastolic"),
          )
        : undefined;
      const diastolicValue = diastolic?.valueQuantity?.value;

      const valueLabel =
        diastolicValue !== undefined
          ? `${primary.valueQuantity.value}/${diastolicValue}${unit ? ` ${unit}` : ""}`
          : `${primary.valueQuantity.value}${unit ? ` ${unit}` : ""}`;

      return {
        numericValue: numeric,
        unit,
        valueLabel,
      };
    }
  }

  if (valueString) {
    return { valueLabel: valueString };
  }

  if (valueCodeableConcept) {
    return { valueLabel: pickCodeText(valueCodeableConcept) };
  }

  return { isPlaceholder: true, valueLabel: "Result available" };
}

function parseSortTime(value?: string) {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

function sortOccurrencesLatestFirst(occurrences: ClinicalOccurrence[]) {
  return [...occurrences].sort((left, right) => right.sortTime - left.sortTime);
}

function extractObservationCategory(resource: FhirResource) {
  const category = (
    resource as FhirResource & { category?: Array<{ coding?: Coding[] }> }
  ).category;

  if (!category) {
    return undefined;
  }

  for (const entry of category) {
    for (const coding of entry.coding ?? []) {
      if (coding.code) {
        return coding.code.toLowerCase();
      }
    }
  }

  return undefined;
}

function buildObservationItems(sectionResources: FhirResource[]): ClinicalItem[] {
  const groups = new Map<
    string,
    {
      occurrences: ClinicalOccurrence[];
    }
  >();

  for (const resource of sectionResources) {
    if (isNarrativeObservation(resource)) {
      continue;
    }

    const label = pickCodeText(resource.code);
    const date = resource.effectiveDateTime ?? resource.issued;
    const sortTime = parseSortTime(date);
    const value = extractObservationValue(resource);
    const categoryCode = extractObservationCategory(resource);

    const group = groups.get(label) ?? { occurrences: [] };
    group.occurrences.push({
      categoryCode,
      date,
      dateLabel: formatDisplayDate(date),
      isPlaceholder: value.isPlaceholder,
      numericValue: value.numericValue,
      sortTime,
      unit: value.unit,
      valueLabel: value.valueLabel,
    });
    groups.set(label, group);
  }

  return [...groups.entries()]
    .map(([label, group]) => {
      const sorted = sortOccurrencesLatestFirst(group.occurrences);
      const latest = sorted[0];
      const latestSortTime = latest?.sortTime ?? Number.NEGATIVE_INFINITY;
      const description = latest
        ? latest.isPlaceholder
          ? undefined
          : `Latest result: ${latest.valueLabel}`
        : undefined;

      return {
        label,
        presentation: "rollup" as const,
        occurrenceCount: sorted.length,
        description,
        metadata: [
          latest?.dateLabel ? `Most recent: ${latest.dateLabel}` : undefined,
        ].filter(Boolean) as string[],
        occurrences: sorted,
        latestSortTime,
      };
    })
    .sort((left, right) => {
      const timeDelta = right.latestSortTime - left.latestSortTime;

      if (timeDelta !== 0) {
        return timeDelta;
      }

      const countDelta = (right.occurrenceCount ?? 0) - (left.occurrenceCount ?? 0);

      if (countDelta !== 0) {
        return countDelta;
      }

      return left.label.localeCompare(right.label);
    })
    .map(({ latestSortTime: _unused, ...rest }) => rest);
}

function normalizeVaccineLabel(label: string) {
  return label
    .replace(/\s*#?\s*\d+\s*$/i, "")
    .replace(/([A-Za-z])\s*(\d+)\s*$/i, "$1")
    .trim()
    .toLowerCase();
}

function buildImmunizationItems(sectionResources: FhirResource[]): ClinicalItem[] {
  const groups = new Map<
    string,
    {
      displayLabel: string;
      occurrences: ClinicalOccurrence[];
      statuses: string[];
    }
  >();

  for (const resource of sectionResources) {
    const originalLabel = pickCodeText(resource.vaccineCode);
    const key = normalizeVaccineLabel(originalLabel) || originalLabel.toLowerCase();
    const date = resource.occurrenceDateTime;
    const sortTime = parseSortTime(date);
    const status = resource.status;

    const group = groups.get(key) ?? {
      displayLabel: originalLabel,
      occurrences: [],
      statuses: [],
    };

    const trailingNumber = /\s*#?\s*\d+\s*$/;
    const candidateClean = !trailingNumber.test(originalLabel);
    const currentClean = !trailingNumber.test(group.displayLabel);

    if (
      (candidateClean && !currentClean) ||
      (candidateClean === currentClean && originalLabel.length > group.displayLabel.length)
    ) {
      group.displayLabel = originalLabel;
    }

    group.occurrences.push({
      date,
      dateLabel: formatDisplayDate(date),
      note: status,
      sortTime,
      valueLabel: "Dose administered",
    });

    if (status && !group.statuses.includes(status)) {
      group.statuses.push(status);
    }

    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => {
      const sorted = sortOccurrencesLatestFirst(group.occurrences);
      const latest = sorted[0];
      const latestSortTime = latest?.sortTime ?? Number.NEGATIVE_INFINITY;

      return {
        label: group.displayLabel,
        presentation: "rollup" as const,
        occurrenceCount: sorted.length,
        description: latest?.dateLabel
          ? `Most recent dose: ${latest.dateLabel}`
          : "Recorded in immunization history",
        metadata: group.statuses,
        occurrences: sorted,
        latestSortTime,
      };
    })
    .sort((left, right) => {
      const timeDelta = right.latestSortTime - left.latestSortTime;

      if (timeDelta !== 0) {
        return timeDelta;
      }

      const countDelta = (right.occurrenceCount ?? 0) - (left.occurrenceCount ?? 0);

      if (countDelta !== 0) {
        return countDelta;
      }

      return left.label.localeCompare(right.label);
    })
    .map(({ latestSortTime: _unused, ...rest }) => rest);
}

function buildSingleOccurrenceEvent(
  dateValue: string | undefined,
  statusLabel: string | undefined,
): ClinicalOccurrence[] {
  const sortTime = parseSortTime(dateValue);

  return [
    {
      date: dateValue,
      dateLabel: formatDisplayDate(dateValue),
      note: statusLabel,
      sortTime,
      valueLabel: statusLabel ?? "Recorded",
    },
  ];
}

const VITAL_LABEL_KEYWORDS = [
  "blood pressure",
  "heart rate",
  "pulse",
  "temperature",
  "respiration",
  "respirations",
  "respiratory",
  "oxygen",
  "spo2",
  "o2 sat",
  "body mass index",
  "bmi",
  "height",
  "weight",
  "pain score",
];

const VITAL_UNIT_ALLOWLIST = new Set(
  [
    "mmhg",
    "mm[hg]",
    "bpm",
    "/min",
    "kg",
    "lb",
    "cm",
    "in",
    "[in_i]",
    "°c",
    "cel",
    "°f",
    "[degf]",
    "%",
  ].map((value) => value.toLowerCase()),
);

function classifyObservationItem(item: ClinicalItem): "labs" | "vitals" {
  const categoryCodes = new Set(
    item.occurrences
      .map((occurrence) => occurrence.categoryCode)
      .filter((value): value is string => Boolean(value)),
  );

  if (categoryCodes.has("vital-signs")) {
    return "vitals";
  }

  if (categoryCodes.has("laboratory")) {
    return "labs";
  }

  const label = item.label.toLowerCase();

  if (VITAL_LABEL_KEYWORDS.some((keyword) => label.includes(keyword))) {
    return "vitals";
  }

  const unit = item.occurrences[0]?.unit?.toLowerCase();

  if (unit && VITAL_UNIT_ALLOWLIST.has(unit) && label.split(/\s+/).length <= 3) {
    return "vitals";
  }

  return "labs";
}

function buildConditionItems(sectionResources: FhirResource[]): ClinicalItem[] {
  return sectionResources
    .map((resource) => {
      const status = pickCodingLabel(resource.clinicalStatus?.coding);
      const dateValue = resource.onsetDateTime ?? resource.onsetPeriod?.start ?? resource.recordedDate;

      return {
        label: pickCodeText(resource.code),
        description: status,
        metadata: [
          formatClinicalCode(resource.code),
          formatDisplayDate(dateValue),
        ].filter(Boolean) as string[],
        occurrences: buildSingleOccurrenceEvent(dateValue, status),
        presentation: "event" as const,
      };
    })
    .sort((left, right) => (right.occurrences[0]?.sortTime ?? 0) - (left.occurrences[0]?.sortTime ?? 0));
}

function buildMedicationItems(sectionResources: FhirResource[]): ClinicalItem[] {
  const groups = new Map<
    string,
    {
      count: number;
      codeLabel?: string;
      dateLabel?: string;
      dateValue?: string;
      label: string;
      status?: string;
    }
  >();

  for (const resource of sectionResources) {
    const label = resource.medicationCodeableConcept
      ? pickCodeText(resource.medicationCodeableConcept)
      : resource.medicationReference?.display ?? "Medication";
    const status = resource.status;
    const dateValue = resource.authoredOn;
    const dayKey = dateValue ? dateValue.slice(0, 10) : "undated";
    const key = `${label.toLowerCase()}::${dayKey}::${status ?? ""}`;

    const existing = groups.get(key);

    if (existing) {
      existing.count += 1;
      continue;
    }

    groups.set(key, {
      codeLabel: formatClinicalCode(resource.medicationCodeableConcept),
      count: 1,
      dateLabel: formatDisplayDate(dateValue),
      dateValue,
      label,
      status,
    });
  }

  return [...groups.values()]
    .map((group) => {
      const metadata = [
        group.codeLabel,
        group.dateLabel,
        group.count > 1 ? `${group.count} orders` : undefined,
      ].filter((value): value is string => Boolean(value));

      return {
        label: group.label,
        description: group.status,
        metadata,
        occurrences: buildSingleOccurrenceEvent(group.dateValue, group.status),
        presentation: "event" as const,
      };
    })
    .sort((left, right) => (right.occurrences[0]?.sortTime ?? 0) - (left.occurrences[0]?.sortTime ?? 0));
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
    return "This is currently one of the strongest structured sections in the current bundle.";
  }

  if (status === "available") {
    return undefined;
  }

  if (type === "DocumentReference" && binaryCount > 0) {
    return "This bundle includes file attachments, but no structured document references.";
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
      displayMode: "events",
      emptyMessage: "No allergy records were found in the current HealthEx bundle.",
      guidance,
      items: sectionResources.map((resource) => ({
        label: pickCodeText(resource.code),
        description: pickCodingLabel(resource.clinicalStatus?.coding),
        metadata: [
          formatClinicalCode(resource.code),
          pickCodingLabel(resource.verificationStatus?.coding),
          formatDisplayDate(resource.recordedDate),
        ].filter(Boolean) as string[],
        occurrences: buildSingleOccurrenceEvent(
          resource.recordedDate,
          pickCodingLabel(resource.clinicalStatus?.coding),
        ),
      })),
      status,
      title: "Allergies",
      type,
    };
  }

  if (type === "Condition") {
    return {
      count,
      displayMode: "events",
      emptyMessage: "No structured condition resources were found in the current HealthEx bundle.",
      guidance,
      items: buildConditionItems(sectionResources),
      status,
      title: "Conditions",
      type,
    };
  }

  if (type === "MedicationRequest") {
    return {
      count,
      displayMode: "events",
      emptyMessage: "No medication requests were found in the current HealthEx bundle.",
      guidance,
      items: buildMedicationItems(sectionResources),
      status,
      title: "Medications",
      type,
    };
  }

  if (type === "Observation") {
    return {
      count,
      displayMode: "rollup",
      emptyMessage: "No structured observations were found in the current HealthEx bundle.",
      guidance,
      items: buildObservationItems(sectionResources),
      status,
      summaryCaption:
        count > 0 ? "Grouped by test name and sorted by the most recent result." : undefined,
      title: "Observations",
      type,
    };
  }

  if (type === "Immunization") {
    return {
      count,
      displayMode: "rollup",
      emptyMessage: "No immunization resources are currently available in the current HealthEx bundle.",
      guidance,
      items: buildImmunizationItems(sectionResources),
      status,
      summaryCaption:
        count > 0 ? "Grouped by vaccine and sorted by the most recent administration." : undefined,
      title: "Immunizations",
      type,
    };
  }

  return {
    count,
    displayMode: "events",
    emptyMessage: "No document references were found in the current HealthEx bundle.",
    guidance,
    items: sectionResources.map((resource) => ({
      label: pickCodeText(resource.type),
      description: resource.subject?.display,
      metadata: [resource.status, formatDisplayDate(resource.date)].filter(Boolean) as string[],
      occurrences: buildSingleOccurrenceEvent(resource.date, resource.status),
    })),
    status,
    title: "Documents",
    type,
  };
}

function buildTab(
  id: ClinicalTabId,
  label: string,
  searchPlaceholder: string,
  emptyHint: string,
  items: ClinicalItem[],
): ClinicalTab {
  const totalCount = items.reduce((total, item) => total + (item.occurrenceCount ?? 1), 0);

  return {
    emptyHint,
    hasData: items.length > 0,
    id,
    items,
    label,
    searchPlaceholder,
    totalCount,
  };
}

function buildTabs(sections: ClinicalSection[]): ClinicalTab[] {
  const byType = new Map(sections.map((section) => [section.type, section]));
  const conditionSection = byType.get("Condition");
  const medicationSection = byType.get("MedicationRequest");
  const observationSection = byType.get("Observation");
  const immunizationSection = byType.get("Immunization");

  const labsItems: ClinicalItem[] = [];
  const vitalsItems: ClinicalItem[] = [];

  for (const item of observationSection?.items ?? []) {
    if (classifyObservationItem(item) === "vitals") {
      vitalsItems.push(item);
    } else {
      labsItems.push(item);
    }
  }

  return [
    buildTab(
      "conditions",
      "Conditions",
      "Search conditions",
      "No structured conditions in the current bundle.",
      conditionSection?.items ?? [],
    ),
    buildTab(
      "medications",
      "Medications",
      "Search medications",
      "No medication history in the current bundle.",
      medicationSection?.items ?? [],
    ),
    buildTab(
      "labs",
      "Labs",
      "Search lab results",
      "No lab-style observations in the current bundle.",
      labsItems,
    ),
    buildTab(
      "vitals",
      "Vitals",
      "Search vital signs",
      "No vital-sign observations in the current bundle.",
      vitalsItems,
    ),
    buildTab(
      "immunizations",
      "Immunizations",
      "Search immunizations",
      "No immunization history in the current bundle.",
      immunizationSection?.items ?? [],
    ),
  ];
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
      "The current source does not yet contain any supported structured resource types, so a fresher live browser pull may still be needed.",
    );
  } else if (leadTypes.length === 1) {
    notes.push(
      `The current source only validates one clearly usable structured section: ${SUPPORTED_TYPE_LABELS[leadTypes[0]]}.`,
    );
  } else {
    notes.push(
      `The current lead sections are ${leadTypes.map((type) => SUPPORTED_TYPE_LABELS[type]).join(" and ")}.`,
    );
  }

  if (binaryCount > supportedResourceTotal) {
    notes.push(
      "Binary attachments currently outnumber supported structured resources, so the viewer keeps file-heavy content secondary.",
    );
  }

  if ((resourceCounts.Immunization ?? 0) === 0) {
    notes.push("Immunization data is not yet present in the current bundle.");
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
  const tabs = buildTabs(sections);

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
    tabs,
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
