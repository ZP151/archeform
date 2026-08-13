# Restaurant Task 2 / Task 3 key-and-binding contract

Date: 2026-08-12

Contract ID: `factory.restaurant-task2-task3-contract/v1`

State: `frozen`

Contract owner: `integration`

Graph target: `factory.application-graph/v3`

This manifest is the only shared key authority for the first Restaurant Task 2
and Task 3 wave. It is additive to the delivered immutable Graph V1/V2
contracts and consumes the delivered V3 prerequisite at commit
`8230197241589865f289c223fc346b6d91a438ae`. A mismatch stops both writers and
returns to the contract owner; neither writer may add an alias, infer a key, or
change a shared shape locally.

## Technology boundary

Accepted ADR-0010 is controlling. Keep the accepted Golden runtime and
immutable Graph V1/V2. Use Graph V3, Snapshot V2, and the strict V3 adapters.
The seven private UI packages are version `0.1.0`. They may use only the
already accepted React 19, TypeScript, Vitest, and Lucide coordinates recorded
in ADR-0010. `pnpm-lock.yaml` may gain only the seven workspace importers and
references to those already locked coordinates; no version or resolution may
change. Copied shadcn/ui source, direct Radix imports or dependencies, another
external package, provider/model/network/service code, Docker, and Compose are
prohibited. An external-source gap stops Task 3 for a new source study, ADR,
and founder decision.

Flow and Policy bindings are declarations, never grants. Every state request
still crosses an authenticated server boundary that rechecks tenant,
application, revision, actor, Policy, transition, idempotency, and concurrency.

## Surfaces and pages

The exact surfaces are `customer-mobile` and `merchant-desktop`. Their layout
registry keys are `mobile-product-shell` and `merchant-workspace-shell`.

Every page recipe version is `1.0.0`, has one `main` region, and lists the
following block IDs in the displayed order. Page ID, Screen Intent key, and
navigation page key are the same exact value.

| Surface          | Page key                 | Route                | Recipe key                          | `main` block IDs (`type` registry key)                                                                                               |
| ---------------- | ------------------------ | -------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| customer-mobile  | customer-home            | `/`                  | restaurant-customer-home            | `home-hero` (`menu-hero`), `home-categories` (`category-rail`), `home-items` (`menu-item-card`)                                      |
| customer-mobile  | customer-menu            | `/menu`              | restaurant-customer-menu            | `menu-categories` (`category-rail`), `menu-items` (`menu-item-card`)                                                                 |
| customer-mobile  | customer-dish-detail     | `/menu/:itemId`      | restaurant-customer-dish-detail     | `dish-configurator` (`dish-configurator`)                                                                                            |
| customer-mobile  | customer-cart            | `/cart`              | restaurant-customer-cart            | `cart-lines` (`cart-line`), `cart-summary` (`order-summary`)                                                                         |
| customer-mobile  | customer-checkout        | `/checkout`          | restaurant-customer-checkout        | `checkout-summary` (`order-summary`), `checkout-payment` (`payment-state`)                                                           |
| customer-mobile  | customer-orders          | `/orders`            | restaurant-customer-orders          | `customer-order-list` (`active-order-list`)                                                                                          |
| customer-mobile  | customer-order-detail    | `/orders/:orderId`   | restaurant-customer-order-detail    | `customer-order-summary` (`order-summary`), `customer-payment-state` (`payment-state`), `customer-order-timeline` (`order-timeline`) |
| customer-mobile  | customer-profile         | `/profile`           | restaurant-customer-profile         | `customer-profile-form` (`customer-profile-form`)                                                                                    |
| merchant-desktop | merchant-dashboard       | `/merchant`          | restaurant-merchant-dashboard       | `dashboard-metrics` (`metric-card`), `dashboard-orders` (`active-order-list`), `dashboard-tables` (`table-map`)                      |
| merchant-desktop | merchant-menu-management | `/merchant/menu`     | restaurant-merchant-menu-management | `merchant-menu-table` (`menu-management-table`), `merchant-availability` (`availability-toggle`)                                     |
| merchant-desktop | merchant-orders          | `/merchant/orders`   | restaurant-merchant-orders          | `merchant-order-list` (`active-order-list`), `merchant-order-summary` (`order-summary`), `merchant-payment-state` (`payment-state`)  |
| merchant-desktop | merchant-kitchen-queue   | `/merchant/kitchen`  | restaurant-merchant-kitchen-queue   | `kitchen-tickets` (`kitchen-ticket`)                                                                                                 |
| merchant-desktop | merchant-tables          | `/merchant/tables`   | restaurant-merchant-tables          | `merchant-table-map` (`table-map`)                                                                                                   |
| merchant-desktop | merchant-users-roles     | `/merchant/users`    | restaurant-merchant-users-roles     | `merchant-role-matrix` (`role-matrix`)                                                                                               |
| merchant-desktop | merchant-settings        | `/merchant/settings` | restaurant-merchant-settings        | `restaurant-settings-form` (`restaurant-settings-form`)                                                                              |

