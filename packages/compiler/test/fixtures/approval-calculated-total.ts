import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";
import { numericInput, positive } from "./approval-numeric-domain.js";

export function calculatedInput() {
  const input = numericInput();
  const entity = input.graph.domain.entities[0]!;
  entity.fields = [
    { key: "itemName", type: "string", required: true },
    {
      key: "quantity",
      type: "integer",
      required: true,
      numericDomain: positive,
    },
    {
      key: "unitPrice",
      type: "decimal",
      required: true,
      numericDomain: positive,
    },
    {
      key: "total",
      type: "decimal",
      required: true,
      calculation: {
        apiVersion: "factory.quantity-unit-price-total/v1",
        quantityFieldKey: "quantity",
        unitPriceFieldKey: "unitPrice",
      },
    },
    { key: "justification", type: "text", required: true },
    ...entity.fields.filter((f) => f.key === "status"),
  ];
  input.graph.domain.seedData![0]!.values = {
    itemName: "Sample equipment",
    quantity: 12,
    unitPrice: 125.5,
    total: 1506,
    justification: "Replace worn equipment",
    status: "draft",
  };
  input.compositionLock = createCapabilityCompositionLock({
    graphChecksum: hashApplicationGraph(input.graph),
    selections: input.compositionLock.packages,
  });
  return input;
}
