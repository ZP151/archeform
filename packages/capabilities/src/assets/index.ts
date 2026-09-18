export * from "./contract.js";

import type { CapabilityAssetV1 } from "./contract.js";
import { auditAsset } from "./core/audit.js";
import { auditAssetV1_0_1 } from "./core/audit-v1-0-1.js";
import { auditAssetV1_0_2 } from "./core/audit-v1-0-2.js";
import { crudAsset } from "./core/crud.js";
import { crudAssetV1_0_1 } from "./core/crud-v1-0-1.js";
import { notificationAsset } from "./core/notification.js";
import { notificationAssetV1_0_1 } from "./core/notification-v1-0-1.js";
import { notificationAssetV1_1_0 } from "./core/notification-v1-1-0.js";
import { notificationAssetV1_1_1 } from "./core/notification-v1-1-1.js";
import { workflowAsset } from "./core/workflow.js";
import { workflowAssetV1_0_1 } from "./core/workflow-v1-0-1.js";
import { identityContextAssetV1_0_0 } from "./core/identity-context-v1-0-0.js";
import { identityPolicyAssetV1_0_0 } from "./core/identity-policy-v1-0-0.js";
import { policyDeclarationsAssetV1_0_0 } from "./core/policy-declarations-v1-0-0.js";
import { locationContextAssetV1_0_0 } from "./core/location-context-v1-0-0.js";
import { filesMediaAssetV1_0_0 } from "./core/files-media.js";
import { searchAssetV1_0_0 } from "./core/search.js";
import { approvalsAssetV1_0_0 } from "./core/approvals.js";
import { schedulingAssetV1_0_0 } from "./core/scheduling.js";
import { catalogAsset } from "./commerce/catalog.js";
import { catalogAssetV1_1_0 } from "./commerce/catalog-v1-1-0.js";
import { catalogAssetV1_2_0 } from "./commerce/catalog-v1-2-0.js";
import { cartAsset } from "./commerce/cart.js";
import { cartAssetV1_0_1 } from "./commerce/cart-v1-0-1.js";
import { inventoryLedgerAssetV1_0_0 } from "./commerce/inventory-ledger-v1-0-0.js";
import { inventoryAsset } from "./commerce/inventory.js";
import { inventoryAssetV1_0_1 } from "./commerce/inventory-v1-0-1.js";
import { inventoryAssetV1_1_0 } from "./commerce/inventory-v1-1-0.js";
import { inventoryAssetV1_1_1 } from "./commerce/inventory-v1-1-1.js";
import { lineConfigurationAssetV1_0_0 } from "./commerce/line-configuration-v1-0-0.js";
import { lineConfigurationAssetV1_1_0 } from "./commerce/line-configuration-v1-1-0.js";
import { lineConfigurationAssetV1_1_1 } from "./commerce/line-configuration-v1-1-1.js";
import { lineConfigurationAssetV1_1_2 } from "./commerce/line-configuration-v1-1-2.js";
import { moneyPricingAssetV1_0_0 } from "./commerce/money-pricing-v1-0-0.js";
import { moneyPricingAssetV1_1_0 } from "./commerce/money-pricing-v1-1-0.js";
import { orderAsset } from "./commerce/order.js";
import { orderAssetV1_1_0 } from "./commerce/order-v1-1-0.js";
import { orderAssetV1_2_0 } from "./commerce/order-v1-2-0.js";
import { orderOperationsAssetV1_0_0 } from "./commerce/order-operations-v1-0-0.js";
import { orderOperationsAssetV1_0_1 } from "./commerce/order-operations-v1-0-1.js";
import { orderOperationsAssetV1_1_0 } from "./commerce/order-operations-v1-1-0.js";
import { simulatedPaymentAsset } from "./commerce/simulated-payment.js";
import { simulatedPaymentAssetV1_0_1 } from "./commerce/simulated-payment-v1-0-1.js";
import { restaurantTableSessionAsset } from "./restaurant/table-session.js";
import { restaurantTableSessionAssetV1_1_0 } from "./restaurant/table-session-v1-1-0.js";
import { restaurantMenuAsset } from "./restaurant/menu.js";
import { restaurantOrderingAsset } from "./restaurant/ordering.js";
import { restaurantOrderingAssetV1_1_0 } from "./restaurant/ordering-v1-1-0.js";
import { restaurantKitchenAsset } from "./restaurant/kitchen.js";
import { restaurantKitchenAssetV1_1_0 } from "./restaurant/kitchen-v1-1-0.js";
import { restaurantCashierAsset } from "./restaurant/cashier.js";
import { restaurantCashierAssetV1_1_0 } from "./restaurant/cashier-v1-1-0.js";
import { restaurantReportingAsset } from "./restaurant/reporting.js";
import { restaurantReportingAssetV1_1_0 } from "./restaurant/reporting-v1-1-0.js";

