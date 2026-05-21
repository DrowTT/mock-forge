import { match } from "path-to-regexp";
import { extractPathParams, type ApiDefinition } from "@mockforge/shared";

export type RouteMatch = {
  api: ApiDefinition;
  params: Record<string, string>;
};

export class RouteMatcher {
  find(method: string, pathname: string, apis: ApiDefinition[]): RouteMatch | undefined {
    const candidates = apis
      .filter((api) => api.enabled && api.method === method.toUpperCase())
      .sort(compareRoutes);

    for (const api of candidates) {
      const matcher = match<Record<string, string>>(api.path, {
        decode: decodeURIComponent,
        end: true
      });
      const result = matcher(pathname);

      if (result) {
        return {
          api,
          params: Object.fromEntries(
            Object.entries(result.params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
          )
        };
      }
    }

    return undefined;
  }
}

function compareRoutes(a: ApiDefinition, b: ApiDefinition): number {
  const aDynamicCount = extractPathParams(a.path).length;
  const bDynamicCount = extractPathParams(b.path).length;

  if (aDynamicCount !== bDynamicCount) {
    return aDynamicCount - bDynamicCount;
  }

  const aSegments = a.path.split("/").length;
  const bSegments = b.path.split("/").length;

  if (aSegments !== bSegments) {
    return bSegments - aSegments;
  }

  return a.createdAt.localeCompare(b.createdAt);
}
