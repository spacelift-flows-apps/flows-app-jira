import { AppBlock, events, kv } from "@slflows/sdk/v1";
import type { FieldMetadata } from "../../main";
import { createJiraClient } from "../../utils/jiraClient";
import { extractFieldValue } from "../webhooks/helpers";

export const searchIssues: AppBlock = {
  name: "Search Issues",
  description: "Search for Jira issues using JQL (Jira Query Language)",
  category: "Issues",

  inputs: {
    default: {
      config: {
        jql: {
          name: "JQL Query",
          description:
            "JQL query to search for issues (e.g., 'project = PROJ AND status = \"In Progress\"')",
          type: "string",
          required: true,
        },
        fields: {
          name: "Fields to Include",
          description:
            "Array of fields to include in results (e.g., ['summary', 'status', 'assignee']). If empty, returns all fields.",
          type: ["string"],
          required: false,
        },
        expand: {
          name: "Expand Options",
          description:
            "Array of entities to expand (e.g., ['names', 'renderedFields', 'changelog'])",
          type: ["string"],
          required: false,
        },
        nextPageToken: {
          name: "Next Page Token",
          description:
            "Token for pagination. Use the nextPageToken from a previous response to get the next page of results.",
          type: "string",
          required: false,
        },
        maxResults: {
          name: "Max Results",
          description:
            "Maximum number of results to return (default: 50, max: 100)",
          type: "number",
          required: false,
        },
      },
      onEvent: async (input) => {
        const { jiraUrl, email, apiToken } = input.app.config;
        const {
          jql,
          fields,
          expand,
          nextPageToken,
          maxResults = 50,
        } = input.event.inputConfig;

        const jiraClient = createJiraClient({ jiraUrl, email, apiToken });

        try {
          // Build search request body for the new /search/jql API
          const searchRequest: any = {
            jql,
            maxResults: Math.min(maxResults, 100), // Cap at 100 to prevent excessive results
          };

          // The new API requires explicit field selection; default to all fields
          searchRequest.fields =
            fields && fields.length > 0 ? fields : ["*all"];

          // The new API expects expand as a comma-separated string
          if (expand && expand.length > 0) {
            searchRequest.expand = expand.join(",");
          }

          // Use token-based pagination
          if (nextPageToken) {
            searchRequest.nextPageToken = nextPageToken;
          }

          const searchResults = await jiraClient.post<{
            total: number;
            issues: Array<{
              id: string;
              key: string;
              self: string;
              fields: any;
              expand?: string;
              names?: Record<string, string>;
              renderedFields?: Record<string, any>;
              changelog?: any;
            }>;
            nextPageToken?: string;
            warningMessages?: string[];
          }>("/search/jql", searchRequest);

          // Get field mapping from cache for custom field name resolution
          const fieldMappingResult = await kv.app.get("jira_field_mapping");
          const fieldMapping: Record<string, FieldMetadata> =
            fieldMappingResult?.value || {};

          // Helper to extract custom fields from an issue
          const extractCustomFields = (fields: any) => {
            const customFields: Record<string, any> = {};
            for (const [key, value] of Object.entries(fields || {})) {
              if (key.startsWith("customfield_") && value !== null) {
                const metadata = fieldMapping[key];
                if (!metadata) {
                  console.warn(
                    `Unknown custom field "${key}" - consider re-syncing the Jira app to refresh field mappings`,
                  );
                }
                customFields[metadata?.name || key] = extractFieldValue(
                  value,
                  metadata,
                );
              }
            }
            return customFields;
          };

          await events.emit({
            total: searchResults.total,
            nextPageToken: searchResults.nextPageToken,
            issues: searchResults.issues.map((issue) => ({
              id: issue.id,
              key: issue.key,
              issueUrl: issue.self,
              fields: issue.fields,
              customFields: extractCustomFields(issue.fields),
              expand: issue.expand,
              names: issue.names,
              renderedFields: issue.renderedFields,
              changelog: issue.changelog,
            })),
            warningMessages: searchResults.warningMessages || [],
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          throw new Error(`Failed to search issues: ${errorMessage}`);
        }
      },
    },
  },

  outputs: {
    default: {
      name: "Search Results",
      description: "Issues matching the JQL query with pagination info",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          total: {
            type: "number",
            description: "Total number of issues matching the query",
          },
          nextPageToken: {
            type: "string",
            description:
              "Token to fetch the next page of results. Pass this to the nextPageToken input to get more results. Undefined if there are no more results.",
          },
          issues: {
            type: "array",
            description: "Array of issues matching the query",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "The issue ID" },
                key: {
                  type: "string",
                  description: "The issue key (e.g., PROJ-123)",
                },
                issueUrl: {
                  type: "string",
                  description: "The API URL for this issue",
                },
                fields: { type: "object", description: "The issue fields" },
                customFields: {
                  type: "object",
                  description:
                    "Custom fields with their display names as keys. Values vary by field type.",
                  additionalProperties: true,
                },
                expand: {
                  type: "string",
                  description: "The expand parameter used",
                },
                names: {
                  type: "object",
                  description: "Translated field names (when expanded)",
                },
                renderedFields: {
                  type: "object",
                  description: "HTML-rendered field values (when expanded)",
                },
                changelog: {
                  type: "object",
                  description: "Issue change history (when expanded)",
                },
              },
              required: ["id", "key", "issueUrl", "fields", "customFields"],
            },
          },
          warningMessages: {
            type: "array",
            description: "Warning messages from the search",
            items: { type: "string" },
          },
        },
        required: ["total", "issues", "warningMessages"],
      },
    },
  },
};