export const appointmentSchedulingAssetV1_0_0: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    bindingContract: "factory.capability-binding/v1",
    key: "scheduling.appointment",
    version: "1.0.0",
    category: "core",
    name: "Atomic appointment booking",
    description:
      "Claims, releases, and moves appointments against server-owned schedule capacity.",
    packageRoot: "packages/capabilities/assets/scheduling.appointment/1.0.0",
    manifestDigest:
      "sha256:eb3f409908e2f4708a3523767a27a0d30ad4277f2c89827b97f9e379dc82738b",
    lifecycle: "golden",
    profiles: [],
    effects: ["appointment.booking"],
    inputSchema: [
      { key: "serviceEntity", type: "domain.entity", required: true },
      {
        key: "serviceNameField",
        type: "domain.field",
        ownerBinding: "serviceEntity",
        fieldTypes: ["string"],
        fieldRequired: true,
        required: true,
      },
      {
        key: "serviceDurationMinutesField",
        type: "domain.field",
        ownerBinding: "serviceEntity",
        fieldTypes: ["integer"],
        fieldRequired: true,
        required: true,
      },
      {
        key: "serviceActiveField",
        type: "domain.field",
        ownerBinding: "serviceEntity",
        fieldTypes: ["boolean"],
        fieldRequired: true,
        required: true,
      },
      { key: "scheduleEntity", type: "domain.entity", required: true },
      {
        key: "scheduleServiceReferenceField",
        type: "domain.field",
        ownerBinding: "scheduleEntity",
        fieldTypes: ["string"],
        fieldRequired: true,
        required: true,
      },
      {
        key: "scheduleStartField",
        type: "domain.field",
        ownerBinding: "scheduleEntity",
        fieldTypes: ["datetime"],
        fieldRequired: true,
        required: true,
      },
      {
        key: "scheduleEndField",
        type: "domain.field",
        ownerBinding: "scheduleEntity",
        fieldTypes: ["datetime"],
        fieldRequired: true,
        required: true,
      },
      {
        key: "scheduleTimezoneField",
        type: "domain.field",
        ownerBinding: "scheduleEntity",
        fieldTypes: ["string"],
        fieldRequired: true,
        required: true,
      },
      {
        key: "scheduleCapacityField",
        type: "domain.field",
        ownerBinding: "scheduleEntity",
        fieldTypes: ["integer"],
        fieldRequired: true,
        required: true,
      },
      {
        key: "scheduleStatusField",
        type: "domain.field",
        ownerBinding: "scheduleEntity",
        fieldTypes: ["enum"],
        fieldRequired: true,
        required: true,
      },
      { key: "appointmentEntity", type: "domain.entity", required: true },
      {
        key: "appointmentScheduleReferenceField",
        type: "domain.field",
        ownerBinding: "appointmentEntity",
        fieldTypes: ["string"],
        fieldRequired: true,
        required: true,
      },
      {
        key: "appointmentCustomerNameField",
        type: "domain.field",
        ownerBinding: "appointmentEntity",
        fieldTypes: ["string"],
        fieldRequired: true,
        required: true,
      },
      {
        key: "appointmentNotesField",
        type: "domain.field",
        ownerBinding: "appointmentEntity",
        fieldTypes: ["text"],
        fieldRequired: false,
        required: true,
      },
      {
        key: "appointmentCancellationReasonField",
        type: "domain.field",
        ownerBinding: "appointmentEntity",
        fieldTypes: ["text"],
        fieldRequired: false,
        required: true,
      },
      {
        key: "appointmentStatusField",
        type: "domain.field",
        ownerBinding: "appointmentEntity",
        fieldTypes: ["enum"],
        fieldRequired: true,
        required: true,
      },
    ],
    outputSlots: ["api.runtime", "flow.effect", "test.fixture"],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/scheduling.appointment.ts",
        outputSlot: "api.runtime",
        digest:
          "sha256:fb6eee400b408249e8054696176e21e6bc2580b393d5e8153da81587100083fd",
      },
    ],
    parameters: [
      { key: "serviceEntity", type: "graph-symbol", required: true },
      { key: "serviceNameField", type: "graph-symbol", required: true },
      {
        key: "serviceDurationMinutesField",
        type: "graph-symbol",
        required: true,
      },
      { key: "serviceActiveField", type: "graph-symbol", required: true },
      { key: "scheduleEntity", type: "graph-symbol", required: true },
      {
        key: "scheduleServiceReferenceField",
        type: "graph-symbol",
        required: true,
      },
      { key: "scheduleStartField", type: "graph-symbol", required: true },
      { key: "scheduleEndField", type: "graph-symbol", required: true },
      { key: "scheduleTimezoneField", type: "graph-symbol", required: true },
      { key: "scheduleCapacityField", type: "graph-symbol", required: true },
      { key: "scheduleStatusField", type: "graph-symbol", required: true },
      { key: "appointmentEntity", type: "graph-symbol", required: true },
      {
        key: "appointmentScheduleReferenceField",
        type: "graph-symbol",
        required: true,
      },
      {
        key: "appointmentCustomerNameField",
        type: "graph-symbol",
        required: true,
      },
      { key: "appointmentNotesField", type: "graph-symbol", required: true },
      {
        key: "appointmentCancellationReasonField",
        type: "graph-symbol",
        required: true,
      },
      { key: "appointmentStatusField", type: "graph-symbol", required: true },
    ],
    provides: [{ interfaceKey: "appointment.booking", version: "v1" }],
    verification: {
      fixture: "fixtures/default.json",
      fixtureDigest:
        "sha256:22720a4bbbb1a230f1f71bce3be10c842d1c78083af6fbd4f19882cd8116edd1",
      contractTest: "tests/contract.json",
      contractTestDigest:
        "sha256:8930291b7ba1f36706aea913846a3fd5a056d67574d1eceaa4d143535731fba9",
      status: "verified",
    },
  },
};

