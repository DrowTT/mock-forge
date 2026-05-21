import { z } from "zod";
import {
  CONFIG_VERSION,
  HTTP_METHODS,
  IMPORT_API_LIMIT,
  PRIMITIVE_TYPES,
  SCHEMA_MAX_DEPTH,
  SCHEMA_MAX_FIELDS,
  UNSAFE_FIELD_NAMES
} from "./constants.js";
import { extractPathParams, isValidApiPath, methodPathKey, normalizeApiPath } from "./path-utils.js";
import type {
  ApiDefinition,
  FixedValueSchemaNode,
  ImportApiDefinition,
  ImportConfig,
  JsonValue,
  ObjectSchema,
  SchemaNode,
  StoredConfig,
  ValidationIssue,
  ValidationResult
} from "./types.js";

const primitiveTypeSet = new Set<string>(PRIMITIVE_TYPES);
const fixedValueNodeKeys = new Set(["$type", "$value"]);

const baseRequestSchema = z.object({
  query: z.record(z.string(), z.unknown()).default({}),
  path: z.record(z.string(), z.unknown()).default({}),
  body: z.record(z.string(), z.unknown()).default({})
});

const baseResponseSchema = z.object({
  status: z.number().int().min(100).max(599),
  body: z.unknown()
});

const baseImportApiSchema = z.object({
  name: z.string().trim().min(1, "接口名称不能为空"),
  method: z.enum(HTTP_METHODS),
  path: z.string().trim().min(1, "接口路径不能为空").transform(normalizeApiPath),
  request: baseRequestSchema,
  response: baseResponseSchema
});

export const importConfigEnvelopeSchema = z.object({
  version: z.literal(CONFIG_VERSION),
  apis: z.array(baseImportApiSchema).max(IMPORT_API_LIMIT, `单次最多导入 ${IMPORT_API_LIMIT} 个接口`)
});

export const apiDefinitionSchema = baseImportApiSchema.extend({
  id: z.string().min(1),
  enabled: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const storedConfigSchema = z.object({
  version: z.literal(CONFIG_VERSION),
  apis: z.array(apiDefinitionSchema)
});

export function validateSchemaNode(
  value: unknown,
  options: {
    rootPath?: string;
    objectOnly?: boolean;
    maxDepth?: number;
    maxFields?: number;
  } = {}
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const state = {
    fields: 0,
    maxDepth: options.maxDepth ?? SCHEMA_MAX_DEPTH,
    maxFields: options.maxFields ?? SCHEMA_MAX_FIELDS
  };

  visitSchemaNode(value, options.rootPath ?? "$", 0, issues, state, Boolean(options.objectOnly));
  return issues;
}

function visitSchemaNode(
  value: unknown,
  path: string,
  depth: number,
  issues: ValidationIssue[],
  state: { fields: number; maxDepth: number; maxFields: number },
  objectOnly: boolean
): void {
  if (depth > state.maxDepth) {
    issues.push({ path, message: `schema 嵌套深度不能超过 ${state.maxDepth}` });
    return;
  }

  if (typeof value === "string") {
    if (objectOnly) {
      issues.push({ path, message: "该位置必须是对象 schema，不能是基础类型" });
      return;
    }

    if (!primitiveTypeSet.has(value)) {
      issues.push({ path, message: `不支持的字段类型：${value}` });
    }
    return;
  }

  if (Array.isArray(value)) {
    if (objectOnly) {
      issues.push({ path, message: "该位置必须是对象 schema，不能是数组" });
      return;
    }

    if (value.length !== 1) {
      issues.push({ path, message: "数组 schema 必须且只能包含一个元素" });
      return;
    }

    visitSchemaNode(value[0], `${path}[0]`, depth + 1, issues, state, false);
    return;
  }

  if (!isPlainRecord(value)) {
    issues.push({ path, message: "schema 节点必须是字段类型字符串、对象或单元素数组" });
    return;
  }

  if (isFixedValueSchemaNode(value)) {
    if (objectOnly) {
      issues.push({ path, message: "该位置必须是对象 schema，不能是固定值节点" });
      return;
    }

    issues.push(...validateFixedValueSchemaNode(value, path));
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    state.fields += 1;
    const childPath = `${path}.${key}`;

    if (state.fields > state.maxFields) {
      issues.push({ path: childPath, message: `单个 schema 字段数量不能超过 ${state.maxFields}` });
      return;
    }

    if (UNSAFE_FIELD_NAMES.has(key)) {
      issues.push({ path: childPath, message: `字段名 ${key} 不安全，不能使用` });
      continue;
    }

    if (!/^[A-Za-z_$\u4e00-\u9fa5][A-Za-z0-9_$\u4e00-\u9fa5-]*$/.test(key)) {
      issues.push({ path: childPath, message: `字段名 ${key} 不合法` });
      continue;
    }

    visitSchemaNode(child, childPath, depth + 1, issues, state, false);
  }
}

export function isFixedValueSchemaNode(value: unknown): value is FixedValueSchemaNode {
  if (!isPlainRecord(value)) {
    return false;
  }

  const keys = Object.keys(value);
  return keys.length === 2 && keys.every((key) => fixedValueNodeKeys.has(key)) && "$type" in value && "$value" in value;
}

export function validateFixedValueSchemaNode(value: FixedValueSchemaNode, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!primitiveTypeSet.has(value.$type)) {
    issues.push({ path: `${path}.$type`, message: `不支持的字段类型：${String(value.$type)}` });
    return issues;
  }

  if (!isJsonValue(value.$value)) {
    issues.push({ path: `${path}.$value`, message: "固定值必须是合法 JSON 值" });
    return issues;
  }

  if (!fixedValueMatchesType(value.$type, value.$value)) {
    issues.push({ path: `${path}.$value`, message: `固定值必须符合 ${value.$type} 类型` });
  }

  return issues;
}

export function fixedValueMatchesType(type: string, value: JsonValue): boolean {
  switch (type) {
    case "string":
    case "datetime":
    case "date":
    case "email":
    case "url":
    case "uuid":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "object":
      return isPlainRecord(value);
    case "array":
      return Array.isArray(value);
    case "null":
      return value === null;
    default:
      return false;
  }
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return typeof value !== "number" || Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (!isPlainRecord(value)) {
    return false;
  }

  return Object.entries(value).every(([key, child]) => !UNSAFE_FIELD_NAMES.has(key) && isJsonValue(child));
}

export function validateImportConfig(input: unknown): ValidationResult<ImportConfig> {
  const parsed = importConfigEnvelopeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.length ? issue.path.join(".") : "$",
        message: issue.message
      }))
    };
  }

  const issues = validateApiDefinitions(parsed.data.apis);
  if (issues.length > 0) {
    return { success: false, issues };
  }

  return {
    success: true,
    data: parsed.data as ImportConfig,
    issues: []
  };
}

