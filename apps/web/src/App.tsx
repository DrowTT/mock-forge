import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Copy,
  FileJson2,
  Hammer,
  Import,
  PencilLine,
  Play,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Trash2,
  WandSparkles
} from "lucide-react";
import type { ApiDefinition, HttpMethod, ImportConfig, ImportStrategy, SchemaNode } from "@mockforge/shared";
import { ApiClient, type ValidationIssue } from "./api/client";
import { SchemaTreeEditor } from "./components/SchemaTreeEditor";

type Tab = "apis" | "editor" | "import";
type SchemaMode = "form" | "json";

type FormState = {
  id: string;
  name: string;
  method: HttpMethod;
  path: string;
  enabled: boolean;
  status: string;
  query: string;
  pathSchema: string;
  body: string;
  responseBody: string;
};

const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const runtimeOrigin = import.meta.env.VITE_MOCKFORGE_RUNTIME_ORIGIN || window.location.origin;

const sampleImport = {
  version: "1.0",
  apis: [
    {
      name: "获取用户列表",
      method: "GET",
      path: "/api/users",
      request: {
        query: { page: "integer", pageSize: "integer" },
        path: {},
        body: {}
      },
      response: {
        status: 200,
        body: {
          code: { $type: "integer", $value: 0 },
          message: { $type: "string", $value: "success" },
          data: {
            list: [{ id: "integer", name: "string", email: "email", active: "boolean" }],
            page: { $type: "integer", $value: 1 },
            pageSize: { $type: "integer", $value: 10 },
            total: "integer"
          }
        }
      }
    }
  ]
};

const emptyForm: FormState = {
  id: "",
  name: "获取用户列表",
  method: "GET",
  path: "/api/users",
  enabled: true,
  status: "200",
  query: pretty({ page: "integer", pageSize: "integer" }),
  pathSchema: pretty({}),
  body: pretty({}),
  responseBody: pretty({
    code: { $type: "integer", $value: 0 },
    message: { $type: "string", $value: "success" },
    data: {
      list: [{ id: "integer", name: "string", email: "email", active: "boolean" }],
      page: { $type: "integer", $value: 1 },
      pageSize: { $type: "integer", $value: 10 },
      total: "integer"
    }
  })
};

