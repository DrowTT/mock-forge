import { Plus, Trash2 } from "lucide-react";
import { PRIMITIVE_TYPES, type FixedValueSchemaNode, type JsonValue, type PrimitiveType, type SchemaNode } from "@mockforge/shared";

type SchemaRecord = Record<string, SchemaNode>;
type SelectValue = "object" | "array" | `random:${PrimitiveType}` | `fixed:${PrimitiveType}`;

type SchemaTreeEditorProps = {
  value: SchemaNode;
  objectOnly?: boolean;
  onChange: (value: SchemaNode) => void;
};

const randomTypes = [...PRIMITIVE_TYPES] as PrimitiveType[];
const fixedTypes = PRIMITIVE_TYPES.filter((type) => type !== "object" && type !== "array") as PrimitiveType[];

export function SchemaTreeEditor({ value, objectOnly = false, onChange }: SchemaTreeEditorProps) {
  const rootValue = objectOnly && !isStructuredObject(value) ? {} : value;

  return (
    <div className="schema-tree-editor">
      {objectOnly && !isStructuredObject(value) && (
        <div className="schema-warning">
          该区域必须是对象 schema。
          <button type="button" onClick={() => onChange({})}>
            重置
          </button>
        </div>
      )}
      <SchemaNodeEditor node={rootValue} objectOnly={objectOnly} onChange={onChange} depth={0} label="根节点" />
    </div>
  );
}

