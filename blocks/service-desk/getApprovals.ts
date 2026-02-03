import { AppBlock, events } from "@slflows/sdk/v1";
import { createServiceDeskClient } from "../../utils/serviceDeskClient";

interface Approval {
  id: string;
  name: string;
  finalDecision: "approved" | "declined" | "pending";
  canAnswerApproval: boolean;
  approvers: Array<{
    approver: {
      accountId: string;
      displayName: string;
      emailAddress?: string;
    };
    approverDecision: "approved" | "declined" | "pending";
  }>;
  createdDate?: { iso8601: string };
  completedDate?: { iso8601: string };
}

export const getApprovals: AppBlock = {
  name: "Get Approvals",
  description:
    "Get pending and completed approvals for a service desk request (experimental API)",
  category: "Service Desk",

  inputs: {
    default: {
      config: {
        issueIdOrKey: {
          name: "Issue ID or Key",
          description: "The ID or key of the request to get approvals for",
          type: "string",
          required: true,
        },
      },
      onEvent: async (input) => {
        const { jiraUrl, email, apiToken } = input.app.config;
        const { issueIdOrKey } = input.event.inputConfig;

        const client = createServiceDeskClient({ jiraUrl, email, apiToken });

        // Note: This is an experimental API requiring special header
        const response = await client.get<{
          size: number;
          start: number;
          limit: number;
          isLastPage: boolean;
          values: Approval[];
        }>(
          `/request/${encodeURIComponent(issueIdOrKey)}/approval`,
          true, // experimental = true
        );

        const approvals = response.values.map((approval) => ({
          id: approval.id,
          name: approval.name,
          finalDecision: approval.finalDecision,
          canAnswerApproval: approval.canAnswerApproval,
          createdDate: approval.createdDate?.iso8601,
          completedDate: approval.completedDate?.iso8601,
          approvers: approval.approvers.map((a) => ({
            accountId: a.approver.accountId,
            displayName: a.approver.displayName,
            emailAddress: a.approver.emailAddress,
            decision: a.approverDecision,
          })),
        }));

        const pendingApprovals = approvals.filter(
          (a) => a.finalDecision === "pending",
        );
        const completedApprovals = approvals.filter(
          (a) => a.finalDecision !== "pending",
        );

        await events.emit({
          issueIdOrKey,
          totalCount: approvals.length,
          pendingCount: pendingApprovals.length,
          approvedCount: completedApprovals.filter(
            (a) => a.finalDecision === "approved",
          ).length,
          declinedCount: completedApprovals.filter(
            (a) => a.finalDecision === "declined",
          ).length,
          approvals,
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Approvals",
      description: "Approval information for the request",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          issueIdOrKey: { type: "string", description: "The issue ID or key" },
          totalCount: {
            type: "number",
            description: "Total number of approvals",
          },
          pendingCount: {
            type: "number",
            description: "Number of pending approvals",
          },
          approvedCount: {
            type: "number",
            description: "Number of approved approvals",
          },
          declinedCount: {
            type: "number",
            description: "Number of declined approvals",
          },
          approvals: {
            type: "array",
            description: "All approvals",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "Approval ID" },
                name: { type: "string", description: "Approval name" },
                finalDecision: {
                  type: "string",
                  description: "Final decision: approved, declined, or pending",
                },
                canAnswerApproval: {
                  type: "boolean",
                  description: "Whether current user can answer",
                },
                createdDate: {
                  type: "string",
                  description: "When the approval was created",
                },
                completedDate: {
                  type: "string",
                  description: "When the approval was completed",
                },
                approvers: {
                  type: "array",
                  description: "List of approvers with their decisions",
                  items: {
                    type: "object",
                    properties: {
                      accountId: { type: "string" },
                      displayName: { type: "string" },
                      emailAddress: { type: "string" },
                      decision: { type: "string" },
                    },
                    required: ["accountId", "displayName", "decision"],
                  },
                },
              },
              required: [
                "id",
                "name",
                "finalDecision",
                "canAnswerApproval",
                "approvers",
              ],
            },
          },
        },
        required: [
          "issueIdOrKey",
          "totalCount",
          "pendingCount",
          "approvedCount",
          "declinedCount",
          "approvals",
        ],
      },
    },
  },
};
