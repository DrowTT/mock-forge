import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  CONFIG_VERSION,
  methodPathKey,
  type ApiDefinition,
  type ImportApiDefinition,
  type ImportConfig,
  type ImportStrategy,
  type StoredConfig,
  validateImportApiDefinition,
  validateImportConfig,
  validateStoredConfig
} from "@mockforge/shared";

export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly details: unknown[] = []
  ) {
    super(message);
  }
}

export class FileConfigStore {
  private readonly filePath: string;
  private config: StoredConfig = { version: CONFIG_VERSION, apis: [] };

  constructor(private readonly dataDir: string) {
    this.filePath = join(dataDir, "mockforge.config.json");
  }

  async init(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });

    if (!existsSync(this.filePath)) {
      await this.writeConfig(this.config);
      return;
    }

    const content = await readFile(this.filePath, "utf8");
    const parsed = JSON.parse(content) as unknown;
    const result = validateStoredConfig(parsed);

    if (!result.success) {
      throw new ConfigError("配置文件格式不合法", 500, result.issues);
    }

    this.config = result.data;
  }

  list(): ApiDefinition[] {
    return [...this.config.apis].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  findById(id: string): ApiDefinition | undefined {
    return this.config.apis.find((api) => api.id === id);
  }

  async create(input: unknown): Promise<ApiDefinition> {
    const result = validateImportApiDefinition(input);
    if (!result.success) {
      throw new ConfigError("接口配置不合法", 400, result.issues);
    }

    this.ensureNoConflict(result.data.method, result.data.path);
    const api = this.toApiDefinition(result.data, readEnabled(input, true));

    await this.replaceConfig({
      version: CONFIG_VERSION,
      apis: [...this.config.apis, api]
    });

    return api;
  }

  async update(id: string, input: unknown): Promise<ApiDefinition> {
    const existing = this.findById(id);
    if (!existing) {
      throw new ConfigError("接口不存在", 404);
    }

    const result = validateImportApiDefinition(input);
    if (!result.success) {
      throw new ConfigError("接口配置不合法", 400, result.issues);
    }

    this.ensureNoConflict(result.data.method, result.data.path, id);
    const updated: ApiDefinition = {
      ...result.data,
      id,
      enabled: readEnabled(input, existing.enabled),
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };

    await this.replaceConfig({
      version: CONFIG_VERSION,
      apis: this.config.apis.map((api) => (api.id === id ? updated : api))
    });

    return updated;
  }

  async remove(id: string): Promise<void> {
    const before = this.config.apis.length;
    const apis = this.config.apis.filter((api) => api.id !== id);

    if (apis.length === before) {
      throw new ConfigError("接口不存在", 404);
    }

    await this.replaceConfig({ version: CONFIG_VERSION, apis });
  }

  async importConfig(configInput: unknown, strategy: ImportStrategy): Promise<{ imported: number; updated: number; items: ApiDefinition[] }> {
    const result = validateImportConfig(configInput);
    if (!result.success) {
      throw new ConfigError("导入配置不合法", 400, result.issues);
    }

    const now = new Date().toISOString();
    const incoming = result.data.apis;
    let apis = strategy === "replaceAll" ? [] : [...this.config.apis];
    let imported = 0;
    let updated = 0;

    if (strategy === "append") {
      for (const api of incoming) {
        const conflict = this.findByMethodPath(api.method, api.path, apis);
        if (conflict) {
          throw new ConfigError(`接口已存在：${methodPathKey(api.method, api.path)}`, 409);
        }
      }
    }

    for (const api of incoming) {
      const existing = this.findByMethodPath(api.method, api.path, apis);

      if (existing && strategy === "upsert") {
        apis = apis.map((item) =>
          item.id === existing.id
            ? {
                ...api,
                id: existing.id,
                enabled: existing.enabled,
                createdAt: existing.createdAt,
                updatedAt: now
              }
            : item
        );
        updated += 1;
        continue;
      }

      const created = this.toApiDefinition(api, true, now);
      apis.push(created);
      imported += 1;
    }

    await this.replaceConfig({ version: CONFIG_VERSION, apis });
    return { imported, updated, items: this.list() };
  }

  private async replaceConfig(next: StoredConfig): Promise<void> {
    const result = validateStoredConfig(next);
    if (!result.success) {
      throw new ConfigError("保存后的配置不合法", 500, result.issues);
    }

    this.config = result.data;
    await this.writeConfig(this.config);
  }

  private async writeConfig(config: StoredConfig): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    await rename(tempPath, this.filePath);
  }

  private toApiDefinition(input: ImportApiDefinition, enabled = true, now = new Date().toISOString()): ApiDefinition {
    return {
      ...input,
      id: crypto.randomUUID(),
      enabled,
      createdAt: now,
      updatedAt: now
    };
  }

  private ensureNoConflict(method: string, path: string, ignoreId?: string): void {
    const existing = this.findByMethodPath(method, path, this.config.apis);
    if (existing && existing.id !== ignoreId) {
      throw new ConfigError(`接口已存在：${methodPathKey(method, path)}`, 409);
    }
  }

  private findByMethodPath(method: string, path: string, apis: ApiDefinition[]): ApiDefinition | undefined {
    const target = methodPathKey(method, path);
    return apis.find((api) => methodPathKey(api.method, api.path) === target);
  }
}

function readEnabled(input: unknown, fallback: boolean): boolean {
  if (typeof input === "object" && input !== null && "enabled" in input) {
    return Boolean((input as { enabled: unknown }).enabled);
  }

  return fallback;
}
