import type { FastifyReply, FastifyRequest } from "fastify";
import type { GenerateOptions } from "../generator/mock-data-generator.js";
import { generateMockData } from "../generator/mock-data-generator.js";
import type { FileConfigStore } from "../config-store/file-config-store.js";
import { RouteMatcher } from "./route-matcher.js";
import { validateRuntimeRequest } from "./request-validator.js";

export class MockRuntimeDispatcher {
  private readonly matcher = new RouteMatcher();

  constructor(
    private readonly store: FileConfigStore,
    private readonly generateOptions: GenerateOptions
  ) {}

  async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const match = this.matcher.find(request.method, request.url.split("?")[0] ?? request.url, this.store.list());

    if (!match) {
      reply.code(404).send({
        error: {
          code: "MOCK_API_NOT_FOUND",
          message: "No mock API matched the request."
        }
      });
      return;
    }

    const issues = validateRuntimeRequest(match.api, {
      path: match.params,
      query: normalizeQuery(request.query),
      body: request.body
    });

    if (issues.length > 0) {
      reply.code(400).send({
        error: {
          code: "INVALID_MOCK_REQUEST",
          message: "Request parameters do not match the configured schema.",
          details: issues
        }
      });
      return;
    }

    reply.code(match.api.response.status).send(generateMockData(match.api.response.body, this.generateOptions));
  }
}

function normalizeQuery(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
