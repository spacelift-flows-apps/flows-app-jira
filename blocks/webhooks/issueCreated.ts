import { AppBlock, events, kv } from "@slflows/sdk/v1";
import { extractFieldValue } from "./helpers";

export const issueCreated: AppBlock = {
  name: "Issue Created",
  description: "Triggered when a new Jira issue is created via webhook",
  category: "Webhooks",

  inputs: {},

  onInternalMessage: async (input) => {
    const { issue, user } = input.message.body;

    try {
      // Get field mapping from cache for custom field name resolution
      const fieldMappingResult = await kv.app.get("jira_field_mapping");
      const fieldMapping: Record<string, string> =
        fieldMappingResult?.value || {};

      // Extract custom fields with their display names and simplified values
      const customFields: Record<string, any> = {};
      for (const [key, value] of Object.entries(issue.fields || {})) {
        if (key.startsWith("customfield_") && value !== null) {
          const fieldName = fieldMapping[key];
          if (!fieldName) {
            console.warn(
              `Unknown custom field "${key}" - consider re-syncing the Jira app to refresh field mappings`,
            );
          }
          customFields[fieldName || key] = extractFieldValue(value);
        }
      }

      // Extract key information from the issue
      const issueData = {
        id: issue.id,
        key: issue.key,
        summary: issue.fields?.summary,
        status: issue.fields?.status?.name,
        assignee: issue.fields?.assignee?.displayName,
        priority: issue.fields?.priority?.name,
        issueType: issue.fields?.issuetype?.name,
        project: issue.fields?.project?.key,
        labels: issue.fields?.labels || [],
        created: issue.fields?.created,
        customFields,
      };

      // Extract user information
      const createdBy = user
        ? {
            accountId: user.accountId,
            displayName: user.displayName,
            emailAddress: user.emailAddress,
          }
        : null;

      await events.emit({
        issue: issueData,
        createdBy,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `Failed to process issue created webhook: ${errorMessage}`,
      );
    }
  },

  outputs: {
    default: {
      name: "Issue Created Event",
      description: "Processed issue creation event data",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          issue: {
            type: "object",
            description: "Structured issue data",
            properties: {
              id: { type: "string", description: "Issue ID" },
              key: {
                type: "string",
                description: "Issue key (e.g., PROJ-123)",
              },
              summary: { type: "string", description: "Issue summary" },
              status: { type: "string", description: "Current status" },
              assignee: {
                type: "string",
                description: "Assignee display name",
              },
              priority: { type: "string", description: "Priority level" },
              issueType: { type: "string", description: "Issue type" },
              project: { type: "string", description: "Project key" },
              labels: {
                type: "array",
                description: "Issue labels",
                items: { type: "string" },
              },
              created: { type: "string", description: "Creation timestamp" },
              customFields: {
                type: "object",
                description:
                  "Custom fields with their display names as keys. Values vary by field type.",
                additionalProperties: true,
              },
            },
            required: ["id", "key", "customFields"],
          },
          createdBy: {
            type: "object",
            description: "User who created the issue",
            properties: {
              accountId: { type: "string", description: "User account ID" },
              displayName: { type: "string", description: "User display name" },
              emailAddress: { type: "string", description: "User email" },
            },
          },
          timestamp: {
            type: "string",
            description: "When the event was processed",
          },
        },
        required: ["issue", "timestamp"],
      },
    },
  },
};
