import { describe, expect, it } from "vitest";
import { generateMockData } from "./mock-data-generator.js";

describe("generateMockData", () => {
  it("generates nested data from schema", () => {
    const data = generateMockData(
      {
        code: "integer",
        data: {
          list: [{ id: "integer", email: "email" }]
        }
      },
      { arrayMinLength: 2, arrayMaxLength: 2 }
    ) as { code: number; data: { list: Array<{ id: number; email: string }> } };

    expect(typeof data.code).toBe("number");
    expect(data.data.list).toHaveLength(2);
    expect(typeof data.data.list[0]?.email).toBe("string");
  });

  it("returns configured fixed values without randomizing them", () => {
    const data = generateMockData(
      {
        code: { $type: "integer", $value: 0 },
        success: { $type: "boolean", $value: true },
        data: {
          page: { $type: "integer", $value: 1 },
          pageSize: { $type: "integer", $value: 10 },
          list: [{ id: "integer" }]
        }
      },
      { arrayMinLength: 1, arrayMaxLength: 1 }
    ) as { code: number; success: boolean; data: { page: number; pageSize: number; list: Array<{ id: number }> } };

    expect(data.code).toBe(0);
    expect(data.success).toBe(true);
    expect(data.data.page).toBe(1);
    expect(data.data.pageSize).toBe(10);
    expect(data.data.list).toHaveLength(1);
  });
});
