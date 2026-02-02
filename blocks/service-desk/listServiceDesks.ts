import { AppBlock, events } from "@slflows/sdk/v1";
import { createServiceDeskClient } from "../../utils/serviceDeskClient";

export const listServiceDesks: AppBlock = {
  name: "List Service Desks",
  description: "List all service desks available in the Jira instance",
  category: "Service Desk",

  inputs: {
    default: {
      config: {},
      onEvent: async (input) => {
        const { jiraUrl, email, apiToken } = input.app.config;

        const client = createServiceDeskClient({ jiraUrl, email, apiToken });

        const response = await client.get<{
          size: number;
          start: number;
          limit: number;
          isLastPage: boolean;
          values: Array<{
            id: string;
            projectId: string;
            projectKey: string;
            projectName: string;
          }>;
        }>("/servicedesk");

        const serviceDesks = response.values.map((sd) => ({
          id: sd.id,
          projectId: sd.projectId,
          projectKey: sd.projectKey,
          projectName: sd.projectName,
        }));

        await events.emit({
          count: serviceDesks.length,
          serviceDesks,
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Service Desks",
      description: "List of all available service desks",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          count: {
            type: "number",
            description: "Number of service desks found",
          },
          serviceDesks: {
            type: "array",
            description: "List of service desks",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description:
                    "The service desk ID (use this for createServiceDeskRequest)",
                },
                projectId: {
                  type: "string",
                  description: "The Jira project ID",
                },
                projectKey: {
                  type: "string",
                  description: "The Jira project key (e.g., 'IS', 'SD')",
                },
                projectName: {
                  type: "string",
                  description: "The project name",
                },
              },
            },
          },
        },
        required: ["count", "serviceDesks"],
      },
    },
  },
};
