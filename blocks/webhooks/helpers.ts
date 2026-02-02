import type { FieldMetadata } from "../../main";

/**
 * Extracts the actual value from Jira custom field data.
 * Jira wraps select/dropdown values in objects like {id, self, value}.
 * This function extracts just the meaningful value.
 *
 * @param value - The raw field value from Jira
 * @param metadata - Optional field metadata containing type information
 */
export function extractFieldValue(value: any, metadata?: FieldMetadata): any {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle arrays (e.g., multi-select fields, multiple users)
  if (Array.isArray(value)) {
    return value.map((item) => extractFieldValue(item, metadata));
  }

  if (typeof value === "object") {
    // Handle user/person fields (have accountId)
    if ("accountId" in value) {
      return {
        accountId: value.accountId,
        displayName: value.displayName,
        emailAddress: value.emailAddress,
      };
    }

    // Handle cascading dropdown fields (option-with-child type)
    if (metadata?.type === "option-with-child" && "value" in value) {
      return extractCascadingDropdownValue(value);
    }

    // Handle SLA fields (have ongoingCycle or completedCycles)
    if ("ongoingCycle" in value || "completedCycles" in value) {
      return extractSlaFieldValue(value);
    }

    // Handle objects with a 'value' property (e.g., dropdown, select fields)
    if ("value" in value) {
      return value.value;
    }

    // Handle objects with a 'name' property (e.g., status objects)
    if ("name" in value) {
      return value.name;
    }
  }

  return value;
}

/**
 * Extracts values from a cascading dropdown field.
 * Cascading dropdowns have a nested structure: {value: "Parent", child: {value: "Child", ...}}
 * This function extracts it as: {parent: "Parent", child: "Child"}
 */
function extractCascadingDropdownValue(value: any): {
  parent: string;
  child?: string;
} {
  const result: { parent: string; child?: string } = {
    parent: value.value,
  };

  if (
    value.child &&
    typeof value.child === "object" &&
    "value" in value.child
  ) {
    result.child = value.child.value;
  }

  return result;
}

interface SlaDuration {
  millis: number;
  friendly: string;
}

interface SlaOngoingCycle {
  startTime: string;
  breachedTime?: string;
  breached: boolean;
  paused: boolean;
  withinCalendarHours: boolean;
  remainingTime: SlaDuration;
  elapsedTime: SlaDuration;
  goalDuration: SlaDuration;
}

interface SlaCompletedCycle {
  startTime: string;
  stopTime: string;
  breached: boolean;
  remainingTime: SlaDuration;
  elapsedTime: SlaDuration;
  goalDuration: SlaDuration;
}

interface SlaFieldResult {
  name?: string;
  breached: boolean;
  paused?: boolean;
  remainingTime?: SlaDuration;
  elapsedTime?: SlaDuration;
  goalDuration?: SlaDuration;
  completedCyclesCount: number;
  ongoingCycle?: SlaOngoingCycle;
  completedCycles?: SlaCompletedCycle[];
}

/**
 * Extracts meaningful data from SLA fields.
 * SLA fields contain ongoingCycle and completedCycles with timing metrics.
 */
function extractSlaFieldValue(value: any): SlaFieldResult {
  const result: SlaFieldResult = {
    name: value.name,
    breached: false,
    completedCyclesCount: value.completedCycles?.length || 0,
  };

  // Extract ongoing cycle data (most relevant for active SLAs)
  if (value.ongoingCycle) {
    const ongoing = value.ongoingCycle;
    result.breached = ongoing.breached;
    result.paused = ongoing.paused;
    result.remainingTime = ongoing.remainingTime;
    result.elapsedTime = ongoing.elapsedTime;
    result.goalDuration = ongoing.goalDuration;

    result.ongoingCycle = {
      startTime: ongoing.startTime?.iso8601 || ongoing.startTime,
      breachedTime: ongoing.breachedTime?.iso8601 || ongoing.breachedTime,
      breached: ongoing.breached,
      paused: ongoing.paused,
      withinCalendarHours: ongoing.withinCalendarHours,
      remainingTime: ongoing.remainingTime,
      elapsedTime: ongoing.elapsedTime,
      goalDuration: ongoing.goalDuration,
    };
  }

  // Include completed cycles for historical data
  if (value.completedCycles && value.completedCycles.length > 0) {
    result.completedCycles = value.completedCycles.map((cycle: any) => ({
      startTime: cycle.startTime?.iso8601 || cycle.startTime,
      stopTime: cycle.stopTime?.iso8601 || cycle.stopTime,
      breached: cycle.breached,
      remainingTime: cycle.remainingTime,
      elapsedTime: cycle.elapsedTime,
      goalDuration: cycle.goalDuration,
    }));

    // If no ongoing cycle, check if any completed cycle was breached
    if (!value.ongoingCycle) {
      result.breached = value.completedCycles.some((c: any) => c.breached);
    }
  }

  return result;
}