function SchemaNodeEditor(props: {
  node: SchemaNode;
  objectOnly?: boolean;
  onChange: (value: SchemaNode) => void;
  onRemove?: () => void;
  depth: number;
  label?: string;
  fieldName?: string;
  onFieldNameChange?: (value: string) => void;
}) {
  const { node, objectOnly = false, onChange, onRemove, depth, label, fieldName, onFieldNameChange } = props;
  const selectValue = nodeToSelectValue(node);
  const isObject = isStructuredObject(node);
  const isArray = Array.isArray(node);
  const isFixed = isFixedValueNode(node);

  return (
    <div className={`schema-node depth-${Math.min(depth, 4)}`}>
      <div className="schema-node-row">
        {fieldName !== undefined ? (
          <input
            className="schema-name-input"
            name="schemaFieldName"
            value={fieldName}
            onChange={(event) => onFieldNameChange?.(event.target.value)}
          />
        ) : (
          <span className="schema-root-name">{label}</span>
        )}

        {!objectOnly && (
          <select
            className="schema-type-select"
            name="schemaFieldType"
            value={selectValue}
            onChange={(event) => onChange(changeNodeKind(node, event.target.value as SelectValue))}
          >
            <option value="object">对象：可添加字段</option>
            <option value="array">数组：配置元素结构</option>
            <optgroup label="随机值">
              {randomTypes.map((type) => (
                <option key={`random-${type}`} value={`random:${type}`}>
                  {type}
                </option>
              ))}
            </optgroup>
            <optgroup label="固定值">
              {fixedTypes.map((type) => (
                <option key={`fixed-${type}`} value={`fixed:${type}`}>
                  {type} = 固定值
                </option>
              ))}
            </optgroup>
          </select>
        )}

        {onRemove && (
          <button className="icon-button schema-remove" type="button" onClick={onRemove} title="删除字段">
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {isFixed && <FixedValueInput node={node} onChange={onChange} />}

      {isObject && (
        <ObjectFields
          value={node}
          depth={depth + 1}
          onChange={onChange}
        />
      )}

      {isArray && (
        <div className="schema-children">
          <span className="schema-child-label">数组元素</span>
          <SchemaNodeEditor
            node={node[0] ?? "string"}
            depth={depth + 1}
            onChange={(nextValue) => onChange([nextValue])}
          />
        </div>
      )}
    </div>
  );
}

function ObjectFields({ value, depth, onChange }: { value: SchemaRecord; depth: number; onChange: (value: SchemaNode) => void }) {
  const entries = Object.entries(value);

  function addField() {
    onChange({
      ...value,
      [nextFieldName(value)]: "string"
    });
  }

  function renameField(oldName: string, newName: string) {
    const next: SchemaRecord = {};
    for (const [key, child] of entries) {
      next[key === oldName ? newName : key] = child;
    }
    onChange(next);
  }

  function updateField(fieldName: string, nextNode: SchemaNode) {
    onChange({ ...value, [fieldName]: nextNode });
  }

  function removeField(fieldName: string) {
    const next: SchemaRecord = {};
    for (const [key, child] of entries) {
      if (key !== fieldName) {
        next[key] = child;
      }
    }
    onChange(next);
  }

  return (
    <div className="schema-children">
      {entries.length === 0 && <p className="schema-empty">暂无字段</p>}
      {entries.map(([key, child]) => (
        <SchemaNodeEditor
          key={key}
          node={child}
          depth={depth}
          fieldName={key}
          onFieldNameChange={(newName) => renameField(key, newName)}
          onChange={(nextNode) => updateField(key, nextNode)}
          onRemove={() => removeField(key)}
        />
      ))}
      <button className="schema-add" type="button" onClick={addField}>
        <Plus size={15} />
        添加字段
      </button>
    </div>
  );
}

function FixedValueInput({ node, onChange }: { node: FixedValueSchemaNode; onChange: (value: SchemaNode) => void }) {
  const value = node.$value;

  if (node.$type === "boolean") {
    return (
      <label className="schema-fixed-value">
        固定值
        <select
          name="schemaFixedValue"
          value={value === true ? "true" : "false"}
          onChange={(event) => onChange({ ...node, $value: event.target.value === "true" })}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </label>
    );
  }

  if (node.$type === "number" || node.$type === "integer") {
    return (
      <label className="schema-fixed-value">
        固定值
        <input
          name="schemaFixedValue"
          type="number"
          step={node.$type === "integer" ? 1 : "any"}
          value={typeof value === "number" ? String(value) : "0"}
          onChange={(event) => onChange({ ...node, $value: parseNumberValue(event.target.value, node.$type) })}
        />
      </label>
    );
  }

  if (node.$type === "null") {
    return (
      <label className="schema-fixed-value">
        固定值
        <input name="schemaFixedValue" value="null" disabled />
      </label>
    );
  }

  return (
    <label className="schema-fixed-value">
      固定值
      <input
        name="schemaFixedValue"
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange({ ...node, $value: event.target.value })}
      />
    </label>
  );
}

function nodeToSelectValue(node: SchemaNode): SelectValue {
  if (Array.isArray(node)) {
    return "array";
  }

  if (isFixedValueNode(node)) {
    return `fixed:${node.$type}`;
  }

  if (typeof node === "string") {
    return `random:${node}`;
  }

  return "object";
}

function changeNodeKind(current: SchemaNode, value: SelectValue): SchemaNode {
  if (value === "object") {
    return isStructuredObject(current) ? current : {};
  }

  if (value === "array") {
    return Array.isArray(current) ? current : ["string"];
  }

  if (value.startsWith("random:")) {
    return value.slice("random:".length) as PrimitiveType;
  }

  const type = value.slice("fixed:".length) as PrimitiveType;
  return toFixedValueNode(current, type);
}

function toFixedValueNode(current: SchemaNode, type: PrimitiveType): FixedValueSchemaNode {
  if (isFixedValueNode(current) && current.$type === type) {
    return current;
  }

  return {
    $type: type,
    $value: defaultValueForType(type)
  };
}

function defaultValueForType(type: PrimitiveType): JsonValue {
  switch (type) {
    case "number":
    case "integer":
      return 0;
    case "boolean":
      return true;
    case "datetime":
      return "2026-01-01T00:00:00.000Z";
    case "date":
      return "2026-01-01";
    case "email":
      return "user@example.com";
    case "url":
      return "https://example.com";
    case "uuid":
      return "00000000-0000-4000-8000-000000000000";
    case "null":
      return null;
    case "object":
      return {};
    case "array":
      return [];
    case "string":
    default:
      return "success";
  }
}

function parseNumberValue(value: string, type: PrimitiveType): number {
  const next = Number(value);
  if (!Number.isFinite(next)) {
    return 0;
  }
  return type === "integer" ? Math.trunc(next) : next;
}

function nextFieldName(value: SchemaRecord): string {
  let index = Object.keys(value).length + 1;
  let fieldName = `field${index}`;
  while (fieldName in value) {
    index += 1;
    fieldName = `field${index}`;
  }
  return fieldName;
}

function isFixedValueNode(value: SchemaNode): value is FixedValueSchemaNode {
  if (!isPlainRecord(value)) {
    return false;
  }

  const keys = Object.keys(value);
  return keys.length === 2 && "$type" in value && "$value" in value && typeof value.$type === "string";
}

function isStructuredObject(value: SchemaNode): value is SchemaRecord {
  return isPlainRecord(value) && !isFixedValueNode(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
