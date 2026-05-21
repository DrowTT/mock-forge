import type { FastifyReply, FastifyRequest } from "fastify";

export function createAdminAuth(adminToken: string) {
  return async function adminAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!adminToken) {
      return;
    }

    const headerToken = request.headers["x-mockforge-token"];
    const authHeader = request.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
    const token = Array.isArray(headerToken) ? headerToken[0] : headerToken || bearerToken;

    if (token !== adminToken) {
      reply.code(401).send({
        error: {
          code: "UNAUTHORIZED",
          message: "MockForge admin token is required."
        }
      });
    }
  };
}
