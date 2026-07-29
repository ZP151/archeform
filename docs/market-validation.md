# Market and ecosystem validation

Updated: 2026-07-30

## Decision under investigation

Determine which public projects can safely inform or support a Factory-owned
Restaurant Ordering Profile without making an external runtime, data model, or
source tree the source of truth.

## Observed sources

| Need | Source | Observed fact | Allowed Factory role | Decision affected |
| --- | --- | --- | --- | --- |
| Commerce architecture | [Medusa](https://github.com/medusajs/medusa) | MIT-licensed; its documented modules separate product, cart, order, payment, inventory, fulfilment, pricing, and stock locations. | Future provider adapter and refreshed source study only. | Keep Factory's initial catalog, cart, order, inventory, and payment semantics native. |
| Commerce architecture | [Vendure](https://github.com/vendure-ecommerce/vendure/blob/v3.7.1/LICENSE.md) | Community Edition defaults to GPLv3 unless commercially licensed. | Reference only. No copy, package, linking, or runtime embedding. | Do not create a Vendure provider or reuse code. |
| Offline Web shell | [Workbox](https://github.com/GoogleChrome/workbox) | MIT-licensed PWA caching toolkit. | Candidate direct dependency for generated Web applications. | Cache application shell, menu reads, and static assets only; never make payments or offline mutations authoritative. |
| Query cache and mutation handling | [TanStack Query](https://github.com/TanStack/query) | MIT-licensed React data-fetching and caching library. | Candidate direct dependency for generated Web applications. | Require server-side `cartRevision`, `clientMutationId`, idempotency, and conflict handling before offline cart writes. |
| Realtime kitchen updates | [Socket.IO](https://github.com/socketio/socket.io) | MIT-licensed bidirectional communication library. | Candidate generated-runtime adapter. | Define a Factory event envelope first; publish after a persisted order transition and never transition an order from a socket message. |
| Realtime provider alternative | [Centrifugo](https://github.com/centrifugal/centrifugo) | Apache-2.0 realtime service. | Future provider adapter. | Keep the event envelope transport-neutral so it can replace Socket.IO. |
| QR presentation | [qrcode.react](https://github.com/zpao/qrcode.react) | ISC-licensed React QR rendering package; its bundled QR encoder is MIT. | Candidate direct dependency for generated Web applications. | QR payloads must be opaque, signed, and expiring table-session tokens, never raw table IDs or access credentials. |
| Browser receipt printing | [react-to-print](https://github.com/MatthewHerbst/react-to-print) | MIT-licensed browser print component with documented WebView limitations. | Candidate direct dependency for customer receipts. | Emit a Factory receipt projection and print CSS. A browser print request is not payment or kitchen-print completion evidence. |
| Silent thermal printing | [QZ Tray](https://github.com/qzind/tray) | LGPL-2.1 desktop project; silent printing uses signed requests and certificates. | Future external print-provider adapter only. | Expose bounded receipt and kitchen-ticket jobs; never vendor it or place signing keys in Graphs or generated applications. |
| Operational dashboards | [Apache ECharts](https://github.com/apache/echarts) | Apache-2.0 charting library with bundled third-party notice obligations. | Candidate direct dependency with notices. | Compile Factory-owned aggregate read models for sales, preparation time, cancellations, and stock alerts. |
| Commerce-provider comparison | [Saleor](https://github.com/saleor/saleor) | BSD-3-Clause API-first commerce project. | Future provider adapter or source-study reference only. | Validate that Factory's provider contract is not Medusa-specific. |
| POS reference | [Open Source POS](https://github.com/opensourcepos/opensourcepos) | Its displayed MIT text adds a visible footer-signature condition. | Reference only. | Study table, receipt, stock, and reporting concepts; do not copy code, UI, or assets. |

## Exclusion list

- [Vendure](https://github.com/vendure-ecommerce/vendure): GPLv3 by default.
- [ERPNext](https://github.com/frappe/erpnext): GPL-3.0.
- [Plausible Analytics](https://github.com/Plausible/analytics): AGPL-3.0.
- QZ Tray: do not vendor LGPL source or runtime into Factory products.
- Any future SSPL, BSL, source-available, or custom-reciprocal project is
  excluded from copying and embedded runtime use until a dedicated legal and
  architecture decision says otherwise.

## Product inference

The first Restaurant increment should introduce Factory-owned order semantics
for table sessions, fulfilment type, order versioning, cancellation audit, and
kitchen state. QR, realtime, receipts, offline behaviour, and providers are
adapters around those semantics. They are not alternative sources of truth.

Before a candidate is implemented, record its exact published version, notice
requirements, adapter boundary, removal path, fixture strategy, and acceptance
tests in the corresponding source-study and capability design.
