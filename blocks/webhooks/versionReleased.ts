import { AppBlock, events } from "@slflows/sdk/v1";

export const versionReleased: AppBlock = {
  name: "Version Released",
  description: "Triggered when a Jira version is released via webhook",
  category: "Webhooks",
  entrypoint: true,

  inputs: {},

  onInternalMessage: async (input) => {
    const { version, user } = input.message.body;

    try {
      // Extract key information from the version
      const versionData = {
        id: version.id,
        name: version.name,
        description: version.description,
        archived: version.archived,
        released: version.released,
        startDate: version.startDate,
        releaseDate: version.releaseDate,
        projectId: version.projectId,
        self: version.self,
      };

      // Extract user information
      const releasedBy = user
        ? {
            accountId: user.accountId,
            displayName: user.displayName,
            emailAddress: user.emailAddress,
          }
        : null;

      await events.emit({
        version: versionData,
        releasedBy,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `Failed to process version released webhook: ${errorMessage}`,
      );
    }
  },

  outputs: {
    default: {
      name: "Version Released Event",
      description: "Processed version release event data",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          version: {
            type: "object",
            description: "The released version data",
            properties: {
              id: { type: "string", description: "Version ID" },
              name: {
                type: "string",
                description: "Version name (e.g., '1.0.0')",
              },
              description: {
                type: "string",
                description: "Version description",
              },
              archived: {
                type: "boolean",
                description: "Whether the version is archived",
              },
              released: {
                type: "boolean",
                description: "Whether the version is released",
              },
              startDate: { type: "string", description: "Version start date" },
              releaseDate: {
                type: "string",
                description: "Version release date",
              },
              projectId: { type: "string", description: "Project ID" },
              self: { type: "string", description: "Version API URL" },
            },
            required: ["id", "name"],
          },
          releasedBy: {
            type: "object",
            description: "User who released the version",
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
        required: ["version", "timestamp"],
      },
    },
  },
};
