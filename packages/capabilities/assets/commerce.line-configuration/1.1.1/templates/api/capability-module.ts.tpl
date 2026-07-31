import type {
  CapabilityConfiguredLine,
  CapabilityRuntimeModule,
  CapabilityStoredRecord,
} from "./contract.js";

export const lineConfigurationContract = {
  catalogEntity: "{{catalogEntity}}",
  lineEntity: "{{lineEntity}}",
  optionGroupEntity: "{{optionGroupEntity}}",
  optionEntity: "{{optionEntity}}",
  customerRole: "{{customerRole}}",
  merchantRole: "{{merchantRole}}",
  catalogPage: "{{catalogPage}}",
  merchantPage: "{{merchantPage}}",
  pricingAuthority: "server",
  snapshotAuthority: "order-line",
} as const;

function toCamelCase(value: string): string {
  const parts = value.split(/[-_\s]+/).filter(Boolean);
  return parts
    .map((part, index) =>
      index === 0 ? part : `${part[0]!.toUpperCase()}${part.slice(1)}`,
    )
    .join("");
}

function requiredString(record: CapabilityStoredRecord, field: string): string {
  const value = record[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Configured ${record.id} has no usable '${field}' value.`);
  }
  return value;
}

function requiredInteger(
  record: CapabilityStoredRecord,
  field: string,
): number {
  const value = record[field];
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`Configured ${record.id} has an invalid '${field}' value.`);
  }
  return value as number;
}

function requiredDecimal(record: CapabilityStoredRecord, field: string): number {
  const value = record[field];
  const decimal =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(decimal)) {
    throw new Error(`Configured ${record.id} has an invalid '${field}' value.`);
  }
  return decimal;
}

function sortByOrder(
  left: CapabilityStoredRecord,
  right: CapabilityStoredRecord,
): number {
  return requiredInteger(left, "sortOrder") - requiredInteger(right, "sortOrder");
}

export const capabilityModule: CapabilityRuntimeModule = {
  key: "{{asset.key}}",
  version: "{{asset.version}}",
  applicationId: "{{graph.metadata.id}}",
  effects: {{asset.effectsJson}},
  lineConfigurationHandler: {
    async select(input) {
      if (input.catalogEntity !== lineConfigurationContract.catalogEntity) {
        throw new Error(
          `Catalog entity '${input.catalogEntity}' does not match the configured catalog entity '${lineConfigurationContract.catalogEntity}'.`,
        );
      }
      if (
        !Array.isArray(input.optionIds) ||
        input.optionIds.some((optionId) => typeof optionId !== "string" || !optionId.trim())
      ) {
        throw new Error("Configured option identifiers must be non-empty strings.");
      }
      if (
        new Set(input.optionIds).size !== input.optionIds.length ||
        !Number.isInteger(input.quantity) ||
        input.quantity < 1
      ) {
        throw new Error("Configured line selections must be unique and use a positive integer quantity.");
      }

      await input.assertAllowed(input.role, lineConfigurationContract.catalogEntity, "read");
      await input.assertAllowed(input.role, lineConfigurationContract.optionGroupEntity, "read");
      await input.assertAllowed(input.role, lineConfigurationContract.optionEntity, "read");

      const catalog = await input.store.find(
        lineConfigurationContract.catalogEntity,
        input.catalogRecordId,
      );
      if (!catalog) {
        throw new Error(`Catalog record '${input.catalogRecordId}' was not found.`);
      }

      const catalogReference = `${toCamelCase(lineConfigurationContract.catalogEntity)}Id`;
      const optionGroupReference = "optionGroupId";
      const groups = (await input.store.list(lineConfigurationContract.optionGroupEntity))
        .filter(
          (group) =>
            group[catalogReference] === catalog.id && group.active === true,
        )
        .sort(sortByOrder);
      const allOptions = await input.store.list(
        lineConfigurationContract.optionEntity,
      );
      const requested = new Set(input.optionIds);
      const activeGroupIds = new Set(groups.map((group) => group.id));
      const availableOptionIds = new Set(
        allOptions
          .filter(
            (option) =>
              activeGroupIds.has(option[optionGroupReference] as string) &&
              option.available === true,
          )
          .map((option) => option.id),
      );
      for (const optionId of requested) {
        if (!availableOptionIds.has(optionId)) {
          throw new Error(`Option '${optionId}' is unavailable.`);
        }
      }
      const configured: CapabilityConfiguredLine["options"] = [];

      for (const group of groups) {
        const options = allOptions
          .filter(
            (option) =>
              option[optionGroupReference] === group.id &&
              option.available === true,
          )
          .sort(sortByOrder);
        const selected = options.filter((option) => requested.has(option.id));
        const selectionMode = requiredString(group, "selectionMode");
        const minimum = requiredInteger(group, "minimumSelections");
        const maximum = requiredInteger(group, "maximumSelections");
        if (
          maximum < minimum ||
          (selectionMode === "single" && maximum > 1) ||
          (selectionMode !== "single" && selectionMode !== "multiple") ||
          selected.length < minimum ||
          selected.length > maximum
        ) {
          throw new Error(
            `Option selection for '${group.id}' does not satisfy the declared cardinality.`,
          );
        }

        for (const option of selected) {
          configured.push({
            id: option.id,
            label: requiredString(option, "label"),
            priceDelta: requiredDecimal(option, "priceDelta"),
          });
        }
      }

      return {
        catalogEntity: lineConfigurationContract.catalogEntity,
        catalogRecordId: catalog.id,
        quantity: input.quantity,
        priceDelta: configured.reduce((total, option) => total + option.priceDelta, 0),
        options: configured,
      };
    },
  },
};