Customer navigation uses bottom tabs in this exact order: `customer-home`,
`customer-menu`, `customer-cart`, `customer-orders`, `customer-profile`.
Dish Detail, Checkout, and Order Detail are owned customer pages reached from a
parent journey but are not duplicate tab entries. Merchant navigation uses a
compact sidebar in the exact page-table order.

The legacy mapping is explicit: `table-entry` folds into `customer-home`;
`customer-menu` maps to `customer-menu`; `customer-cart` splits into
`customer-cart` and `customer-checkout`; `current-order` maps to
`customer-orders`; `customer-receipt` maps to `customer-order-detail`;
`merchant-analytics` maps to `merchant-dashboard`; `merchant-menu` maps to
`merchant-menu-management`; `merchant-cashier` maps to `merchant-orders`;
`merchant-kitchen` maps to `merchant-kitchen-queue`; and `merchant-tables` maps
to `merchant-tables`. `customer-dish-detail`, `customer-profile`,
`merchant-users-roles`, and `merchant-settings` are distinct required additions,
not aliases.

## Registry namespaces

All registry item versions are `1.0.0`.

- Primitive keys: `button`, `input`, `label`, `select`, `checkbox`, `switch`,
  `dialog`, `drawer`, `tabs`, `table`, `card`, `badge`, `separator`, `skeleton`,
  and `toast`.
- Pattern keys: `bottom-tab-navigation`, `compact-sidebar-navigation`,
  `form-field`, `confirmation-dialog`, `data-table`, `loading-state`,
  `empty-state`, `validation-state`, `error-state`, `confirmation-state`, and
  `denial-state`.
- Generated layout keys: `mobile-product-shell` and
  `merchant-workspace-shell`.
- Generated business-block keys: `menu-hero`, `category-rail`,
  `menu-item-card`, `dish-configurator`, `cart-line`, `order-summary`,
  `payment-state`, `order-timeline`, `metric-card`, `active-order-list`,
  `kitchen-ticket`, `table-map`, `menu-management-table`,
  `availability-toggle`, `role-matrix`, `customer-profile-form`, and
  `restaurant-settings-form`.
- Screen-recipe keys: exactly the fifteen recipe keys in the page table.
- Experience-recipe key: `fine-dining`.
- Product-recipe key: `restaurant-ordering`.

`customer-profile-form` and `restaurant-settings-form` are documented gaps in
the accepted initial block inventory: identity/preferences and Restaurant
configuration have distinct semantics that no listed block satisfies. All
style-only variation remains a recipe parameter or Fine Dining token, never a
new key.

## Entity and field authority registry

The product retains the fourteen existing Restaurant entity keys and adds
`audit-event`. Task 2 adds only these missing fields:

- `restaurant-principal.displayName`, `restaurant-principal.email`,
  `restaurant-principal.locale`, and
  `restaurant-principal.marketingOptIn`;
- `restaurant-location.taxRate`, `restaurant-location.serviceChargeRate`,
  `restaurant-location.timezone`, `restaurant-location.logoUrl`, and
  `restaurant-location.serviceOpen`;
- `restaurant-table.capacity`;
- `audit-event.actorRole`, `audit-event.action`, `audit-event.subjectEntity`,
  `audit-event.subjectId`, `audit-event.occurredAt`, and
  `audit-event.revisionId`.

Exactly these fields are client-authoritative:

- `restaurant-principal.displayName`, `restaurant-principal.locale`, and
  `restaurant-principal.marketingOptIn`;
