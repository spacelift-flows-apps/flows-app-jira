import { AppBlock, events } from "@slflows/sdk/v1";
import { createServiceDeskClient } from "../../utils/serviceDeskClient";

export const addCustomerResponse: AppBlock = {
  name: "Add Customer Response",
  description:
    "Add a public response to a service desk request (visible to the customer)",
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
        body: {
          name: "Response Body",
          description: "The content of the customer response",
          type: "string",
          required: true,
        },
      },
      onEvent: async (input) => {
        const { jiraUrl, email, apiToken } = input.app.config;
        const { issueIdOrKey, body } = input.event.inputConfig;

        const client = createServiceDeskClient({ jiraUrl, email, apiToken });

        const response = await client.post<{
          id: string;
          body: string;
          public: boolean;
          author: {
            accountId: string;
            displayName: string;
            emailAddress?: string;
          };
          created: { iso8601: string };
        }>(`/request/${encodeURIComponent(issueIdOrKey)}/comment`, {
          body,
          public: true,
        });

        await events.emit({
          issueIdOrKey,
          commentId: response.id,
          body: response.body,
          isPublic: response.public,
          author: {
            accountId: response.author.accountId,
            displayName: response.author.displayName,
            emailAddress: response.author.emailAddress,
          },
          created: response.created.iso8601,
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Customer Response Result",
      description: "Details of the created customer response",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          issueIdOrKey: { type: "string", description: "The issue ID or key" },
          commentId: { type: "string", description: "The comment ID" },
          body: { type: "string", description: "The response content" },
          isPublic: {
            type: "boolean",
            description:
              "Whether the comment is public (always true for customer responses)",
          },
          author: {
            type: "object",
            description: "The author of the response",
            properties: {
              accountId: { type: "string" },
              displayName: { type: "string" },
              emailAddress: { type: "string" },
            },
            required: ["accountId", "displayName"],
          },
          created: {
            type: "string",
            description: "ISO8601 timestamp of creation",
          },
        },
        required: ["issueIdOrKey", "commentId", "body", "isPublic", "author", "created"],
      },
    },
  },
};
