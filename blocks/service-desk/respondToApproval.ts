import { AppBlock, events } from "@slflows/sdk/v1";
import { createServiceDeskClient } from "../../utils/serviceDeskClient";

export const respondToApproval: AppBlock = {
  name: "Respond to Approval",
  description:
    "Approve or decline an approval on a service desk request (experimental API)",
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
        approvalId: {
          name: "Approval ID",
          description:
            "The ID of the approval to respond to (from getApprovals block)",
          type: "string",
          required: true,
        },
        decision: {
          name: "Decision",
          description: "The approval decision",
          type: {
            type: "string",
            enum: ["approve", "decline"],
          },
          required: true,
        },
      },
      onEvent: async (input) => {
        const { jiraUrl, email, apiToken } = input.app.config;
        const { issueIdOrKey, approvalId, decision } = input.event.inputConfig;

        const client = createServiceDeskClient({ jiraUrl, email, apiToken });

        // Note: This is an experimental API requiring special header
        const response = await client.post<{
          id: string;
          name: string;
          finalDecision: "approved" | "declined" | "pending";
          completedDate?: { iso8601: string };
          approvers: Array<{
            approver: {
              accountId: string;
              displayName: string;
            };
            approverDecision: string;
          }>;
        }>(
          `/request/${encodeURIComponent(issueIdOrKey)}/approval/${approvalId}`,
          { decision },
          true, // experimental API
        );

        await events.emit({
          issueIdOrKey,
          approvalId,
          decision,
          finalDecision: response.finalDecision,
          completedDate: response.completedDate?.iso8601,
          approvers: response.approvers.map((a) => ({
            accountId: a.approver.accountId,
            displayName: a.approver.displayName,
            decision: a.approverDecision,
          })),
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Approval Response Result",
      description: "Result of the approval response",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          issueIdOrKey: { type: "string", description: "The issue ID or key" },
          approvalId: { type: "string", description: "The approval ID" },
          decision: {
            type: "string",
            description: "The decision made (approve/decline)",
          },
          finalDecision: {
            type: "string",
            description: "Final approval status after this response",
          },
          completedDate: {
            type: "string",
            description: "When the approval was completed (if finalized)",
          },
          approvers: {
            type: "array",
            description: "Updated list of approvers with their decisions",
            items: {
              type: "object",
              properties: {
                accountId: { type: "string" },
                displayName: { type: "string" },
                decision: { type: "string" },
              },
            },
          },
        },
        required: ["issueIdOrKey", "approvalId", "decision", "finalDecision"],
      },
    },
  },
};
