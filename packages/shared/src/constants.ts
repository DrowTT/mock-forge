export const CONFIG_VERSION = "1.0" as const;

export const RESERVED_PREFIX = "/__mockforge";

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export const PRIMITIVE_TYPES = [
  "string",
  "number",
  "integer",
  "boolean",
  "datetime",
  "date",
  "email",
  "url",
  "uuid",
  "object",
  "array",
  "null"
] as const;

export const IMPORT_API_LIMIT = 200;
export const SCHEMA_MAX_DEPTH = 20;
export const SCHEMA_MAX_FIELDS = 300;

export const DEFAULT_ARRAY_MIN_LENGTH = 1;
export const DEFAULT_ARRAY_MAX_LENGTH = 5;

export const UNSAFE_FIELD_NAMES = new Set(["__proto__", "prototype", "constructor"]);
