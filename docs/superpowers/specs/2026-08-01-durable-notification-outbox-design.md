# Durable notification outbox design

Status: approved for autonomous implementation on 2026-08-01.

## Purpose

Promote notifications from a generated runtime event marker to a reusable,
durable, retryable capability that preserves the Factory Application Graph as
the source of truth. The first release proves that the same locked capability
package compiles into Expense Approval and Simple Ecommerce with distinct,
validated Graph bindings.

## Scope

The release introduces `core.notification@1.1.0`. It produces a local,
generated-application outbox and a deterministic fixture transport. A flow
effect with `notification.send` writes a notification intent in the same
application-store transaction as the domain mutation. A separate generated
worker claims pending records, delivers them through the local transport, and
records a bounded retry state.

The package has one required, Graph-symbol `recipientRole` parameter and an
optional declared template identifier. A Graph may select only the package
version and those declared inputs; it cannot provide an address, URL, secret,
provider selector, executable callback, arbitrary template content, or output
path.

## Contract correction: immutable template bindings

The initial `1.1.0` package recorded the optional template in its descriptive
input schema but did not expose it through the strict composition parameter
contract. It is therefore immutable but cannot safely prove profile-specific
template bindings. It remains Golden and replayable for every existing lock.

`core.notification@1.1.1` is the new current package. It preserves every
`1.1.0` output slot and outbox behavior, and adds exactly one optional
composition parameter:

```text
template: enum (optional)
allowed values: expense.approval-outcome, ecommerce.order-outcome
```

The enum is a package-declared identifier, not a message body or a free-form
string. The composition resolver rejects an unknown template before it creates
a lock. The compiler copies only the validated locked identifier into the
generated outbox. New Expense and Ecommerce Drafts must select the same
`1.1.1` digest; historic `1.1.0` locks remain unchanged and compile with a
`null` template.

## Non-goals

- Email, SMS, push, Slack, webhook, or external provider delivery.
- BullMQ, a message broker, provider credentials, network calls, or a public
  send endpoint.
- Background scheduling beyond an explicit, local worker drain command.
- Replacing or reinterpreting published Graphs locked to
  `core.notification@1.0.0` or `1.0.1`.

## Contract

`core.notification@1.1.0` declares:

```text
effect: notification.send
parameters:
  recipientRole: graph-symbol (required)
  template: message.template (optional)
output slots:
  api.runtime
  api.persistence
  api.worker
  test.fixture
  flow.effect
```

The generated runtime owns the following internal model. It is not a Graph
model and is not accepted from a client request.

```ts
type NotificationOutboxEntry = {
  id: string;
  dedupeKey: string;
  actor: string;
  recipientRole: string;
  template: string | null;
  entity: string;
  recordId: string;
  status: "pending" | "delivered" | "failed";
  attempts: number;
  availableAt: string;
  deliveredAt: string | null;
  lastError: string | null;
};
```

The deterministic dedupe key is derived by the generated runtime from the
locked application identifier, the effect operation, record identity,
recipient role, and template. Repeating an equivalent transition never creates
a second deliverable notification. The outbox is not deduplicated across
different recipients or declared templates.

## Runtime design

```text
Published Graph + composition lock
              |
              v
Compiler validates package digests, bindings, and output slots
              |
              v
Generated application
  domain transition --- same transaction ---> NotificationOutbox(pending)
                                                  |
                                                  v
                                explicit local worker drain command
                                                  |
                                                  v
                              deterministic fixture transport
                                      |                 |
                                  delivered       retry / failed
```

The generated `RecordStore` gains narrow outbox operations: enqueue, claim
due work, mark delivered, and record a bounded failed attempt. Both in-memory
and Prisma stores implement those operations. The Prisma target emits a
`NotificationOutbox` model and migration. The generated API never exposes an
endpoint that can enqueue or deliver arbitrary notification content.

The worker uses a bounded maximum of three attempts. The first and second
delivery failures return the record to `pending` with a deterministic next
availability time. The third failure records `failed`. Delivery success is
idempotent: an already delivered entry is never handed to the transport again.
Fixture tests can configure the local transport to fail a specific number of
attempts without changing the Graph or the package.

## Profile bindings and proof

Expense Approval uses the `expense.approval-outcome` package template to notify
the employee after an approval or rejection transition. Simple Ecommerce uses
the `ecommerce.order-outcome` package template to notify the shopper after a
payment or fulfilment transition. The generated applications use the same exact
`1.1.1` package digest and differ only through declared entities, roles,
transitions, and validated template bindings.

Acceptance tests must prove:

1. each profile has the same selected package version and digest;
2. state mutation and notification intent either both commit or both roll
   back;
3. an identical effect enqueues one entry only;
4. a transient fixture failure retries and subsequently delivers;
5. three fixture failures produce a terminal failed entry;
6. an unsigned, incompatible, undeclared, or slot-escaping package is rejected
   before compilation; and
7. the generated API and worker cannot deliver a client-provided recipient,
   message, URL, or provider.

The final profile evidence will run published Graph compilation, isolated
generated-runtime journeys, cleanup, and one guarded real OpenAI Graph-Diff
through an environment-only credential. Raw prompts, responses, and
credentials are not persisted or reported.

## Compatibility and rollback

`core.notification@1.0.1` and `1.1.0` remain immutable and replayable. New
guided recipes can select `1.1.1` only after the composition resolver
recognizes its declared output slots, validates its declared template enum, and
verifies its manifest digests. Rollback is a new Draft that selects the
previously approved lock; no published revision, package directory, or
generated artifact is overwritten.

## Rejected alternatives

- **Add a provider SDK now:** it creates a credential, outage, and provider
  semantics boundary before Factory has proved the generic intent model.
- **Use an in-memory queue only:** it loses notifications on process restart
  and cannot prove atomic domain-to-delivery intent.
- **Make notification a profile-specific handler:** it repeats business logic
  and does not increase the reusable Capability Foundry.
