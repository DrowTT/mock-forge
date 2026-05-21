import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

let dataDir = "";

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "mockforge-"));
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

describe("MockForge server", () => {
  it("imports an API config and serves the mock endpoint", async () => {
    const app = await buildApp({ dataDir, logger: false });

    const imported = await app.inject({
      method: "POST",
      url: "/__mockforge/api/import",
      payload: {
        strategy: "upsert",
        config: {
          version: "1.0",
          apis: [
            {
              name: "用户列表",
              method: "GET",
              path: "/api/users",
              request: {
                query: { page: "integer" },
                path: {},
                body: {}
              },
              response: {
                status: 200,
                body: {
                  code: { $type: "integer", $value: 0 },
                  data: {
                    page: { $type: "integer", $value: 1 },
                    pageSize: { $type: "integer", $value: 10 },
                    list: [{ id: "integer", email: "email" }]
                  }
                }
              }
            }
          ]
        }
      }
    });

    expect(imported.statusCode).toBe(200);

    const response = await app.inject({
      method: "GET",
      url: "/api/users?page=1"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty("data.list");
    expect(response.json()).toMatchObject({
      code: 0,
      data: {
        page: 1,
        pageSize: 10
      }
    });

    await app.close();
  });
});
