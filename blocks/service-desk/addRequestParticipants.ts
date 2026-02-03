import { AppBlock, events } from "@slflows/sdk/v1";
import { createServiceDeskClient } from "../../utils/serviceDeskClient";

export const addRequestParticipants: AppBlock = {
  name: "Add Request Participants",
  description: "Add participants to a service desk request",
  category: "Service Desk",

  inputs: {
    default: {
      config: {
        issueIdOrKey: {
          name: "Issue ID or Key",
          description: "The ID or key of the request",
          type: "string",
          required: true,
        },
        accountIds: {
          name: "Account IDs",
          description: "Array of user account IDs to add as participants",
          type: ["string"],
          required: true,
        },
      },
      onEvent: async (input) => {
        const { jiraUrl, email, apiToken } = input.app.config;
        const { issueIdOrKey, accountIds } = input.event.inputConfig;

        const client = createServiceDeskClient({ jiraUrl, email, apiToken });

        const response = await client.post<{
          size: number;
          start: number;
          limit: number;
          isLastPage: boolean;
          values: Array<{
            accountId: string;
            displayName: string;
            emailAddress?: string;
          }>;
        }>(`/request/${encodeURIComponent(issueIdOrKey)}/participant`, {
          accountIds,
        });

        await events.emit({
          issueIdOrKey,
          addedCount: accountIds.length,
          participants: response.values.map((p) => ({
            accountId: p.accountId,
            displayName: p.displayName,
            emailAddress: p.emailAddress,
          })),
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Participants Result",
      description: "Result of adding participants to the request",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          issueIdOrKey: { type: "string", description: "The issue ID or key" },
          addedCount: {
            type: "number",
            description: "Number of participants added",
          },
          participants: {
            type: "array",
            description: "Current list of participants",
            items: {
              type: "object",
              properties: {
                accountId: { type: "string" },
                displayName: { type: "string" },
                emailAddress: { type: "string" },
              },
              required: ["accountId", "displayName"],
            },
          },
        },
        required: ["issueIdOrKey", "addedCount", "participants"],
      },
    },
  },
};
