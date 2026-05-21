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
});
