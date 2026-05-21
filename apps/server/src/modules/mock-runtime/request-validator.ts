import { isFixedValueSchemaNode, type ApiDefinition, type JsonValue, type ObjectSchema, type SchemaNode, type ValidationIssue } from "@mockforge/shared";

export type RuntimeRequestParts = {
  path: Record<string, unknown>;
  query: Record<string, unknown>;
  body: unknown;
};

export function validateRuntimeRequest(api: ApiDefinition, request: RuntimeRequestParts): ValidationIssue[] {
  return [
    ...validateObjectSchema(api.request.path, request.path, "path"),
    ...validateObjectSchema(api.request.query, request.query, "query"),
    ...validateObjectSchema(api.request.body, request.body, "body")
  ];
}

function validateObjectSchema(schema: ObjectSchema, value: unknown, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (Object.keys(schema).length === 0 || value === undefined || value === null) {
    return issues;
  }

  if (!isRecord(value)) {
    return [{ path, message: `${path} 必须是对象` }];
  }

  for (const [key, childSchema] of Object.entries(schema)) {
    const childValue = value[key];
    if (childValue === undefined) {
      continue;
    }

    issues.push(...validateNode(childSchema, normalizeValue(childValue), `${path}.${key}`));
  }

  return issues;
}

function validateNode(schema: SchemaNode, value: unknown, path: string): ValidationIssue[] {
  if (value === undefined) {
    return [];
  }

  if (typeof schema === "string") {
    return validatePrimitive(schema, value, path);
  }

  if (Array.isArray(schema)) {
    if (!Array.isArray(value)) {
      return [{ path, message: "字段必须是数组" }];
    }

    return value.flatMap((item, index) => validateNode(schema[0], item, `${path}[${index}]`));
  }

  if (isFixedValueSchemaNode(schema)) {
    return validateFixedValue(schema.$type, schema.$value, value, path);
  }

  if (!isRecord(value)) {
    return [{ path, message: "字段必须是对象" }];
  }

  return Object.entries(schema).flatMap(([key, childSchema]) => {
    if (!(key in value)) {
      return [];
    }

    return validateNode(childSchema, value[key], `${path}.${key}`);
  });
}

function validateFixedValue(type: string, expected: JsonValue, value: unknown, path: string): ValidationIssue[] {
  const coerced = coerceRuntimeValue(type, value);

  if (coerced === invalidValue) {
    return [{ path, message: `字段必须是 ${type}` }];
  }

  if (!jsonEquals(coerced, expected)) {
    return [{ path, message: `字段必须等于固定值 ${JSON.stringify(expected)}` }];
  }

  return [];
}

function validatePrimitive(type: string, value: unknown, path: string): ValidationIssue[] {
  switch (type) {
    case "string":
    case "email":
    case "url":
    case "uuid":
    case "datetime":
    case "date":
      return typeof value === "string" ? [] : [{ path, message: `字段必须是 ${type}` }];
    case "number":
      return isFiniteNumber(value) ? [] : [{ path, message: "字段必须是 number" }];
    case "integer":
      return isInteger(value) ? [] : [{ path, message: "字段必须是 integer" }];
    case "boolean":
      return isBooleanLike(value) ? [] : [{ path, message: "字段必须是 boolean" }];
    case "object":
      return isRecord(value) ? [] : [{ path, message: "字段必须是 object" }];
    case "array":
      return Array.isArray(value) ? [] : [{ path, message: "字段必须是 array" }];
    case "null":
      return value === null ? [] : [{ path, message: "字段必须是 null" }];
    default:
      return [{ path, message: `未知字段类型 ${type}` }];
  }
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function isFiniteNumber(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  return typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value));
}

function isInteger(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isInteger(value);
  }

  return typeof value === "string" && /^-?\d+$/.test(value);
}

function isBooleanLike(value: unknown): boolean {
  return typeof value === "boolean" || value === "true" || value === "false";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const invalidValue = Symbol("invalid");

function coerceRuntimeValue(type: string, value: unknown): JsonValue | typeof invalidValue {
  switch (type) {
    case "string":
    case "email":
    case "url":
    case "uuid":
    case "datetime":
    case "date":
      return typeof value === "string" ? value : invalidValue;
    case "number":
      return isFiniteNumber(value) ? Number(value) : invalidValue;
    case "integer":
      return isInteger(value) ? Number(value) : invalidValue;
    case "boolean":
      if (typeof value === "boolean") {
        return value;
      }

      if (value === "true") {
        return true;
      }

      if (value === "false") {
        return false;
      }

      return invalidValue;
    case "object":
      return isJsonValue(value) && isRecord(value) ? value : invalidValue;
    case "array":
      return isJsonValue(value) && Array.isArray(value) ? value : invalidValue;
    case "null":
      return value === null ? null : invalidValue;
    default:
      return invalidValue;
  }
}

function jsonEquals(left: JsonValue, right: JsonValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return typeof value !== "number" || Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every(isJsonValue);
}
