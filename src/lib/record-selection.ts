"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { ClinicalItem, ClinicalOccurrence, ClinicalTabId } from "@/lib/healthex-summary";

export const MAX_PINS = 12;
const MAX_OCCURRENCES_PER_SELECTION = 10;

export type SerializedOccurrence = {
  date?: string;
  dateLabel?: string;
  note?: string;
  unit?: string;
  valueLabel: string;
};

export type SerializedSelection = {
  description?: string;
  key: string;
  label: string;
  metadata: string[];
  occurrenceCount?: number;
  occurrences: SerializedOccurrence[];
  tabId: ClinicalTabId;
  tabLabel: string;
};

export type ChatMessage = {
  content: string;
  id: string;
  role: "user" | "assistant";
};

export type RecordSelectionContextValue = {
  clear: () => void;
  isFull: boolean;
  isPinned: (key: string) => boolean;
  pinnedCount: number;
  selections: SerializedSelection[];
  togglePin: (item: ClinicalItem, tabId: ClinicalTabId, tabLabel: string) => void;
  unpin: (key: string) => void;
};

const RecordSelectionContext = createContext<RecordSelectionContextValue | null>(null);

export function selectionKey(tabId: ClinicalTabId, item: ClinicalItem) {
  return `${tabId}::${item.label}`;
}

function serializeOccurrence(occurrence: ClinicalOccurrence): SerializedOccurrence {
  return {
    date: occurrence.date,
    dateLabel: occurrence.dateLabel,
    note: occurrence.note,
    unit: occurrence.unit,
    valueLabel: occurrence.valueLabel,
  };
}

export function serializeItem(
  item: ClinicalItem,
  tabId: ClinicalTabId,
  tabLabel: string,
): SerializedSelection {
  return {
    description: item.description,
    key: selectionKey(tabId, item),
    label: item.label,
    metadata: item.metadata,
    occurrenceCount: item.occurrenceCount,
    occurrences: item.occurrences.slice(0, MAX_OCCURRENCES_PER_SELECTION).map(serializeOccurrence),
    tabId,
    tabLabel,
  };
}

export function RecordSelectionProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<SerializedSelection[]>([]);

  const togglePin = useCallback(
    (item: ClinicalItem, tabId: ClinicalTabId, tabLabel: string) => {
      const key = selectionKey(tabId, item);
      setSelections((current) => {
        if (current.some((entry) => entry.key === key)) {
          return current.filter((entry) => entry.key !== key);
        }

        if (current.length >= MAX_PINS) {
          return current;
        }

        return [...current, serializeItem(item, tabId, tabLabel)];
      });
    },
    [],
  );

  const unpin = useCallback((key: string) => {
    setSelections((current) => current.filter((entry) => entry.key !== key));
  }, []);

  const clear = useCallback(() => {
    setSelections([]);
  }, []);

  const isPinned = useCallback(
    (key: string) => selections.some((entry) => entry.key === key),
    [selections],
  );

  const value = useMemo<RecordSelectionContextValue>(
    () => ({
      clear,
      isFull: selections.length >= MAX_PINS,
      isPinned,
      pinnedCount: selections.length,
      selections,
      togglePin,
      unpin,
    }),
    [clear, isPinned, selections, togglePin, unpin],
  );

  return createElement(RecordSelectionContext.Provider, { value }, children);
}

export function useRecordSelection() {
  const context = useContext(RecordSelectionContext);

  if (!context) {
    throw new Error("useRecordSelection must be used inside RecordSelectionProvider");
  }

  return context;
}