export function App() {
  const [apis, setApis] = useState<ApiDefinition[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("apis");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [schemaMode, setSchemaMode] = useState<SchemaMode>("form");
  const [importText, setImportText] = useState(pretty(sampleImport));
  const [strategy, setStrategy] = useState<ImportStrategy>("upsert");
  const [token, setToken] = useState(() => localStorage.getItem("mockforge.adminToken") ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);

  const client = useMemo(() => new ApiClient(() => token), [token]);

  useEffect(() => {
    localStorage.setItem("mockforge.adminToken", token);
  }, [token]);

  useEffect(() => {
    void loadApis();
  }, []);

  useEffect(() => {
    if (!message && !error) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage("");
      setError("");
    }, 3600);

    return () => window.clearTimeout(timer);
  }, [message, error]);

  async function loadApis() {
    await run(async () => {
      await refreshApiList();
    });
  }

  async function refreshApiList() {
    const result = await client.listApis();
    setApis(result.items);
  }

  async function saveApi() {
    await run(async () => {
      const payload = formToPayload(form);
      const saved = form.id ? await client.updateApi(form.id, payload) : await client.createApi(payload);
      setForm(apiToForm(saved));
      setActiveTab("apis");
      await refreshApiList();
      setMessage(form.id ? "接口已更新" : "接口已创建");
    });
  }

  async function deleteApi(api: ApiDefinition) {
    if (!window.confirm(`删除接口 ${api.method} ${api.path}？`)) {
      return;
    }

    await run(async () => {
      await client.deleteApi(api.id);
      await refreshApiList();
      setMessage("接口已删除");
    });
  }

  async function previewResponse() {
    await run(async () => {
      const schema = parseJson(form.responseBody, "响应体 schema") as SchemaNode;
      const result = await client.previewResponse(schema);
      setPreview(pretty(result.data));
      setMessage("预览已生成");
    });
  }

  async function validateImport() {
    await run(async () => {
      const config = parseJson(importText, "导入配置");
      const result = await client.validateImport(config);
      if (result.success) {
        setIssues([]);
        setMessage("配置校验通过");
      } else {
        setIssues(result.issues);
        setError("配置校验未通过");
      }
    });
  }

  async function importConfig() {
    await run(async () => {
      const config = parseJson(importText, "导入配置") as ImportConfig;
      const result = await client.importConfig(strategy, config);
      setMessage(`导入完成：新增 ${result.imported}，更新 ${result.updated}`);
      setIssues([]);
      setApis(result.items);
      setActiveTab("apis");
    });
  }

  async function copyUrl(api: ApiDefinition) {
    await navigator.clipboard.writeText(`${runtimeOrigin}${api.path}`);
    setMessage("调用地址已复制");
  }

  function editApi(api: ApiDefinition) {
    setForm(apiToForm(api));
    setPreview("");
    setSchemaMode("form");
    setActiveTab("editor");
  }

  function createNew() {
    setForm({ ...emptyForm, id: "" });
    setPreview("");
    setSchemaMode("form");
    setActiveTab("editor");
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  const enabledCount = apis.filter((api) => api.enabled).length;
  const pageTitle = activeTab === "apis" ? "接口总览" : activeTab === "editor" ? (form.id ? "编辑接口" : "新建接口") : "AI 配置导入";

  return (
    <main className="shell">
      <aside className="rail">
        <div className="brand">
          <div className="brand-mark">
            <Hammer size={22} />
          </div>
          <div>
            <strong>MockForge</strong>
            <span>API control plane</span>
          </div>
        </div>

        <nav className="nav">
          <button className={activeTab === "apis" ? "active" : ""} onClick={() => setActiveTab("apis")}>
            <FileJson2 size={18} />
            接口
          </button>
          <button className={activeTab === "import" ? "active" : ""} onClick={() => setActiveTab("import")}>
            <Import size={18} />
            导入
          </button>
        </nav>

        <form className="token-box" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="token">
            <Shield size={16} />
            Admin Token
          </label>
          <input
            aria-hidden="true"
            autoComplete="username"
            className="visually-hidden"
            id="mockforge-admin-username"
            name="username"
            readOnly
            tabIndex={-1}
            type="text"
            value="mockforge-admin"
          />
          <input
            id="token"
            name="adminToken"
            value={token}
            type="password"
            autoComplete="new-password"
            onChange={(event) => setToken(event.target.value)}
            placeholder="未设置则留空"
          />
        </form>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Self-hosted mock runtime</p>
            <h1>{pageTitle}</h1>
          </div>
          <div className="stats">
            <span>{apis.length} APIs</span>
            <span>{enabledCount} enabled</span>
          </div>
        </header>

        {(message || error) && (
          <div className={`toast ${error ? "danger" : "success"}`} role={error ? "alert" : "status"}>
            {error ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <pre>{error || message}</pre>
          </div>
        )}

        {activeTab === "apis" && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>已配置接口</h2>
                <p>{runtimeOrigin}</p>
              </div>
              <div className="panel-tools">
                <button className="secondary" onClick={loadApis} disabled={busy} title="刷新接口列表">
                  <RefreshCw size={17} />
                  刷新
                </button>
                <button className="primary" onClick={createNew}>
                  <Plus size={17} />
                  新增接口
                </button>
              </div>
            </div>

            {apis.length === 0 ? (
              <div className="empty-state">
                <WandSparkles size={34} />
                <h3>还没有接口</h3>
                <button className="primary" onClick={createNew}>
                  <Plus size={17} />
                  创建第一个接口
                </button>
              </div>
            ) : (
              <div className="api-table">
                {apis.map((api) => (
                  <article className="api-row" key={api.id}>
                    <div className={`method method-${api.method.toLowerCase()}`}>{api.method}</div>
                    <div className="api-main">
                      <strong>{api.name}</strong>
                      <span>{api.path}</span>
                    </div>
                    <span className={api.enabled ? "status enabled" : "status disabled"}>{api.enabled ? "启用" : "停用"}</span>
                    <div className="row-actions">
                      <button className="secondary row-edit" onClick={() => editApi(api)} title="编辑接口">
                        <PencilLine size={16} />
                        编辑
                      </button>
                      <button className="icon-button" onClick={() => void copyUrl(api)} title="复制调用地址">
                        <Copy size={17} />
                      </button>
                      <button className="icon-button danger" onClick={() => void deleteApi(api)} title="删除接口">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "editor" && (
          <section className="editor-grid">
            <form className="panel editor-panel" onSubmit={(event) => event.preventDefault()}>
              <div className="panel-head">
                <div className="endpoint-summary">
                  <div className={`method method-${form.method.toLowerCase()}`}>{form.method}</div>
                  <div>
                    <p>{form.path ? `${runtimeOrigin}${form.path}` : runtimeOrigin}</p>
                    <span>{form.id ? "更新后立即生效" : "保存后生成可调用 Mock API"}</span>
                  </div>
                </div>
                <label className="switch">
                  <input
                    id="api-enabled"
                    name="apiEnabled"
                    checked={form.enabled}
                    type="checkbox"
                    onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
                  />
                  <span>启用</span>
                </label>
              </div>

              <div className="form-grid">
                <label>
                  接口名称
                  <input
                    id="api-name"
                    name="apiName"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <label>
                  请求方法
                  <select
                    id="api-method"
                    name="apiMethod"
                    value={form.method}
                    onChange={(event) => setForm((current) => ({ ...current, method: event.target.value as HttpMethod }))}
                  >
                    {methods.map((method) => (
                      <option key={method}>{method}</option>
                    ))}
                  </select>
                </label>
                <label>
                  接口路径
                  <input
                    id="api-path"
                    name="apiPath"
                    value={form.path}
                    onChange={(event) => setForm((current) => ({ ...current, path: event.target.value }))}
                  />
                </label>
                <label>
                  响应状态码
                  <input
                    id="api-status"
                    name="apiStatus"
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  />
                </label>
              </div>

              <div className="schema-toolbar">
                <div>
                  <h2>参数与响应结构</h2>
                  <p>普通用户用表单配置字段；熟悉格式时可切回 JSON。</p>
                </div>
                <div className="segmented" aria-label="Schema 编辑模式">
                  <button className={schemaMode === "form" ? "active" : ""} type="button" onClick={() => setSchemaMode("form")}>
                    表单
                  </button>
                  <button className={schemaMode === "json" ? "active" : ""} type="button" onClick={() => setSchemaMode("json")}>
                    JSON
                  </button>
                </div>
              </div>

              {schemaMode === "form" ? (
                <div className="schema-section-stack">
                  <SchemaField label="Query 参数" value={form.query} objectOnly onChange={(query) => setForm((current) => ({ ...current, query }))} />
                  <SchemaField
                    label="Path 参数"
                    value={form.pathSchema}
                    objectOnly
                    onChange={(pathSchema) => setForm((current) => ({ ...current, pathSchema }))}
                  />
                  <SchemaField label="Body 参数" value={form.body} objectOnly onChange={(body) => setForm((current) => ({ ...current, body }))} />
                  <SchemaField
                    label="响应体"
                    value={form.responseBody}
                    onChange={(responseBody) => setForm((current) => ({ ...current, responseBody }))}
                  />
                </div>
              ) : (
                <>
                  <JsonField label="Query Schema" value={form.query} onChange={(query) => setForm((current) => ({ ...current, query }))} />
                  <JsonField
                    label="Path Schema"
                    value={form.pathSchema}
                    onChange={(pathSchema) => setForm((current) => ({ ...current, pathSchema }))}
                  />
                  <JsonField label="Body Schema" value={form.body} onChange={(body) => setForm((current) => ({ ...current, body }))} />
                  <JsonField
                    label="Response Body Schema"
                    rows={12}
                    value={form.responseBody}
                    onChange={(responseBody) => setForm((current) => ({ ...current, responseBody }))}
                  />
                </>
              )}

              <div className="actions">
                <button className="secondary" type="button" onClick={previewResponse} disabled={busy}>
                  <Play size={17} />
                  预览
                </button>
                <button className="primary" type="button" onClick={saveApi} disabled={busy}>
                  <Save size={17} />
                  保存
                </button>
              </div>
            </form>

            <section className="panel preview-panel">
              <div className="panel-head">
                <div>
                  <h2>响应预览</h2>
                  <p>随机生成</p>
                </div>
              </div>
              <pre className="code-preview">{preview || "点击预览生成响应样例"}</pre>
            </section>
          </section>
        )}

        {activeTab === "import" && (
          <section className="editor-grid">
            <section className="panel editor-panel">
              <div className="panel-head">
                <div>
                  <h2>导入 JSON</h2>
                  <p>version 1.0</p>
                </div>
                <select
                  id="import-strategy"
                  name="importStrategy"
                  value={strategy}
                  onChange={(event) => setStrategy(event.target.value as ImportStrategy)}
                >
                  <option value="upsert">upsert</option>
                  <option value="append">append</option>
                  <option value="replaceAll">replaceAll</option>
                </select>
              </div>

              <textarea
                className="json large"
                id="import-config"
                name="importConfig"
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
              />

              <div className="actions">
                <button className="secondary" type="button" onClick={validateImport} disabled={busy}>
                  <CheckCircle2 size={17} />
                  校验
                </button>
                <button className="primary" type="button" onClick={importConfig} disabled={busy}>
                  <Import size={17} />
                  导入
                </button>
              </div>
            </section>

            <aside className="import-side">
              <ImportGuide />
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h2>校验结果</h2>
                    <p>{issues.length ? `${issues.length} issues` : "ready"}</p>
                  </div>
                </div>
                {issues.length ? (
                  <div className="issue-list">
                    {issues.map((issue, index) => (
                      <div key={`${issue.path}-${index}`}>
                        <strong>{issue.path}</strong>
                        <span>{issue.message}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre className="code-preview compact">{pretty(sampleImport)}</pre>
                )}
              </section>
            </aside>
          </section>
        )}
      </section>
    </main>
  );
}

function SchemaField(props: { label: string; value: string; objectOnly?: boolean; onChange: (value: string) => void }) {
  const parsed = tryParseJson(props.value);

  return (
    <section className="schema-block">
      <div className="schema-block-head">
        <h3>{props.label}</h3>
      </div>
      {parsed.success ? (
        <SchemaTreeEditor
          value={parsed.value as SchemaNode}
          objectOnly={props.objectOnly}
          onChange={(nextValue) => props.onChange(pretty(nextValue))}
        />
      ) : (
        <div className="schema-json-error">
          <p>{parsed.message}</p>
          <textarea className="json" name={`schemaJsonFallback-${props.label}`} value={props.value} onChange={(event) => props.onChange(event.target.value)} />
        </div>
      )}
    </section>
  );
}

function ImportGuide() {
  return (
    <section className="panel import-guide">
      <div className="panel-head">
        <div className="guide-title">
          <BookOpen size={18} />
          <div>
            <h2>AI 导入 JSON 规范</h2>
            <p>把这段规范交给 AI，要求它只输出 JSON。</p>
          </div>
        </div>
      </div>
      <div className="guide-content">
        <ul className="guide-rules">
          <li>
            顶层必须是 <code>{'{ "version": "1.0", "apis": [] }'}</code>。
          </li>
          <li>
            每个接口必须包含 <code>name</code>、<code>method</code>、<code>path</code>、<code>request</code>、<code>response</code>。
          </li>
          <li>
            <code>request</code> 必须包含 <code>query</code>、<code>path</code>、<code>body</code> 三个对象，没有字段时写 <code>{'{}'}</code>。
          </li>
          <li>
            字段类型只能用 <code>string</code>、<code>number</code>、<code>integer</code>、<code>boolean</code>、<code>datetime</code>、
            <code>date</code>、<code>email</code>、<code>url</code>、<code>uuid</code>、<code>object</code>、<code>array</code>、
            <code>null</code>。
          </li>
          <li>
            数组用单元素数组描述，例如 <code>{'[{ "id": "integer" }]'}</code>。
          </li>
          <li>
            固定值用 <code>{'{ "$type": "integer", "$value": 0 }'}</code>，<code>$value</code> 必须符合 <code>$type</code>。
          </li>
        </ul>
        <pre className="guide-code">{`{
  "version": "1.0",
  "apis": [
    {
      "name": "获取用户列表",
      "method": "GET",
      "path": "/api/users",
      "request": {
        "query": { "page": "integer", "pageSize": "integer" },
        "path": {},
        "body": {}
      },
      "response": {
        "status": 200,
        "body": {
          "code": { "$type": "integer", "$value": 0 },
          "message": { "$type": "string", "$value": "success" },
          "data": {
            "list": [{ "id": "integer", "name": "string" }],
            "page": { "$type": "integer", "$value": 1 },
            "pageSize": { "$type": "integer", "$value": 10 }
          }
        }
      }
    }
  ]
}`}</pre>
      </div>
    </section>
  );
}

function JsonField(props: { label: string; value: string; rows?: number; onChange: (value: string) => void }) {
  const id = `json-${props.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

  return (
    <label className="json-field" htmlFor={id}>
      {props.label}
      <textarea
        className="json"
        id={id}
        name={id}
        rows={props.rows ?? 7}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}

function formToPayload(form: FormState) {
  const status = Number.parseInt(form.status, 10);
  if (!Number.isInteger(status)) {
    throw new Error("响应状态码必须是整数");
  }

  return {
    name: form.name,
    method: form.method,
    path: form.path,
    enabled: form.enabled,
    request: {
      query: parseJson(form.query, "Query Schema"),
      path: parseJson(form.pathSchema, "Path Schema"),
      body: parseJson(form.body, "Body Schema")
    },
    response: {
      status,
      body: parseJson(form.responseBody, "Response Body Schema")
    }
  };
}

function apiToForm(api: ApiDefinition): FormState {
  return {
    id: api.id,
    name: api.name,
    method: api.method,
    path: api.path,
    enabled: api.enabled,
    status: String(api.response.status),
    query: pretty(api.request.query),
    pathSchema: pretty(api.request.path),
    body: pretty(api.request.body),
    responseBody: pretty(api.response.body)
  };
}

function parseJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} 不是合法 JSON`);
  }
}

function tryParseJson(value: string): { success: true; value: unknown } | { success: false; message: string } {
  try {
    return { success: true, value: JSON.parse(value) };
  } catch {
    return { success: false, message: "当前 JSON 不合法，修正后即可回到表单编辑。" };
  }
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
