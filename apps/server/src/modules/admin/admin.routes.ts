import type { FastifyInstance } from "fastify";
import { validateImportConfig, validateSchemaNode, type ImportStrategy } from "@mockforge/shared";
import type { AppEnv } from "../../config/env.js";
import type { FileConfigStore } from "../config-store/file-config-store.js";
import { ConfigError } from "../config-store/file-config-store.js";
import { generateMockData } from "../generator/mock-data-generator.js";
import { createAdminAuth } from "../security/admin-auth.js";

const strategies = new Set<ImportStrategy>(["upsert", "append", "replaceAll"]);

export async function registerAdminRoutes(app: FastifyInstance, store: FileConfigStore, env: AppEnv): Promise<void> {
  const adminAuth = createAdminAuth(env.adminToken);

  app.get("/__mockforge/health", async () => ({
    ok: true,
    service: "mock-forge",
    version: "0.1.0"
  }));

  app.get("/__mockforge/api/apis", { preHandler: adminAuth }, async () => {
    const items = store.list();
    return { items, total: items.length };
  });

  app.post("/__mockforge/api/apis", { preHandler: adminAuth }, async (request) => store.create(request.body));

  app.put("/__mockforge/api/apis/:id", { preHandler: adminAuth }, async (request) => {
    const { id } = request.params as { id: string };
    return store.update(id, request.body);
  });

  app.delete("/__mockforge/api/apis/:id", { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await store.remove(id);
    reply.code(204).send();
  });

  app.post("/__mockforge/api/import/validate", { preHandler: adminAuth }, async (request, reply) => {
    const result = validateImportConfig(request.body);
    if (!result.success) {
      reply.code(400);
    }

    return result;
  });

  app.post("/__mockforge/api/import", { preHandler: adminAuth }, async (request) => {
    const body = request.body as { strategy?: ImportStrategy; config?: unknown };
    const strategy = body.strategy ?? "upsert";

    if (!strategies.has(strategy)) {
      throw new ConfigError("导入策略不合法", 400);
    }

    return store.importConfig(body.config, strategy);
  });

  app.post("/__mockforge/api/preview-response", { preHandler: adminAuth }, async (request) => {
    const body = request.body as { schema?: unknown; body?: unknown };
    const schema = body.schema ?? body.body ?? request.body;
    const issues = validateSchemaNode(schema, { rootPath: "schema" });

    if (issues.length > 0) {
      throw new ConfigError("响应 schema 不合法", 400, issues);
    }

    return {
      data: generateMockData(schema as never, {
        arrayMinLength: env.arrayMinLength,
        arrayMaxLength: env.arrayMaxLength
      })
    };
  });
}
