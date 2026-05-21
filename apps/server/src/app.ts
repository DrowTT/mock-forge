import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import type { AppEnv } from "./config/env.js";
import { loadEnv } from "./config/env.js";
import { registerAdminRoutes } from "./modules/admin/admin.routes.js";
import { ConfigError, FileConfigStore } from "./modules/config-store/file-config-store.js";
import { MockRuntimeDispatcher } from "./modules/mock-runtime/dispatcher.js";

export async function buildApp(overrides: Partial<AppEnv> = {}): Promise<FastifyInstance> {
  const env = loadEnv(overrides);
  const app = Fastify({ logger: env.logger });
  const store = new FileConfigStore(env.dataDir);
  await store.init();

  await app.register(cors, {
    origin: env.corsOrigins === "*" ? true : env.corsOrigins
  });

  await registerAdminRoutes(app, store, env);
  await registerManagementUi(app);

  const dispatcher = new MockRuntimeDispatcher(store, {
    arrayMinLength: env.arrayMinLength,
    arrayMaxLength: env.arrayMaxLength
  });

  app.route({
    method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    url: "/*",
    handler: (request, reply) => dispatcher.handle(request, reply)
  });

  app.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
    if (error instanceof ConfigError) {
      reply.code(error.statusCode).send({
        error: {
          code: "CONFIG_ERROR",
          message: error.message,
          details: error.details
        }
      });
      return;
    }

    if (error.statusCode === 400) {
      reply.code(400).send({
        error: {
          code: "BAD_REQUEST",
          message: error.message
        }
      });
      return;
    }

    app.log.error(error);
    reply.code(500).send({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "MockForge server error."
      }
    });
  });

  if (process.env.NODE_ENV === "production" && !env.adminToken) {
    app.log.warn("MOCKFORGE_ADMIN_TOKEN is not set. Admin APIs are public.");
  }

  return app;
}

async function registerManagementUi(app: FastifyInstance): Promise<void> {
  const publicRoot = resolve(process.cwd(), "public");
  const indexHtml = resolve(publicRoot, "index.html");

  if (!existsSync(indexHtml)) {
    app.get("/__mockforge", async () => ({
      message: "MockForge management UI is not built yet. Run pnpm build before production start."
    }));
    return;
  }

  await app.register(fastifyStatic, {
    root: resolve(publicRoot, "assets"),
    prefix: "/__mockforge/assets/"
  });

  const sendIndex = async (_request: unknown, reply: { type: (contentType: string) => { send: (payload: string) => void } }) => {
    const html = await readFile(indexHtml, "utf8");
    reply.type("text/html; charset=utf-8").send(html);
  };

  app.get("/__mockforge", sendIndex);
  app.get("/__mockforge/*", sendIndex);
}
