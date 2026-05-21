import { RESERVED_PREFIX } from "./constants.js";

const PATH_PARAM_PATTERN = /:([A-Za-z_][A-Za-z0-9_]*)/g;

export function normalizeApiPath(path: string): string {
  if (path === "/") {
    return path;
  }

  return path.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
}

export function extractPathParams(path: string): string[] {
  return [...path.matchAll(PATH_PARAM_PATTERN)].map((match) => match[1]);
}

export function isReservedPath(path: string): boolean {
  return path === RESERVED_PREFIX || path.startsWith(`${RESERVED_PREFIX}/`);
}

export function isValidApiPath(path: string): boolean {
  return (
    path.startsWith("/") &&
    !path.includes("?") &&
    !path.includes("#") &&
    !/\s/.test(path) &&
    !isReservedPath(path)
  );
}

export function methodPathKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${normalizeApiPath(path)}`;
}