- `restaurant-location.name`, `restaurant-location.currency`,
  `restaurant-location.active`, `restaurant-location.taxRate`,
  `restaurant-location.serviceChargeRate`, `restaurant-location.timezone`,
  `restaurant-location.logoUrl`, and `restaurant-location.serviceOpen`;
- `restaurant-table.code`, `restaurant-table.number`,
  `restaurant-table.capacity`, and `restaurant-table.active`;
- `menu-category.name`, `menu-category.sortOrder`, and
  `menu-category.active`;
- `menu-item.categoryKey`, `menu-item.name`, `menu-item.description`,
  `menu-item.price`, `menu-item.available`, `menu-item.preparationMinutes`, and
  `menu-item.imageUrl`;
- every `menu-option-group` field;
- every `menu-option` field except no exception—therefore all its fields;
- `order.fulfilmentType`, `order.orderNote`, and `order.priority`;
- `order-line.quantity`, `order-line.lineNote`, and `order-line.modifiers`;
- `order-line-option.quantity`;
- `payment-attempt.method`.

Every other field of the exact fifteen-entity registry is server-authoritative.
This complement is closed: in particular principal subject/email/role/active,
table-session fields, table status, item stock, order and payment states,
prices captured on order lines/options, totals, versions, timestamps, kitchen
ticket fields, inventory movements, idempotency keys, and every `audit-event`
field are server-authoritative. Task 2 must emit exactly one
`fieldAuthorities` entry per field. A Domain write binding is valid only for a
field in the client list; no provider/model output may supply or override the
registry.

## Flow, journey, and Policy keys

The exact flow keys are `restaurant-table-session`, `restaurant-order`, and
`restaurant-inventory-ledger`. The existing state/event/transition tuples stay
unchanged. The two legacy table-session `expire` transitions gain the explicit
`manager` actor and matching `manager:table-session:expire` Policy grant;
there is no hidden system actor and no actorless V3 transition.

The exact journey keys and ordered step coverage are:

- `customer-place-order`: order `cart/submit/submitted` customer,
  `submitted/pay/paid` customer, `paid/accept/accepted` kitchen,
  `accepted/start-preparing/preparing` kitchen,
  `preparing/mark-ready/ready` kitchen, `ready/serve/served` cashier; entry
  `customer-home`.
- `manager-cancel-submitted-order`: order `cart/submit/submitted` customer,
  `submitted/cancel/cancelled` manager; entry `merchant-orders`.
- `manager-cancel-paid-order`: order `cart/submit/submitted` customer,
  `submitted/pay/paid` cashier, `paid/cancel/cancelled` manager; entry
  `merchant-orders`.
- `manager-table-session`: table session `open/activate/active` manager,
  `active/close/closed` manager; entry `merchant-tables`.
- `manager-expire-open-table-session`: table session `open/expire/closed`
  manager; entry `merchant-tables`.
- `manager-expire-active-table-session`: table session
  `open/activate/active` manager, `active/expire/closed` manager; entry
  `merchant-tables`.
- `manager-adjust-inventory`: inventory ledger
  `recorded/record-manager-adjustment/recorded` manager; entry
  `merchant-menu-management`.

The required transition Policy keys are
`customer:order:submit`, `customer:order:pay`, `cashier:order:pay`,
`kitchen:order:accept`, `kitchen:order:start-preparing`,
`kitchen:order:mark-ready`, `cashier:order:serve`,
`manager:order:cancel`, `manager:table-session:activate`,
`manager:table-session:close`, `manager:table-session:expire`, and
`manager:inventory-ledger:record-manager-adjustment`. Existing Restaurant CRUD
and audit grants remain governed by `validateRestaurantOrderingProfile`; the
additional shared UI Policy keys are `customer:order-line:create`,
`manager:restaurant-principal:update`, and
`manager:restaurant-location:update`.

Product Recipe `acceptanceJourneyKeys` contains all seven journey keys.
Screen Intent `primaryJourneyKeys` is the ordered subset whose entry page is
that screen; non-entry pages may reference the same journey when they
participate in it. Every transition is covered by at least one exact V3 step.

## Exact Graph binding ports

Notation below is normative:

- `D entity.field read|write` is a `domain-field` policy. Its authority is the
  exact field registry above.
- `F flow:from:event:to request` is a `flow-transition` policy.
- `P role:resource:action evaluate` is a `policy-permission` policy.

