/**
 * Validates if a webhook payload matches the block's filter configuration
 */
export function validatePayloadAgainstBlockConfig(
  messageBody: any,
  blockConfig: Record<string, any>,
): boolean {
  if (!blockConfig) {
    return true; // No config means no filters, allow everything
  }

  const { issue } = messageBody;
  if (!issue) {
    return true; // No issue data to filter on
  }

  // Project key filter
  if (
    blockConfig.projectKeys &&
    Array.isArray(blockConfig.projectKeys) &&
    blockConfig.projectKeys.length > 0
  ) {
    const projectKey = issue.project || issue.fields?.project?.key;
    if (!projectKey || !blockConfig.projectKeys.includes(projectKey)) {
      return false;
    }
  }

  // Issue type filter
  if (
    blockConfig.issueTypes &&
    Array.isArray(blockConfig.issueTypes) &&
    blockConfig.issueTypes.length > 0
  ) {
    const issueType =
      issue.issueType ||
      issue.fields?.issuetype?.name ||
      issue.fields?.issueType?.name;
    if (!issueType || !blockConfig.issueTypes.includes(issueType)) {
      return false;
    }
  }

  // Priority filter
  if (
    blockConfig.priorities &&
    Array.isArray(blockConfig.priorities) &&
    blockConfig.priorities.length > 0
  ) {
    const priority = issue.priority || issue.fields?.priority?.name;
    if (!priority || !blockConfig.priorities.includes(priority)) {
      return false;
    }
  }

  // Status filter (for issue updates)
  if (
    blockConfig.statuses &&
    Array.isArray(blockConfig.statuses) &&
    blockConfig.statuses.length > 0
  ) {
    const status = issue.status || issue.fields?.status?.name;
    if (!status || !blockConfig.statuses.includes(status)) {
      return false;
    }
  }

  return true; // Passed all filters
}
