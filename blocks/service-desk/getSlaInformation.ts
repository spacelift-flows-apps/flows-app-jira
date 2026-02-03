import { AppBlock, events } from "@slflows/sdk/v1";
import { createServiceDeskClient } from "../../utils/serviceDeskClient";

interface SlaInformation {
  name: string;
  ongoingCycle?: {
    startTime: { iso8601: string; epochMillis: number };
    breachedTime?: { iso8601: string; epochMillis: number };
    breached: boolean;
    paused: boolean;
    withinCalendarHours: boolean;
    goalDuration: { millis: number; friendly: string };
    elapsedTime: { millis: number; friendly: string };
    remainingTime: { millis: number; friendly: string };
  };
  completedCycles: Array<{
    startTime: { iso8601: string; epochMillis: number };
    stopTime: { iso8601: string; epochMillis: number };
    breached: boolean;
    goalDuration: { millis: number; friendly: string };
    elapsedTime: { millis: number; friendly: string };
    remainingTime: { millis: number; friendly: string };
  }>;
}

export const getSlaInformation: AppBlock = {
  name: "Get SLA Information",
  description:
    "Get SLA information for a service desk request (requires agent permissions)",
  category: "Service Desk",

  inputs: {
    default: {
      config: {
        issueIdOrKey: {
          name: "Issue ID or Key",
          description:
            "The ID or key of the request to get SLA information for",
          type: "string",
          required: true,
        },
      },
      onEvent: async (input) => {
        const { jiraUrl, email, apiToken } = input.app.config;
        const { issueIdOrKey } = input.event.inputConfig;

        const client = createServiceDeskClient({ jiraUrl, email, apiToken });

        const response = await client.get<{
          size: number;
          start: number;
          limit: number;
          isLastPage: boolean;
          values: SlaInformation[];
        }>(`/request/${encodeURIComponent(issueIdOrKey)}/sla`);

        // Transform SLA data to a more usable format
        const slaMetrics = response.values.map((sla) => ({
          name: sla.name,
          breached:
            sla.ongoingCycle?.breached ||
            sla.completedCycles.some((c) => c.breached),
          paused: sla.ongoingCycle?.paused || false,
          hasOngoingCycle: !!sla.ongoingCycle,
          ongoingCycle: sla.ongoingCycle
            ? {
                startTime: sla.ongoingCycle.startTime.iso8601,
                breachedTime: sla.ongoingCycle.breachedTime?.iso8601,
                breached: sla.ongoingCycle.breached,
                paused: sla.ongoingCycle.paused,
                withinCalendarHours: sla.ongoingCycle.withinCalendarHours,
                remainingTime: sla.ongoingCycle.remainingTime,
                elapsedTime: sla.ongoingCycle.elapsedTime,
                goalDuration: sla.ongoingCycle.goalDuration,
              }
            : null,
          completedCyclesCount: sla.completedCycles.length,
          completedCycles: sla.completedCycles.map((cycle) => ({
            startTime: cycle.startTime.iso8601,
            stopTime: cycle.stopTime.iso8601,
            breached: cycle.breached,
            remainingTime: cycle.remainingTime,
            elapsedTime: cycle.elapsedTime,
            goalDuration: cycle.goalDuration,
          })),
        }));

        // Create a summary of breached/at-risk SLAs
        const breachedSlas = slaMetrics
          .filter((s) => s.breached)
          .map((s) => s.name);
        const activeSlas = slaMetrics.filter(
          (s) => s.hasOngoingCycle && !s.paused,
        );

        await events.emit({
          issueIdOrKey,
          totalSlaCount: slaMetrics.length,
          breachedCount: breachedSlas.length,
          activeSlaCount: activeSlas.length,
          slaMetrics,
        });
      },
    },
  },

  outputs: {
    default: {
      name: "SLA Information",
      description: "SLA metrics for the request",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          issueIdOrKey: { type: "string", description: "The issue ID or key" },
          totalSlaCount: {
            type: "number",
            description: "Total number of SLA metrics",
          },
          breachedCount: {
            type: "number",
            description: "Number of breached SLAs",
          },
          activeSlaCount: {
            type: "number",
            description: "Number of active (not paused) SLAs",
          },
          slaMetrics: {
            type: "array",
            description: "Detailed SLA metrics",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "SLA metric name" },
                breached: {
                  type: "boolean",
                  description: "Whether this SLA is breached",
                },
                paused: {
                  type: "boolean",
                  description: "Whether the ongoing cycle is paused",
                },
                hasOngoingCycle: {
                  type: "boolean",
                  description: "Whether there is an active cycle",
                },
                ongoingCycle: {
                  type: "object",
                  description: "Current cycle details if active",
                },
                completedCyclesCount: {
                  type: "number",
                  description: "Number of completed cycles",
                },
                completedCycles: {
                  type: "array",
                  description: "Historical completed cycles",
                },
              },
              required: [
                "name",
                "breached",
                "paused",
                "hasOngoingCycle",
                "completedCyclesCount",
                "completedCycles",
              ],
            },
          },
        },
        required: [
          "issueIdOrKey",
          "totalSlaCount",
          "breachedCount",
          "activeSlaCount",
          "slaMetrics",
        ],
      },
    },
  },
};
