import { AppBlock, events } from "@slflows/sdk/v1";
import memoizee from "memoizee";
import { createServiceDeskClient } from "../../utils/serviceDeskClient";

interface PagedResponse<T> {
  values: T[];
  size: number;
  start: number;
  limit: number;
  isLastPage: boolean;
}

interface ServiceDesk {
  id: string;
  projectId: string;
  projectName: string;
  projectKey: string;
}

interface RequestType {
  id: string;
  name: string;
  description: string;
}

async function fetchAllServiceDesks(
  jiraUrl: string,
  email: string,
  apiToken: string,
): Promise<ServiceDesk[]> {
  const client = createServiceDeskClient({ jiraUrl, email, apiToken });
  const allDesks: ServiceDesk[] = [];
  let start = 0;
  const limit = 50;

  while (true) {
    const response = await client.get<PagedResponse<ServiceDesk>>(
      `/servicedesk?start=${start}&limit=${limit}`,
    );
    allDesks.push(...response.values);
    if (response.isLastPage) break;
    start += response.values.length;
  }

  return allDesks;
}

async function fetchAllRequestTypes(
  jiraUrl: string,
  email: string,
  apiToken: string,
  serviceDeskId: string,
): Promise<RequestType[]> {
  const client = createServiceDeskClient({ jiraUrl, email, apiToken });
  const allTypes: RequestType[] = [];
  let start = 0;
  const limit = 50;

  while (true) {
    const response = await client.get<PagedResponse<RequestType>>(
      `/servicedesk/${serviceDeskId}/requesttype?start=${start}&limit=${limit}`,
    );
    allTypes.push(...response.values);
    if (response.isLastPage) break;
    start += response.values.length;
  }

  return allTypes;
}

const getAllServiceDesks = memoizee(fetchAllServiceDesks, {
  maxAge: 60000,
  promise: true,
});

const getAllRequestTypes = memoizee(fetchAllRequestTypes, {
  maxAge: 60000,
  promise: true,
});

export const createServiceDeskRequest: AppBlock = {
  name: "Create Service Desk Request",
  description:
    "Create a new request via Jira Service Management (uses Service Desk API instead of standard issue API)",
  category: "Service Desk",

  inputs: {
    default: {
      config: {
        serviceDeskId: {
          name: "Service Desk",
          description: "The service desk where the request will be created",
          type: "string",
          required: true,
          suggestValues: async (input) => {
            const { jiraUrl, email, apiToken } = input.app.config;
            const allDesks = await getAllServiceDesks(jiraUrl, email, apiToken);

            let values = allDesks.map((desk) => ({
              label: `${desk.projectName} (${desk.projectKey})`,
              value: desk.id,
            }));

            if (input.searchPhrase) {
              const searchLower = input.searchPhrase.toLowerCase();
              values = values.filter((v) =>
                v.label.toLowerCase().includes(searchLower),
              );
            }

            return { suggestedValues: values.slice(0, 50) };
          },
        },
        requestTypeId: {
          name: "Request Type",
          description: "The type of request (e.g., incident, service request)",
          type: "string",
          required: true,
          suggestValues: async (input) => {
            const { jiraUrl, email, apiToken } = input.app.config;
            const serviceDeskId = input.staticInputConfig?.serviceDeskId as string | undefined;

            if (!serviceDeskId) {
              return {
                suggestedValues: [],
                message: "Configure static value for Service Desk ID to receive suggestions.",
              };
            }

            const allTypes = await getAllRequestTypes(
              jiraUrl,
              email,
              apiToken,
              serviceDeskId,
            );

            let values = allTypes.map((type) => ({
              label: type.name,
              value: type.id,
              description: type.description,
            }));

            if (input.searchPhrase) {
              const searchLower = input.searchPhrase.toLowerCase();
              values = values.filter(
                (v) =>
                  v.label.toLowerCase().includes(searchLower) ||
                  (v.description &&
                    v.description.toLowerCase().includes(searchLower)),
              );
            }

            return { suggestedValues: values.slice(0, 50) };
          },
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
          createdDate: createdRequest.createdDate.iso8601,
          status: createdRequest.currentStatus.status,
          statusCategory: createdRequest.currentStatus.statusCategory,
          webUrl: createdRequest._links.web,
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
        required: [
          "issueId",
          "issueKey",
          "requestTypeId",
          "serviceDeskId",
          "createdDate",
          "status",
          "statusCategory",
          "webUrl",
        ],
      },
    },
  },
};
