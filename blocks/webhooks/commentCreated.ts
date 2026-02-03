import { AppBlock, events } from "@slflows/sdk/v1";

export const commentCreated: AppBlock = {
  name: "Comment Created",
  description:
    "Triggered when a new comment is added to a Jira issue via webhook",
  category: "Webhooks",

  config: {
    projectKeys: {
      name: "Project Keys",
      description:
        "Filter by project keys (optional). Leave empty to receive all projects.",
      type: ["string"],
      required: false,
    },
  },

  inputs: {},

  onInternalMessage: async (input) => {
    const { issue, comment } = input.message.body;

    console.log(
      "Full comment webhook payload:",
      JSON.stringify(input.message.body, null, 2),
    );

    try {
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
      };

      // Extract comment information
      const commentData = {
        id: comment.id,
        body: comment.body,
        created: comment.created,
        updated: comment.updated,
        self: comment.self,
      };

      // Extract user information
      const createdBy = comment.author
        ? {
            accountId: comment.author.accountId,
            displayName: comment.author.displayName,
            emailAddress: comment.author.emailAddress,
          }
        : null;

      await events.emit({
        issue: issueData,
        comment: commentData,
        createdBy,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `Failed to process comment created webhook: ${errorMessage}`,
      );
    }
  },

  outputs: {
    default: {
      name: "Comment Created Event",
      description: "Processed comment creation event data",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          issue: {
            type: "object",
            description: "Issue the comment was added to",
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
            },
            required: ["id", "key"],
          },
          comment: {
            type: "object",
            description: "The created comment data",
            properties: {
              id: { type: "string", description: "Comment ID" },
              body: { type: "string", description: "Comment text content" },
              created: {
                type: "string",
                description: "Comment creation timestamp",
              },
              updated: {
                type: "string",
                description: "Comment last updated timestamp",
              },
              self: { type: "string", description: "Comment API URL" },
            },
            required: ["id", "body", "created"],
          },
          createdBy: {
            type: "object",
            description: "User who created the comment",
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
        required: ["issue", "comment", "timestamp"],
      },
    },
  },
};
