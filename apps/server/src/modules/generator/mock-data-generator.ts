import { faker } from "@faker-js/faker";
import type { SchemaNode } from "@mockforge/shared";

export type GenerateOptions = {
  arrayMinLength: number;
  arrayMaxLength: number;
};

export function generateMockData(schema: SchemaNode, options: GenerateOptions): unknown {
  if (typeof schema === "string") {
    return generatePrimitive(schema);
  }

  if (Array.isArray(schema)) {
    const length = faker.number.int({ min: options.arrayMinLength, max: options.arrayMaxLength });
    return Array.from({ length }, () => generateMockData(schema[0], options));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    result[key] = generateMockData(value, options);
  }
  return result;
}

function generatePrimitive(type: string): unknown {
  switch (type) {
    case "string":
      return faker.lorem.words({ min: 1, max: 4 });
    case "number":
      return faker.number.float({ min: 1, max: 9999, fractionDigits: 2 });
    case "integer":
      return faker.number.int({ min: 1, max: 9999 });
    case "boolean":
      return faker.datatype.boolean();
    case "datetime":
      return faker.date.recent({ days: 30 }).toISOString();
    case "date":
      return faker.date.recent({ days: 30 }).toISOString().slice(0, 10);
    case "email":
      return faker.internet.email();
    case "url":
      return faker.internet.url();
    case "uuid":
      return faker.string.uuid();
    case "object":
      return {};
    case "array":
      return [];
    case "null":
      return null;
    default:
      return null;
  }
}