export {
  auditAsset,
  auditAssetV1_0_1,
  auditAssetV1_0_2,
  cartAsset,
  cartAssetV1_0_1,
  catalogAsset,
  catalogAssetV1_1_0,
  catalogAssetV1_2_0,
  crudAsset,
  crudAssetV1_0_1,
  inventoryAsset,
  inventoryAssetV1_0_1,
  inventoryAssetV1_1_0,
  inventoryAssetV1_1_1,
  inventoryLedgerAssetV1_0_0,
  identityContextAssetV1_0_0,
  identityPolicyAssetV1_0_0,
  lineConfigurationAssetV1_0_0,
  lineConfigurationAssetV1_1_0,
  lineConfigurationAssetV1_1_1,
  lineConfigurationAssetV1_1_2,
  locationContextAssetV1_0_0,
  filesMediaAssetV1_0_0,
  searchAssetV1_0_0,
  schedulingAssetV1_0_0,
  approvalsAssetV1_0_0,
  moneyPricingAssetV1_0_0,
  moneyPricingAssetV1_1_0,
  notificationAsset,
  notificationAssetV1_0_1,
  notificationAssetV1_1_0,
  notificationAssetV1_1_1,
  orderAsset,
  orderAssetV1_1_0,
  orderAssetV1_2_0,
  orderOperationsAssetV1_0_0,
  orderOperationsAssetV1_0_1,
  orderOperationsAssetV1_1_0,
  policyDeclarationsAssetV1_0_0,
  restaurantCashierAsset,
  restaurantCashierAssetV1_1_0,
  restaurantKitchenAsset,
  restaurantKitchenAssetV1_1_0,
  restaurantMenuAsset,
  restaurantOrderingAsset,
  restaurantOrderingAssetV1_1_0,
  restaurantReportingAsset,
  restaurantReportingAssetV1_1_0,
  restaurantTableSessionAsset,
  restaurantTableSessionAssetV1_1_0,
  simulatedPaymentAsset,
  simulatedPaymentAssetV1_0_1,
  workflowAsset,
  workflowAssetV1_0_1,
};

export const currentCapabilityAssets: readonly CapabilityAssetV1[] =
  Object.freeze([
    auditAssetV1_0_2,
    crudAssetV1_0_1,
    notificationAssetV1_1_1,
    workflowAssetV1_0_1,
    identityContextAssetV1_0_0,
    identityPolicyAssetV1_0_0,
    policyDeclarationsAssetV1_0_0,
    locationContextAssetV1_0_0,
    filesMediaAssetV1_0_0,
    searchAssetV1_0_0,
    schedulingAssetV1_0_0,
    appointmentSchedulingAssetV1_0_0,
    approvalsAssetV1_0_0,
    catalogAssetV1_2_0,
    cartAssetV1_0_1,
    lineConfigurationAssetV1_1_2,
    moneyPricingAssetV1_1_0,
    inventoryAssetV1_1_1,
    inventoryLedgerAssetV1_0_0,
    orderAssetV1_2_0,
    orderOperationsAssetV1_1_0,
    simulatedPaymentAssetV1_0_1,
    restaurantTableSessionAssetV1_1_0,
    restaurantMenuAsset,
    restaurantOrderingAssetV1_1_0,
    restaurantKitchenAssetV1_1_0,
    restaurantCashierAssetV1_1_0,
    restaurantReportingAssetV1_1_0,
  ]);

export const capabilityAssets: readonly CapabilityAssetV1[] = Object.freeze([
  ...currentCapabilityAssets,
  auditAssetV1_0_1,
  moneyPricingAssetV1_0_0,
  orderOperationsAssetV1_0_1,
  orderOperationsAssetV1_0_0,
  lineConfigurationAssetV1_0_0,
  lineConfigurationAssetV1_1_0,
  lineConfigurationAssetV1_1_1,
  catalogAssetV1_1_0,
  orderAssetV1_1_0,
  notificationAssetV1_1_0,
  notificationAssetV1_0_1,
  catalogAsset,
  auditAsset,
  crudAsset,
  notificationAsset,
  workflowAsset,
  cartAsset,
  inventoryAsset,
  inventoryAssetV1_0_1,
  inventoryAssetV1_1_0,
  simulatedPaymentAsset,
  orderAsset,
  restaurantTableSessionAsset,
  restaurantOrderingAsset,
  restaurantKitchenAsset,
  restaurantCashierAsset,
  restaurantReportingAsset,
]);
