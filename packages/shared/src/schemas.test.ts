import { describe, expect, it } from "vitest";
import { validateImportConfig } from "./schemas.js";

describe("validateImportConfig", () => {
  it("accepts a valid AI import config", () => {
    const result = validateImportConfig({
      version: "1.0",
      apis: [
        {
          name: "获取用户",
          method: "GET",
          path: "/api/users/:id",
          request: {
            query: {},
            path: { id: "integer" },
            body: {}
          },
          response: {
            status: 200,
            body: {
              code: "integer",
              data: {
                id: "integer",
                email: "email"
              }
            }
          }
        }
      ]
    });

    expect(result.success).toBe(true);
  });

  it("rejects reserved mockforge paths", () => {
    const result = validateImportConfig({
      version: "1.0",
      apis: [
        {
          name: "坏接口",
          method: "GET",
          path: "/__mockforge/api/apis",
          request: { query: {}, path: {}, body: {} },
          response: { status: 200, body: { ok: "boolean" } }
        }
      ]
    });

    expect(result.success).toBe(false);
  });
});
