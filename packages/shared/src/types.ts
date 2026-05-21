import type { HTTP_METHODS, PRIMITIVE_TYPES } from "./constants.js";

export type HttpMethod = (typeof HTTP_METHODS)[number];

export type PrimitiveType = (typeof PRIMITIVE_TYPES)[number];

export type JsonValue = string | number | boolean | null | JsonValue[] | { [fieldName: string]: JsonValue };

export type FixedValueSchemaNode = {
  $type: PrimitiveType;
  $value: JsonValue;
};

export type SchemaNode = PrimitiveType | FixedValueSchemaNode | { [fieldName: string]: SchemaNode } | [SchemaNode];

export type ObjectSchema = Record<string, SchemaNode>;

export type RequestSchema = {
  query: ObjectSchema;
  path: ObjectSchema;
  body: ObjectSchema;
};

export type ResponseSchema = {
  status: number;
  body: SchemaNode;
};

export type ImportApiDefinition = {
  name: string;
  method: HttpMethod;
  path: string;
  request: RequestSchema;
  response: ResponseSchema;
};

export type ImportConfig = {
  version: "1.0";
  apis: ImportApiDefinition[];
};

export type ApiDefinition = ImportApiDefinition & {
  id: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StoredConfig = {
  version: "1.0";
  apis: ApiDefinition[];
};

export type ValidationIssue = {
  path: string;
  message: string;
};

export type ValidationResult<T> =
  | {
      success: true;
      data: T;
      issues: [];
    }
  | {
      success: false;
      issues: ValidationIssue[];
    };

export type ImportStrategy = "upsert" | "append" | "replaceAll";
