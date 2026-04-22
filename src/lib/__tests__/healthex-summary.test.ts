import { describe, expect, it } from "vitest";

import { buildSummaryFromBundle, type FhirBundle } from "../healthex-summary";

function buildBundle(entries: FhirBundle["entry"]): FhirBundle {
  return { entry: entries, total: entries?.length ?? 0 };
}

describe("buildSummaryFromBundle - Gap A: sentinel allergy suppression", () => {
  // A real HealthEx response can encode "no known allergy" as an active, confirmed
  // AllergyIntolerance (SNOMED 716186003). Naive consumers render that as an active
  // diagnosis; this test locks in that we suppress the sentinel without losing the
  // "no allergies on file" affordance.
  it("suppresses SNOMED 716186003 'no known allergy' sentinel records", () => {
    const bundle = buildBundle([
      {
        resource: {
          resourceType: "AllergyIntolerance",
          id: "a1",
          clinicalStatus: {
            coding: [{ code: "active", display: "Active" }],
          },
          verificationStatus: {
            coding: [{ code: "confirmed", display: "Confirmed" }],
          },
          code: {
            coding: [
              {
                system: "http://snomed.info/sct",
                code: "716186003",
                display: "No known allergy",
              },
            ],
            text: "No Known Allergies",
          },
          recordedDate: "2009-02-17T19:50:28Z",
        },
      },
    ]);

    const summary = buildSummaryFromBundle(bundle);
    const allergySection = summary.sections.find((section) => section.type === "AllergyIntolerance");

    expect(allergySection).toBeDefined();
    expect(allergySection!.count).toBe(0);
    expect(allergySection!.items).toHaveLength(0);
    expect(allergySection!.emptyMessage).toMatch(/no allergies on file/i);
    expect(summary.dataQualityFlags.sentinelAllergiesSuppressed).toBe(1);
    expect(summary.notes.some((note) => note.toLowerCase().includes("sentinel"))).toBe(true);
  });
});

describe("buildSummaryFromBundle - Gap B: multi-Patient identity reconciliation", () => {
  // A HealthEx Person can link to multiple Patient identities (enterprise MPI
  // merges, outside-system imports). Clinical resources attach to any of those
  // Patient IDs. This test locks in that we keep every record regardless of
  // which Patient identity it was filed under, and that we surface the merge.
  it("retains records attached to any Patient identity linked from the Person", () => {
    const bundle = buildBundle([
      {
        resource: {
          resourceType: "Person",
          id: "person-1",
          link: [
            { target: { reference: "Patient/p-one" } },
            { target: { reference: "Patient/p-two" } },
          ],
        },
      },
      {
        resource: {
          resourceType: "Observation",
          id: "obs-1",
          status: "final",
          code: { text: "Hemoglobin" },
          subject: { reference: "Patient/p-one" },
          effectiveDateTime: "2024-05-01",
          valueQuantity: { value: 14.2, unit: "g/dL" },
        } as never,
      },
      {
        resource: {
          resourceType: "Immunization",
          id: "imm-1",
          status: "completed",
          vaccineCode: {
            coding: [{ system: "http://hl7.org/fhir/sid/cvx", code: "140" }],
            text: "Influenza",
          },
          patient: { reference: "Patient/p-two" },
          occurrenceDateTime: "2024-10-12",
        },
      },
    ]);

    const summary = buildSummaryFromBundle(bundle);

    expect(summary.patientIdentities.personId).toBe("person-1");
    expect(summary.patientIdentities.mergedCount).toBe(2);
    expect(summary.patientIdentities.patientIds).toEqual(["p-one", "p-two"]);
    expect(summary.dataQualityFlags.mergedPatientIdentities).toBe(2);

    const labsTab = summary.tabs.find((tab) => tab.id === "labs");
    const immunizationsTab = summary.tabs.find((tab) => tab.id === "immunizations");

    expect(labsTab?.items).toHaveLength(1);
    expect(immunizationsTab?.items).toHaveLength(1);
    expect(summary.supportedResourceTotal).toBe(2);
  });
});

describe("buildSummaryFromBundle - Gap C: CVX-first immunization grouping", () => {
  // HealthEx returns the same antigen with drifting vaccineCode.text per dose
  // ("Tdap" vs "Tdap #2" vs "Tdap Adacel") while the CVX code stays constant.
  // Dose counting must key off CVX, not the free-text label, or downstream
  // gap-analysis will over-count distinct vaccines and under-count doses.
  it("groups immunizations by CVX across drifting display text", () => {
    const baseCoding = [{ system: "http://hl7.org/fhir/sid/cvx", code: "115" }];

    const bundle = buildBundle([
      {
        resource: {
          resourceType: "Immunization",
          id: "imm-1",
          status: "completed",
          vaccineCode: { coding: baseCoding, text: "Tdap" },
          occurrenceDateTime: "2014-08-20",
        },
      },
      {
        resource: {
          resourceType: "Immunization",
          id: "imm-2",
          status: "completed",
          vaccineCode: { coding: baseCoding, text: "Tdap #2" },
          occurrenceDateTime: "2019-03-11",
        },
      },
      {
        resource: {
          resourceType: "Immunization",
          id: "imm-3",
          status: "completed",
          vaccineCode: { coding: baseCoding, text: "Tdap Adacel" },
          occurrenceDateTime: "2024-06-02",
        },
      },
    ]);

    const summary = buildSummaryFromBundle(bundle);
    const immunizationsTab = summary.tabs.find((tab) => tab.id === "immunizations");

    expect(immunizationsTab?.items).toHaveLength(1);

    const item = immunizationsTab!.items[0];
    expect(item.occurrenceCount).toBe(3);
    expect(item.metadata).toContain("CVX 115");
    expect(item.label).toMatch(/Tdap/i);
    expect(item.label).not.toMatch(/#\s*\d+/);
    // "Tdap" and "Tdap #2" normalize to the same label key; "Tdap Adacel" is the
    // one extra label variant that CVX grouping rescues from a separate row.
    expect(summary.dataQualityFlags.immunizationsGroupedByCvx).toBe(1);
  });
});
