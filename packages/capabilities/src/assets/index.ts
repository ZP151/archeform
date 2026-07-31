export * from "./contract.js";

import type { CapabilityAssetV1 } from "./contract.js";
import { auditAsset } from "./core/audit.js";
import { auditAssetV1_0_1 } from "./core/audit-v1-0-1.js";
import { crudAsset } from "./core/crud.js";
import { crudAssetV1_0_1 } from "./core/crud-v1-0-1.js";
import { notificationAsset } from "./core/notification.js";
import { notificationAssetV1_0_1 } from "./core/notification-v1-0-1.js";
import { workflowAsset } from "./core/workflow.js";
import { workflowAssetV1_0_1 } from "./core/workflow-v1-0-1.js";
import { identityContextAssetV1_0_0 } from "./core/identity-context-v1-0-0.js";
import { locationContextAssetV1_0_0 } from "./core/location-context-v1-0-0.js";
import { catalogAsset } from "./commerce/catalog.js";
import { catalogAssetV1_1_0 } from "./commerce/catalog-v1-1-0.js";
import { catalogAssetV1_2_0 } from "./commerce/catalog-v1-2-0.js";
import { cartAsset } from "./commerce/cart.js";
import { cartAssetV1_0_1 } from "./commerce/cart-v1-0-1.js";
import { inventoryLedgerAssetV1_0_0 } from "./commerce/inventory-ledger-v1-0-0.js";
import { inventoryAsset } from "./commerce/inventory.js";
import { inventoryAssetV1_0_1 } from "./commerce/inventory-v1-0-1.js";
import { lineConfigurationAssetV1_0_0 } from "./commerce/line-configuration-v1-0-0.js";
import { lineConfigurationAssetV1_1_0 } from "./commerce/line-configuration-v1-1-0.js";
import { lineConfigurationAssetV1_1_1 } from "./commerce/line-configuration-v1-1-1.js";
import { orderAsset } from "./commerce/order.js";
import { orderAssetV1_1_0 } from "./commerce/order-v1-1-0.js";
import { orderAssetV1_2_0 } from "./commerce/order-v1-2-0.js";
import { simulatedPaymentAsset } from "./commerce/simulated-payment.js";
import { simulatedPaymentAssetV1_0_1 } from "./commerce/simulated-payment-v1-0-1.js";
import { restaurantTableSessionAsset } from "./restaurant/table-session.js";
import { restaurantMenuAsset } from "./restaurant/menu.js";
import { restaurantOrderingAsset } from "./restaurant/ordering.js";
import { restaurantKitchenAsset } from "./restaurant/kitchen.js";
import { restaurantCashierAsset } from "./restaurant/cashier.js";
import { restaurantReportingAsset } from "./restaurant/reporting.js";

export {
  auditAsset,
  auditAssetV1_0_1,
  cartAsset,
  cartAssetV1_0_1,
  catalogAsset,
  catalogAssetV1_1_0,
  catalogAssetV1_2_0,
  crudAsset,
  crudAssetV1_0_1,
  inventoryAsset,
  inventoryAssetV1_0_1,
  inventoryLedgerAssetV1_0_0,
  identityContextAssetV1_0_0,
  lineConfigurationAssetV1_0_0,
  lineConfigurationAssetV1_1_0,
  lineConfigurationAssetV1_1_1,
  locationContextAssetV1_0_0,
  notificationAsset,
  notificationAssetV1_0_1,
  orderAsset,
  orderAssetV1_1_0,
  orderAssetV1_2_0,
  restaurantCashierAsset,
  restaurantKitchenAsset,
  restaurantMenuAsset,
  restaurantOrderingAsset,
  restaurantReportingAsset,
  restaurantTableSessionAsset,
  simulatedPaymentAsset,
  simulatedPaymentAssetV1_0_1,
  workflowAsset,
  workflowAssetV1_0_1,
};

export const currentCapabilityAssets: readonly CapabilityAssetV1[] =
  Object.freeze([
    auditAssetV1_0_1,
    crudAssetV1_0_1,
    notificationAssetV1_0_1,
    workflowAssetV1_0_1,
    identityContextAssetV1_0_0,
    locationContextAssetV1_0_0,
    catalogAssetV1_2_0,
    cartAssetV1_0_1,
    lineConfigurationAssetV1_1_1,
    inventoryAssetV1_0_1,
    inventoryLedgerAssetV1_0_0,
    orderAssetV1_2_0,
    simulatedPaymentAssetV1_0_1,
    restaurantTableSessionAsset,
    restaurantMenuAsset,
    restaurantOrderingAsset,
    restaurantKitchenAsset,
    restaurantCashierAsset,
    restaurantReportingAsset,
  ]);

export const capabilityAssets: readonly CapabilityAssetV1[] = Object.freeze([
  ...currentCapabilityAssets,
  lineConfigurationAssetV1_0_0,
  lineConfigurationAssetV1_1_0,
  catalogAssetV1_1_0,
  orderAssetV1_1_0,
  catalogAsset,
  auditAsset,
  crudAsset,
  notificationAsset,
  workflowAsset,
  cartAsset,
  inventoryAsset,
  simulatedPaymentAsset,
  orderAsset,
]);
