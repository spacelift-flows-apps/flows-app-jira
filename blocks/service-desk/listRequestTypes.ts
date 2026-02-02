import { AppBlock, events } from "@slflows/sdk/v1";
import { createServiceDeskClient } from "../../utils/serviceDeskClient";

export const listRequestTypes: AppBlock = {
  name: "List Request Types",
  description:
    "List all request types available for a service desk (e.g., incident, service request, change)",
  category: "Service Desk",

  inputs: {
    default: {
      config: {
        serviceDeskId: {
          name: "Service Desk ID",
          description:
            "The ID of the service desk to list request types for (use listServiceDesks to find this)",
          type: "string",
          required: true,
        },
      },
      onEvent: async (input) => {
        const { jiraUrl, email, apiToken } = input.app.config;
        const { serviceDeskId } = input.event.inputConfig;

        const client = createServiceDeskClient({ jiraUrl, email, apiToken });

        const response = await client.get<{
          size: number;
          start: number;
          limit: number;
          isLastPage: boolean;
          values: Array<{
            id: string;
            name: string;
            description: string;
            helpText?: string;
            issueTypeId: string;
            serviceDeskId: string;
            portalId: string;
            groupIds: string[];
            icon: {
              id: string;
              _links: {
                iconUrls: {
                  "48x48": string;
                };
              };
            };
          }>;
        }>(`/servicedesk/${serviceDeskId}/requesttype`);

        const requestTypes = response.values.map((rt) => ({
          id: rt.id,
          name: rt.name,
          description: rt.description,
          helpText: rt.helpText,
          issueTypeId: rt.issueTypeId,
          serviceDeskId: rt.serviceDeskId,
          portalId: rt.portalId,
          groupIds: rt.groupIds,
          iconUrl: rt.icon?._links?.iconUrls?.["48x48"],
        }));

        await events.emit({
          serviceDeskId,
          count: requestTypes.length,
          requestTypes,
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Request Types",
      description: "List of request types for the service desk",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          serviceDeskId: {
            type: "string",
            description: "The service desk ID",
          },
          count: {
            type: "number",
            description: "Number of request types found",
          },
          requestTypes: {
            type: "array",
            description: "List of request types",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description:
                    "The request type ID (use this for createServiceDeskRequest)",
                },
                name: {
                  type: "string",
                  description:
                    "The request type name (e.g., 'Report a system problem')",
                },
                description: {
                  type: "string",
                  description: "Description of what this request type is for",
                },
                helpText: {
                  type: "string",
                  description: "Help text shown to customers",
                },
                issueTypeId: {
                  type: "string",
                  description:
                    "The underlying Jira issue type ID (e.g., Incident, Service Request)",
                },
                serviceDeskId: {
                  type: "string",
                  description: "The service desk ID",
                },
                portalId: {
                  type: "string",
                  description: "The customer portal ID",
                },
                groupIds: {
                  type: "array",
                  description: "Request type group IDs",
                  items: { type: "string" },
                },
                iconUrl: {
                  type: "string",
                  description: "URL to the request type icon",
                },
              },
            },
          },
        },
        required: ["serviceDeskId", "count", "requestTypes"],
      },
    },
  },
};