export function validateImportApiDefinition(input: unknown): ValidationResult<ImportApiDefinition> {
  const parsed = baseImportApiSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.length ? issue.path.join(".") : "$",
        message: issue.message
      }))
    };
  }

  const issues = validateApiDefinitions([parsed.data]);
  if (issues.length > 0) {
    return { success: false, issues };
  }

  return {
    success: true,
    data: parsed.data as ImportApiDefinition,
    issues: []
  };
}

function validateApiDefinitions(apis: Array<z.infer<typeof baseImportApiSchema>>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();

  apis.forEach((api, index) => {
    const basePath = `apis.${index}`;
    const key = methodPathKey(api.method, api.path);

    if (seen.has(key)) {
      issues.push({ path: `${basePath}.path`, message: `重复的接口定义：${key}` });
    }
    seen.add(key);

    if (!isValidApiPath(api.path)) {
      issues.push({
        path: `${basePath}.path`,
        message: "接口路径必须以 / 开头，不能包含空格、query、hash，且不能使用 /__mockforge 保留前缀"
      });
    }

    const pathParams = new Set(extractPathParams(api.path));
    const configuredPathParams = Object.keys(api.request.path);

    for (const paramName of pathParams) {
      if (!(paramName in api.request.path)) {
        issues.push({ path: `${basePath}.request.path.${paramName}`, message: "路径参数缺少类型定义" });
      }
    }

    for (const paramName of configuredPathParams) {
      if (!pathParams.has(paramName)) {
        issues.push({ path: `${basePath}.request.path.${paramName}`, message: "request.path 中存在路径里没有的参数" });
      }
    }

    issues.push(
      ...validateSchemaNode(api.request.query, { rootPath: `${basePath}.request.query`, objectOnly: true }),
      ...validateSchemaNode(api.request.path, { rootPath: `${basePath}.request.path`, objectOnly: true }),
      ...validateSchemaNode(api.request.body, { rootPath: `${basePath}.request.body`, objectOnly: true }),
      ...validateSchemaNode(api.response.body, { rootPath: `${basePath}.response.body` })
    );
  });

  return issues;
}

export function validateStoredConfig(input: unknown): ValidationResult<StoredConfig> {
  const parsed = storedConfigSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.length ? issue.path.join(".") : "$",
        message: issue.message
      }))
    };
  }

  const issues = validateApiDefinitions(parsed.data.apis);
  if (issues.length > 0) {
    return { success: false, issues };
  }

  return {
    success: true,
    data: parsed.data as StoredConfig,
    issues: []
  };
}

export function asObjectSchema(value: unknown): ObjectSchema {
  return isPlainRecord(value) ? (value as ObjectSchema) : {};
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
