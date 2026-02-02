import { AppBlock, events } from "@slflows/sdk/v1";
import { createServiceDeskClient } from "../../utils/serviceDeskClient";

export const createServiceDeskRequest: AppBlock = {
  name: "Create Service Desk Request",
  description:
    "Create a new request via Jira Service Management (uses Service Desk API instead of standard issue API)",
  category: "Service Desk",

  inputs: {
    default: {
      config: {
        serviceDeskId: {
          name: "Service Desk ID",
          description:
            "The ID of the service desk where the request will be created",
          type: "string",
          required: true,
        },
        requestTypeId: {
          name: "Request Type ID",
          description:
            "The ID of the request type (e.g., incident, service request)",
          type: "string",
          required: true,
        },
        summary: {
          name: "Summary",
          description: "Brief summary/title of the request",
          type: "string",
          required: true,
        },
        description: {
          name: "Description",
          description: "Detailed description of the request",
          type: "string",
          required: false,
        },
        requestFieldValues: {
          name: "Additional Field Values",
          description:
            "Additional request field values as key-value pairs (field IDs as keys)",
          type: { type: "object" },
          required: false,
        },
        requestParticipants: {
          name: "Request Participants",
          description: "Array of account IDs to add as request participants",
          type: ["string"],
          required: false,
        },
        raiseOnBehalfOf: {
          name: "Raise On Behalf Of",
          description:
            "Account ID of the customer to raise the request on behalf of",
          type: "string",
          required: false,
        },
      },
      onEvent: async (input) => {
        const { jiraUrl, email, apiToken } = input.app.config;
        const {
          serviceDeskId,
          requestTypeId,
          summary,
          description,
          requestFieldValues,
          requestParticipants,
          raiseOnBehalfOf,
        } = input.event.inputConfig;

        const client = createServiceDeskClient({ jiraUrl, email, apiToken });

        const requestBody: any = {
          serviceDeskId,
          requestTypeId,
          requestFieldValues: {
            summary,
            ...(description && { description }),
            ...requestFieldValues,
          },
        };

        if (requestParticipants && requestParticipants.length > 0) {
          requestBody.requestParticipants = requestParticipants;
        }

        if (raiseOnBehalfOf) {
          requestBody.raiseOnBehalfOf = raiseOnBehalfOf;
        }

        const createdRequest = await client.post<{
          issueId: string;
          issueKey: string;
          requestTypeId: string;
          serviceDeskId: string;
          createdDate: { iso8601: string };
          currentStatus: { status: string; statusCategory: string };
          _links: { web: string };
        }>("/request", requestBody);

        await events.emit({
          issueId: createdRequest.issueId,
          issueKey: createdRequest.issueKey,
          requestTypeId: createdRequest.requestTypeId,
          serviceDeskId: createdRequest.serviceDeskId,
          createdDate: createdRequest.createdDate?.iso8601,
          status: createdRequest.currentStatus?.status,
          statusCategory: createdRequest.currentStatus?.statusCategory,
          webUrl: createdRequest._links?.web,
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Created Request",
      description: "Details of the successfully created service desk request",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          issueId: {
            type: "string",
            description: "The ID of the created request",
          },
          issueKey: {
            type: "string",
            description: "The key of the created request (e.g., SD-123)",
          },
          requestTypeId: { type: "string", description: "The request type ID" },
          serviceDeskId: { type: "string", description: "The service desk ID" },
          createdDate: {
            type: "string",
            description: "ISO8601 timestamp of creation",
          },
          status: { type: "string", description: "Current status name" },
          statusCategory: { type: "string", description: "Status category" },
          webUrl: {
            type: "string",
            description: "URL to view the request in browser",
          },
        },
        required: ["issueId", "issueKey"],
      },
    },
  },
};
