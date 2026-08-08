"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Plus } from "lucide-react";
import type { DomainModel } from "@factory/graph";
import { domainModelToReactFlow } from "@factory/adapters/browser";

import {
  addDomainEntity,
  addDomainField,
  addDomainIndex,
  addDomainRelation,
  setDomainFieldOptions,
} from "../../lib/graph-editors";
import type { ApplicationGraphV1 } from "@factory/graph";
import { DomainRelationGraph } from "../domain-relation-graph";

/**
 * The Domain canvas: the declared record model. Entities, fields, indexes,
 * and relations are edited through the constrained graph editors; the
 * relation diagram renders the declared schema as it stands.
 */
export function DomainCanvas({
  graph,
  onDomainChange,
}: {
  graph: ApplicationGraphV1;
  onDomainChange: (domain: DomainModel) => void;
}) {
  const [entityKey, setEntityKey] = useState(
    graph.domain.entities[0]?.key ?? "",
  );
  const [newEntityKey, setNewEntityKey] = useState("");
  const [newEntityLabel, setNewEntityLabel] = useState("");
  const [fieldKey, setFieldKey] = useState("");
  const [fieldType, setFieldType] =
    useState<DomainModel["entities"][number]["fields"][number]["type"]>(
      "string",
    );
  const [required, setRequired] = useState(true);
  const [unique, setUnique] = useState(false);
  const [enumValues, setEnumValues] = useState("");
  const [indexField, setIndexField] = useState("");
  const [indexUnique, setIndexUnique] = useState(false);
  const [relationTarget, setRelationTarget] = useState("");
  const [relationKind, setRelationKind] =
    useState<DomainModel["relations"][number]["kind"]>("one-to-many");
  const [relationField, setRelationField] = useState("");
  const [error, setError] = useState<string | null>(null);
  const primary =
    graph.domain.entities.find((entity) => entity.key === entityKey) ??
    graph.domain.entities[0];
  const relationDiagram = useMemo(
    () => domainModelToReactFlow(graph.domain),
    [graph.domain],
  );

  useEffect(() => {
    if (!graph.domain.entities.some((entity) => entity.key === entityKey)) {
      setEntityKey(graph.domain.entities[0]?.key ?? "");
    }
  }, [entityKey, graph.domain.entities]);
  useEffect(() => {
    if (!primary) return;
    if (!primary.fields.some((field) => field.key === indexField)) {
      setIndexField(primary.fields[0]?.key ?? "");
    }
    if (!primary.fields.some((field) => field.key === relationField)) {
      setRelationField("");
    }
    if (
      !graph.domain.entities.some(
        (entity) => entity.key === relationTarget && entity.key !== primary.key,
      )
    ) {
      setRelationTarget(
        graph.domain.entities.find((entity) => entity.key !== primary.key)
          ?.key ?? "",
      );
    }
  }, [
    graph.domain.entities,
    indexField,
    primary,
    relationField,
    relationTarget,
  ]);

  const addField = () => {
    const key = fieldKey.trim();
    if (!key) return;
    try {
      const values = enumValues
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      onDomainChange(
        addDomainField(graph.domain, entityKey, {
          key,
          type: fieldType,
          required,
          ...(unique ? { unique: true } : {}),
          ...(fieldType === "enum" ? { values } : {}),
        }),
      );
      setFieldKey("");
      setEnumValues("");
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to add field.",
      );
    }
  };

  const createEntity = () => {
    const key = newEntityKey.trim();
    const label = newEntityLabel.trim();
    if (!key || !label) return;
    try {
      onDomainChange(
        addDomainEntity(graph.domain, { key, label, fields: [], indexes: [] }),
      );
      setEntityKey(key);
      setNewEntityKey("");
      setNewEntityLabel("");
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to add entity.",
      );
    }
  };

  const createIndex = () => {
    if (!primary || !indexField) return;
    try {
      onDomainChange(
        addDomainIndex(graph.domain, primary.key, {
          fields: [indexField],
          ...(indexUnique ? { unique: true } : {}),
        }),
      );
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to add index.",
      );
    }
  };

  const createRelation = () => {
    if (!primary || !relationTarget) return;
    try {
      onDomainChange(
        addDomainRelation(graph.domain, {
          from: primary.key,
          to: relationTarget,
          kind: relationKind,
          ...(relationField ? { field: relationField } : {}),
        }),
      );
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to add relation.",
      );
    }
  };

  return (
    <div className="domain-canvas">
      <DomainRelationGraph diagram={relationDiagram} />
      <div className="record-card primary-record">
        <span className="record-icon">
          <FileText size={16} aria-hidden="true" />
        </span>
        <strong>{primary?.label ?? "No entity"}</strong>
        <small>Selected record</small>
        <div>
          {primary?.fields.map((field) => (
            <code key={field.key}>{field.key}</code>
          ))}
        </div>
      </div>
      <div className="record-link" aria-hidden="true" />
      <form
        className="domain-entity-editor"
        onSubmit={(event) => {
          event.preventDefault();
          createEntity();
        }}
      >
        <label>
          Entity key
          <input
            value={newEntityKey}
            onChange={(event) => setNewEntityKey(event.target.value)}
            placeholder="expense-line"
            pattern="[a-z][a-z0-9-]*"
          />
        </label>
        <label>
          Label
          <input
            value={newEntityLabel}
            onChange={(event) => setNewEntityLabel(event.target.value)}
            placeholder="Expense line"
          />
        </label>
        <button type="submit">
          <Plus size={15} aria-hidden="true" /> Add entity
        </button>
      </form>
      <form
        className="domain-field-editor"
        onSubmit={(event) => {
          event.preventDefault();
          addField();
        }}
      >
        <label>
          Entity
          <select
            value={entityKey}
            onChange={(event) => setEntityKey(event.target.value)}
          >
            {graph.domain.entities.map((entity) => (
              <option key={entity.key} value={entity.key}>
                {entity.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Field key
          <input
            value={fieldKey}
            onChange={(event) => setFieldKey(event.target.value)}
            placeholder="priority"
            pattern="[a-z][a-zA-Z0-9_]*"
          />
        </label>
        <label>
          Type
          <select
            value={fieldType}
            onChange={(event) =>
              setFieldType(event.target.value as typeof fieldType)
            }
          >
            {[
              "string",
              "text",
              "integer",
              "decimal",
              "boolean",
              "date",
              "datetime",
              "enum",
              "json",
              "url",
              "email",
            ].map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="required-field">
          <input
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
            type="checkbox"
          />{" "}
          Required
        </label>
        <label className="required-field">
          <input
            checked={unique}
            onChange={(event) => setUnique(event.target.checked)}
            type="checkbox"
          />{" "}
          Unique
        </label>
        {fieldType === "enum" && (
          <label className="enum-values-field">
            Values
            <input
              value={enumValues}
              onChange={(event) => setEnumValues(event.target.value)}
              placeholder="draft, submitted"
            />
          </label>
        )}
        <button type="submit">
          <Plus size={15} aria-hidden="true" /> Add field
        </button>
      </form>
      {primary && (
        <div className="domain-schema-controls">
          <section>
            <div className="domain-section-heading">
              <strong>Field constraints</strong>
              <small>Declared schema only</small>
            </div>
            {primary.fields.map((field) => (
              <label className="domain-existing-field" key={field.key}>
                <code>{field.key}</code>
                <span>{field.type}</span>
                <input
                  checked={field.required}
                  onChange={(event) => {
                    try {
                      onDomainChange(
                        setDomainFieldOptions(
                          graph.domain,
                          primary.key,
                          field.key,
                          { required: event.target.checked },
                        ),
                      );
                      setError(null);
                    } catch (reason) {
                      setError(
                        reason instanceof Error
                          ? reason.message
                          : "Unable to update field.",
                      );
                    }
                  }}
                  type="checkbox"
                />
                Required
                <input
                  checked={field.unique ?? false}
                  onChange={(event) => {
                    try {
                      onDomainChange(
                        setDomainFieldOptions(
                          graph.domain,
                          primary.key,
                          field.key,
                          { unique: event.target.checked },
                        ),
                      );
                      setError(null);
                    } catch (reason) {
                      setError(
                        reason instanceof Error
                          ? reason.message
                          : "Unable to update field.",
                      );
                    }
                  }}
                  type="checkbox"
                />
                Unique
              </label>
            ))}
          </section>
          <form
            className="domain-index-editor"
            onSubmit={(event) => {
              event.preventDefault();
              createIndex();
            }}
          >
            <label>
              Index field
              <select
                value={indexField}
                onChange={(event) => setIndexField(event.target.value)}
              >
                {primary.fields.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.key}
                  </option>
                ))}
              </select>
            </label>
            <label className="required-field">
              <input
                checked={indexUnique}
                onChange={(event) => setIndexUnique(event.target.checked)}
                type="checkbox"
              />{" "}
              Unique index
            </label>
            <button type="submit">Add index</button>
          </form>
          <form
            className="domain-relation-editor"
            onSubmit={(event) => {
              event.preventDefault();
              createRelation();
            }}
          >
            <label>
              Relation target
              <select
                value={relationTarget}
                onChange={(event) => setRelationTarget(event.target.value)}
              >
                {graph.domain.entities
                  .filter((entity) => entity.key !== primary.key)
                  .map((entity) => (
                    <option key={entity.key} value={entity.key}>
                      {entity.label}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Kind
              <select
                value={relationKind}
                onChange={(event) =>
                  setRelationKind(event.target.value as typeof relationKind)
                }
              >
                {[
                  "one-to-one",
                  "one-to-many",
                  "many-to-one",
                  "many-to-many",
                ].map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Source field
              <select
                value={relationField}
                onChange={(event) => setRelationField(event.target.value)}
              >
                <option value="">No source field</option>
                {primary.fields.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.key}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={!relationTarget} type="submit">
              Add relation
            </button>
          </form>
        </div>
      )}
      {error && <small className="studio-error domain-error">{error}</small>}
      <div className="record-note">
        {graph.domain.relations.length} declared relation
        {graph.domain.relations.length === 1 ? "" : "s"} ·{" "}
        {primary?.fields.length ?? 0} fields
      </div>
    </div>
  );
}