Every listed port becomes the same-named own key in the page block's
`bindings`; every block binding has exactly one policy. No other binding port
is allowed in this wave.

| Page / block ID                                  | Exact binding ports                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| customer-home / home-hero                        | `locationName=D restaurant-location.name read`; `serviceOpen=D restaurant-location.serviceOpen read`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| customer-home / home-categories                  | `categoryName=D menu-category.name read`; `categoryActive=D menu-category.active read`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| customer-home / home-items                       | `name=D menu-item.name read`; `description=D menu-item.description read`; `price=D menu-item.price read`; `available=D menu-item.available read`; `imageUrl=D menu-item.imageUrl read`                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| customer-menu / menu-categories                  | same exact ports as `home-categories`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| customer-menu / menu-items                       | same exact ports as `home-items`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| customer-dish-detail / dish-configurator         | `name=D menu-item.name read`; `description=D menu-item.description read`; `price=D menu-item.price read`; `available=D menu-item.available read`; `groupName=D menu-option-group.name read`; `minimumSelections=D menu-option-group.minimumSelections read`; `maximumSelections=D menu-option-group.maximumSelections read`; `optionLabel=D menu-option.label read`; `priceDelta=D menu-option.priceDelta read`; `canAdd=P customer:order-line:create evaluate`                                                                                                                                                                                                  |
| customer-cart / cart-lines                       | `quantity=D order-line.quantity write`; `lineNote=D order-line.lineNote write`; `modifiers=D order-line.modifiers write`; `unitPrice=D order-line.unitPrice read`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| customer-cart / cart-summary                     | `total=D order.total read`; `status=D order.status read`; `submit=F restaurant-order:cart:submit:submitted request`; `canSubmit=P customer:order:submit evaluate`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| customer-checkout / checkout-summary             | `total=D order.total read`; `status=D order.status read`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| customer-checkout / checkout-payment             | `method=D payment-attempt.method write`; `paymentStatus=D order.paymentStatus read`; `attemptStatus=D payment-attempt.status read`; `amount=D payment-attempt.amount read`; `pay=F restaurant-order:submitted:pay:paid request`; `canPay=P customer:order:pay evaluate`                                                                                                                                                                                                                                                                                                                                                                                          |
| customer-orders / customer-order-list            | `status=D order.status read`; `paymentStatus=D order.paymentStatus read`; `priority=D order.priority read`; `total=D order.total read`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| customer-order-detail / customer-order-summary   | `total=D order.total read`; `status=D order.status read`; `fulfilmentType=D order.fulfilmentType read`; `orderNote=D order.orderNote read`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| customer-order-detail / customer-payment-state   | `paymentStatus=D order.paymentStatus read`; `attemptStatus=D payment-attempt.status read`; `amount=D payment-attempt.amount read`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| customer-order-detail / customer-order-timeline  | `status=D order.status read`; `submittedAt=D order.submittedAt read`; `paidAt=D order.paidAt read`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| customer-profile / customer-profile-form         | `subjectRef=D restaurant-principal.subjectRef read`; `displayName=D restaurant-principal.displayName write`; `email=D restaurant-principal.email read`; `locale=D restaurant-principal.locale write`; `marketingOptIn=D restaurant-principal.marketingOptIn write`; `role=D restaurant-principal.role read`                                                                                                                                                                                                                                                                                                                                                      |
| merchant-dashboard / dashboard-metrics           | `orderTotal=D order.total read`; `orderStatus=D order.status read`; `tableStatus=D restaurant-table.status read`; `menuAvailable=D menu-item.available read`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| merchant-dashboard / dashboard-orders            | `status=D order.status read`; `paymentStatus=D order.paymentStatus read`; `priority=D order.priority read`; `total=D order.total read`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| merchant-dashboard / dashboard-tables            | `number=D restaurant-table.number read`; `capacity=D restaurant-table.capacity read`; `status=D restaurant-table.status read`; `active=D restaurant-table.active read`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| merchant-menu-management / merchant-menu-table   | `name=D menu-item.name write`; `description=D menu-item.description write`; `price=D menu-item.price write`; `available=D menu-item.available write`; `stock=D menu-item.stock read`; `preparationMinutes=D menu-item.preparationMinutes write`                                                                                                                                                                                                                                                                                                                                                                                                                  |
| merchant-menu-management / merchant-availability | `available=D menu-item.available write`; `adjustInventory=F restaurant-inventory-ledger:recorded:record-manager-adjustment:recorded request`; `canAdjustInventory=P manager:inventory-ledger:record-manager-adjustment evaluate`                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| merchant-orders / merchant-order-list            | `status=D order.status read`; `paymentStatus=D order.paymentStatus read`; `priority=D order.priority write`; `total=D order.total read`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| merchant-orders / merchant-order-summary         | `total=D order.total read`; `status=D order.status read`; `orderNote=D order.orderNote read`; `cancelSubmitted=F restaurant-order:submitted:cancel:cancelled request`; `cancelPaid=F restaurant-order:paid:cancel:cancelled request`; `canCancel=P manager:order:cancel evaluate`                                                                                                                                                                                                                                                                                                                                                                                |
| merchant-orders / merchant-payment-state         | `paymentStatus=D order.paymentStatus read`; `attemptStatus=D payment-attempt.status read`; `amount=D payment-attempt.amount read`; `pay=F restaurant-order:submitted:pay:paid request`; `canPay=P cashier:order:pay evaluate`                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| merchant-kitchen-queue / kitchen-tickets         | `ticketStatus=D kitchen-ticket.status read`; `priority=D kitchen-ticket.priority read`; `acceptedAt=D kitchen-ticket.acceptedAt read`; `startedAt=D kitchen-ticket.startedAt read`; `readyAt=D kitchen-ticket.readyAt read`; `accept=F restaurant-order:paid:accept:accepted request`; `startPreparing=F restaurant-order:accepted:start-preparing:preparing request`; `markReady=F restaurant-order:preparing:mark-ready:ready request`; `canAccept=P kitchen:order:accept evaluate`; `canStartPreparing=P kitchen:order:start-preparing evaluate`; `canMarkReady=P kitchen:order:mark-ready evaluate`                                                          |
| merchant-tables / merchant-table-map             | `code=D restaurant-table.code write`; `number=D restaurant-table.number write`; `capacity=D restaurant-table.capacity write`; `status=D restaurant-table.status read`; `active=D restaurant-table.active write`; `activate=F restaurant-table-session:open:activate:active request`; `close=F restaurant-table-session:active:close:closed request`; `expireOpen=F restaurant-table-session:open:expire:closed request`; `expireActive=F restaurant-table-session:active:expire:closed request`; `canActivate=P manager:table-session:activate evaluate`; `canClose=P manager:table-session:close evaluate`; `canExpire=P manager:table-session:expire evaluate` |
| merchant-users-roles / merchant-role-matrix      | `subjectRef=D restaurant-principal.subjectRef read`; `displayName=D restaurant-principal.displayName read`; `email=D restaurant-principal.email read`; `role=D restaurant-principal.role read`; `active=D restaurant-principal.active read`; `canManage=P manager:restaurant-principal:update evaluate`                                                                                                                                                                                                                                                                                                                                                          |
| merchant-settings / restaurant-settings-form     | `name=D restaurant-location.name write`; `currency=D restaurant-location.currency write`; `taxRate=D restaurant-location.taxRate write`; `serviceChargeRate=D restaurant-location.serviceChargeRate write`; `timezone=D restaurant-location.timezone write`; `logoUrl=D restaurant-location.logoUrl write`; `serviceOpen=D restaurant-location.serviceOpen write`; `canConfigure=P manager:restaurant-location:update evaluate`                                                                                                                                                                                                                                  |

## Cross-task acceptance and stop rule

Task 2 owns the deterministic Product Recipe, Graph V3 semantics, exact Graph
page/block instances, fields, authorities, journeys, and binding policies.
Task 3 owns registry source and validates that every referenced registry key,
slot, state, responsive variant, and port exists with the exact manifest
meaning. Task 2 never edits UI registry paths; Task 3 never edits capability or
Graph composition paths.

Both tasks must independently test all fifteen pages, all registry references,
all binding targets and policy discriminators, all field-authority coverage,
all journey steps, and deterministic ordering. A shared-key change, missing
port, new field/flow/policy, dependency/source request, or Graph contract change
stops both tasks. Only PM may revise this versioned manifest after any required
Graph or technology-governance gate.
