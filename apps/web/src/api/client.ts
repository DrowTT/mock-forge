import type { ApiDefinition, ImportConfig, ImportStrategy, SchemaNode } from "@mockforge/shared";

export type ApiListResponse = {
  items: ApiDefinition[];
  total: number;
};

export type ValidationIssue = {
  path: string;
  message: string;
};

export type ValidationResponse =
  | {
      success: true;
      data: ImportConfig;
      issues: [];
    }
  | {
      success: false;
      issues: ValidationIssue[];
    };

const ADMIN_PREFIX = "/__mockforge/api";

export class ApiClient {
  constructor(private readonly getToken: () => string) {}

  listApis(): Promise<ApiListResponse> {
    return this.request("/apis");
  }

  createApi(payload: unknown): Promise<ApiDefinition> {
    return this.request("/apis", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  updateApi(id: string, payload: unknown): Promise<ApiDefinition> {
    return this.request(`/apis/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  deleteApi(id: string): Promise<void> {
    return this.request(`/apis/${id}`, {
      method: "DELETE"
    });
  }

  validateImport(config: unknown): Promise<ValidationResponse> {
    return this.request("/import/validate", {
      method: "POST",
      body: JSON.stringify(config)
    });
  }

  importConfig(strategy: ImportStrategy, config: ImportConfig): Promise<{ imported: number; updated: number; items: ApiDefinition[] }> {
    return this.request("/import", {
      method: "POST",
      body: JSON.stringify({ strategy, config })
    });
  }

  previewResponse(schema: SchemaNode): Promise<{ data: unknown }> {
    return this.request("/preview-response", {
      method: "POST",
      body: JSON.stringify({ schema })
    });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const response = await fetch(`${ADMIN_PREFIX}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-mockforge-token": token } : {}),
        ...init.headers
      }
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const payload = (await response.json().catch(() => ({}))) as T & {
      error?: { message?: string; details?: Array<{ path: string; message: string }> };
    };

    if (!response.ok) {
      const details = payload.error?.details?.map((item) => `${item.path}: ${item.message}`).join("\n");
      throw new Error([payload.error?.message ?? response.statusText, details].filter(Boolean).join("\n"));
    }

    return payload;
  }
}
