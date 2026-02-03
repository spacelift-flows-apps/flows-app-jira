import { AppBlock, events, kv } from "@slflows/sdk/v1";
import type { FieldMetadata } from "../../main";
import { createJiraClient } from "../../utils/jiraClient";
import { extractFieldValue } from "../webhooks/helpers";

export const getIssue: AppBlock = {
  name: "Get Issue",
  description:
    "Retrieve a Jira issue by ID or key with optional field filtering and expansion",
  category: "Issues",

  inputs: {
    default: {
      config: {
        issueIdOrKey: {
          name: "Issue ID or Key",
          description:
            "The ID or key of the issue to retrieve (e.g., 'PROJ-123' or '10001')",
          type: "string",
          required: true,
        },
        fields: {
          name: "Fields to Include",
          description:
            "Array of fields to include (e.g., ['summary', 'status', 'assignee']). If empty, returns all fields.",
          type: ["string"],
          required: false,
        },
        expand: {
          name: "Expand Options",
          description:
            "Array of entities to expand (e.g., ['names', 'renderedFields', 'changelog', 'transitions'])",
          type: ["string"],
          required: false,
        },
      },
      onEvent: async (input) => {
        const { jiraUrl, email, apiToken } = input.app.config;
        const { issueIdOrKey, fields, expand } = input.event.inputConfig;

        const jiraClient = createJiraClient({ jiraUrl, email, apiToken });

        try {
          // Build query parameters
          const params = new URLSearchParams();
          if (fields) {
            params.append("fields", fields.join(","));
          }
          if (expand) {
            params.append("expand", expand.join(","));
          }

          const queryString = params.toString();
          const endpoint = `/issue/${issueIdOrKey}${queryString ? `?${queryString}` : ""}`;

          const issue = await jiraClient.get<{
            id: string;
            key: string;
            self: string;
            fields: any;
            expand?: string;
            names?: Record<string, string>;
            renderedFields?: Record<string, any>;
            changelog?: any;
            transitions?: any[];
            operations?: any;
            editmeta?: any;
          }>(endpoint);

          // Get field mapping from cache for custom field name resolution
          const fieldMappingResult = await kv.app.get("jira_field_mapping");
          const fieldMapping: Record<string, FieldMetadata> =
            fieldMappingResult?.value || {};

          // Extract custom fields with their display names and simplified values
          const customFields: Record<string, any> = {};
          for (const [key, value] of Object.entries(issue.fields || {})) {
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

          await events.emit({
            id: issue.id,
            key: issue.key,
            issueUrl: issue.self,
            fields: issue.fields,
            customFields,
            expand: issue.expand,
            names: issue.names,
            renderedFields: issue.renderedFields,
            changelog: issue.changelog,
            transitions: issue.transitions,
            operations: issue.operations,
            editmeta: issue.editmeta,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          throw new Error(`Failed to get issue: ${errorMessage}`);
        }
      },
    },
  },

  outputs: {
    default: {
      name: "Issue Details",
      description:
        "The retrieved issue with requested fields and expanded data",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
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
          fields: {
            type: "object",
            description:
              "The issue fields (structure depends on 'fields' parameter)",
          },
          customFields: {
            type: "object",
            description:
              "Custom fields with their display names as keys. Values vary by field type.",
            additionalProperties: true,
          },
          expand: {
            type: "string",
            description: "The expand parameter used in the request",
          },
          names: {
            type: "object",
            description: "Translated field names (when expand=names)",
          },
          renderedFields: {
            type: "object",
            description:
              "HTML-rendered field values (when expand=renderedFields)",
          },
          changelog: {
            type: "object",
            description: "Issue change history (when expand=changelog)",
          },
          transitions: {
            type: "array",
            description: "Available transitions (when expand=transitions)",
            items: { type: "object" },
          },
          operations: {
            type: "object",
            description: "Available operations (when expand=operations)",
          },
          editmeta: {
            type: "object",
            description: "Edit metadata (when expand=editmeta)",
          },
        },
        required: ["id", "key", "issueUrl", "fields", "customFields"],
      },
    },
  },
};
