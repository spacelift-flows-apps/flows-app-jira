import type { FieldMetadata } from "../../main";

/**
 * Extracts the actual value from Jira custom field data.
 * Jira wraps select/dropdown values in objects like {id, self, value}.
 * This function extracts just the meaningful value.
 *
 * @param value - The raw field value from Jira
 * @param metadata - Optional field metadata containing type information
 */
export function extractFieldValue(value: any, metadata?: FieldMetadata): any {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle arrays (e.g., multi-select fields, multiple users)
  if (Array.isArray(value)) {
    return value.map((item) => extractFieldValue(item, metadata));
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

    // Handle cascading dropdown fields (option-with-child type)
    if (metadata?.type === "option-with-child" && "value" in value) {
      return extractCascadingDropdownValue(value);
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

/**
 * Extracts values from a cascading dropdown field.
 * Cascading dropdowns have a nested structure: {value: "Parent", child: {value: "Child", ...}}
 * This function extracts it as: {parent: "Parent", child: "Child"}
 */
function extractCascadingDropdownValue(value: any): {
  parent: string;
  child?: string;
} {
  const result: { parent: string; child?: string } = {
    parent: value.value,
  };

  if (
    value.child &&
    typeof value.child === "object" &&
    "value" in value.child
  ) {
    result.child = value.child.value;
  }

  return result;
}
