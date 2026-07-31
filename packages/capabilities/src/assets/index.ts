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
import { inventoryAssetV1_1_0 } from "./commerce/inventory-v1-1-0.js";
import { lineConfigurationAssetV1_0_0 } from "./commerce/line-configuration-v1-0-0.js";
import { lineConfigurationAssetV1_1_0 } from "./commerce/line-configuration-v1-1-0.js";
import { lineConfigurationAssetV1_1_1 } from "./commerce/line-configuration-v1-1-1.js";
import { orderAsset } from "./commerce/order.js";
import { orderAssetV1_1_0 } from "./commerce/order-v1-1-0.js";
import { orderAssetV1_2_0 } from "./commerce/order-v1-2-0.js";
import {
  orderAssetV1_3_0,
  createCommerceOrderTransactionOperationAdapter,
} from "./commerce/order-v1-3-0.js";
import { orderAssetV1_3_1 } from "./commerce/order-v1-3-1.js";
import { orderAssetV1_3_2 } from "./commerce/order-v1-3-2.js";
import { simulatedPaymentAsset } from "./commerce/simulated-payment.js";
import { simulatedPaymentAssetV1_0_1 } from "./commerce/simulated-payment-v1-0-1.js";
import { commerceTransactionAssetV1_0_0 } from "./commerce/transaction-v1-0-0.js";
import { commerceTransactionAssetV2_0_0 } from "./commerce/transaction-v2-0-0.js";
import { commerceTransactionAssetV2_1_0 } from "./commerce/transaction-v2-1-0.js";
import { restaurantTableSessionAsset } from "./restaurant/table-session.js";
import { restaurantTableSessionAssetV1_1_0 } from "./restaurant/table-session-v1-1-0.js";
import { restaurantMenuAsset } from "./restaurant/menu.js";
import { restaurantOrderingAsset } from "./restaurant/ordering.js";
import { restaurantOrderingAssetV1_1_0 } from "./restaurant/ordering-v1-1-0.js";
import {
  restaurantOrderingAssetV1_2_0,
  createRestaurantOrderingTransactionOperationAdapter,
} from "./restaurant/ordering-v1-2-0.js";
import { restaurantOrderingAssetV1_2_1 } from "./restaurant/ordering-v1-2-1.js";
import { restaurantOrderingAssetV1_2_2 } from "./restaurant/ordering-v1-2-2.js";
import { restaurantKitchenAsset } from "./restaurant/kitchen.js";
import { restaurantKitchenAssetV1_1_0 } from "./restaurant/kitchen-v1-1-0.js";
import { restaurantCashierAsset } from "./restaurant/cashier.js";
import { restaurantCashierAssetV1_1_0 } from "./restaurant/cashier-v1-1-0.js";
import { restaurantReportingAsset } from "./restaurant/reporting.js";
import { restaurantReportingAssetV1_1_0 } from "./restaurant/reporting-v1-1-0.js";

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
  inventoryAssetV1_1_0,
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
  orderAssetV1_3_0,
  orderAssetV1_3_1,
  orderAssetV1_3_2,
  createCommerceOrderTransactionOperationAdapter,
  restaurantCashierAsset,
  restaurantCashierAssetV1_1_0,
  restaurantKitchenAsset,
  restaurantKitchenAssetV1_1_0,
  restaurantMenuAsset,
  restaurantOrderingAsset,
  restaurantOrderingAssetV1_1_0,
  restaurantOrderingAssetV1_2_0,
  restaurantOrderingAssetV1_2_1,
  restaurantOrderingAssetV1_2_2,
  createRestaurantOrderingTransactionOperationAdapter,
  restaurantReportingAsset,
  restaurantReportingAssetV1_1_0,
  restaurantTableSessionAsset,
  restaurantTableSessionAssetV1_1_0,
  simulatedPaymentAsset,
  simulatedPaymentAssetV1_0_1,
  commerceTransactionAssetV1_0_0,
  commerceTransactionAssetV2_0_0,
  commerceTransactionAssetV2_1_0,
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
    inventoryAssetV1_1_0,
    inventoryLedgerAssetV1_0_0,
    orderAssetV1_2_0,
    simulatedPaymentAssetV1_0_1,
    commerceTransactionAssetV1_0_0,
    restaurantTableSessionAssetV1_1_0,
    restaurantMenuAsset,
    restaurantOrderingAssetV1_1_0,
    restaurantKitchenAssetV1_1_0,
    restaurantCashierAssetV1_1_0,
    restaurantReportingAssetV1_1_0,
  ]);

export const capabilityAssets: readonly CapabilityAssetV1[] = Object.freeze([
  ...currentCapabilityAssets,
  commerceTransactionAssetV2_0_0,
  commerceTransactionAssetV2_1_0,
  orderAssetV1_3_0,
  orderAssetV1_3_1,
  orderAssetV1_3_2,
  restaurantOrderingAssetV1_2_0,
  restaurantOrderingAssetV1_2_1,
  restaurantOrderingAssetV1_2_2,
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
  inventoryAssetV1_0_1,
  simulatedPaymentAsset,
  orderAsset,
  restaurantTableSessionAsset,
  restaurantOrderingAsset,
  restaurantKitchenAsset,
  restaurantCashierAsset,
  restaurantReportingAsset,
]);
