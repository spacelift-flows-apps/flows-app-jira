/**
 * Extracts the actual value from Jira custom field data.
 * Jira wraps select/dropdown values in objects like {id, self, value}.
 * This function extracts just the meaningful value.
 */
export function extractFieldValue(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle arrays (e.g., multi-select fields, multiple users)
  if (Array.isArray(value)) {
    return value.map((item) => extractFieldValue(item));
  }

  if (typeof value === "object") {
    // Handle user/person fields (have accountId)
    if ("accountId" in value) {
      return {
        accountId: value.accountId,
        displayName: value.displayName,
        emailAddress: value.emailAddress,
      };
    }

    // Handle objects with a 'value' property (e.g., dropdown, select fields)
    if ("value" in value) {
      return value.value;
    }

    // Handle objects with a 'name' property (e.g., status objects)
    if ("name" in value) {
      return value.name;
    }
  }

  return value;
}
