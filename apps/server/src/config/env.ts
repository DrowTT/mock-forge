import { resolve } from "node:path";
import { DEFAULT_ARRAY_MAX_LENGTH, DEFAULT_ARRAY_MIN_LENGTH } from "@mockforge/shared";

export type AppEnv = {
  host: string;
  port: number;
  dataDir: string;
  adminToken: string;
  corsOrigins: string[] | "*";
  publicBaseUrl: string;
  arrayMinLength: number;
  arrayMaxLength: number;
  logger: boolean;
};

export function loadEnv(overrides: Partial<AppEnv> = {}): AppEnv {
  const arrayMinLength = readInteger("MOCKFORGE_ARRAY_MIN_LENGTH", DEFAULT_ARRAY_MIN_LENGTH);
  const arrayMaxLength = Math.max(readInteger("MOCKFORGE_ARRAY_MAX_LENGTH", DEFAULT_ARRAY_MAX_LENGTH), arrayMinLength);

  return {
    host: process.env.HOST ?? "0.0.0.0",
    port: readInteger("PORT", 3000),
    dataDir: resolve(process.env.MOCKFORGE_DATA_DIR ?? "./data"),
    adminToken: process.env.MOCKFORGE_ADMIN_TOKEN ?? "",
    corsOrigins: parseCorsOrigins(process.env.MOCKFORGE_CORS_ORIGINS ?? "*"),
    publicBaseUrl: process.env.MOCKFORGE_PUBLIC_BASE_URL ?? "",
    arrayMinLength,
    arrayMaxLength,
    logger: process.env.NODE_ENV !== "test",
    ...overrides
  };
}

function readInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCorsOrigins(raw: string): string[] | "*" {
  if (raw.trim() === "*") {
    return "*";
  }

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
