// Standalone immutable baseline captured from 92f21089 before correction implementation.
export const approvalLegacyFixtures = {
  expense: {
    baseCommit: "92f21089beeb184a236a1512cb4c1866f158e903",
    input: {
      publishedRevisionId: "correction-legacy-expense",
      graph: {
        apiVersion: "factory.application-graph/v1",
        metadata: {
          id: "expense-approval-requirement",
          workspaceId: "local-workspace",
          name: "Expense Approval",
        },
        page: {
          pages: [
            {
              id: "expense-dashboard",
              route: "/expense-dashboard",
              title: "Expense dashboard",
              blocks: [
                {
                  id: "expense-dashboard-stats",
                  type: "stats",
                  entity: "expense",
                },
              ],
            },
            {
              id: "expense-list",
              route: "/expense-list",
              title: "Expense list",
              blocks: [
                {
                  id: "expense-list-list",
                  type: "list",
                  entity: "expense",
                },
              ],
            },
            {
              id: "expense-form",
              route: "/expense-form",
              title: "New expense",
              blocks: [
                {
                  id: "expense-form-form",
                  type: "form",
                  entity: "expense",
                },
              ],
            },
            {
              id: "expense-detail",
              route: "/expense-detail",
              title: "Expense detail",
              blocks: [
                {
                  id: "expense-detail-detail",
                  type: "detail",
                  entity: "expense",
                },
              ],
            },
            {
              id: "expense-queue",
              route: "/expense-queue",
              title: "Approval queue",
              blocks: [
                {
                  id: "expense-queue-queue",
                  type: "queue",
                  entity: "expense",
                },
              ],
            },
            {
              id: "expense-settings",
              route: "/expense-settings",
              title: "Expense settings",
              blocks: [
                {
                  id: "expense-settings-settings",
                  type: "settings",
                },
              ],
            },
            {
              id: "employee-list",
              route: "/employee-list",
              title: "Employee",
              blocks: [
                {
                  id: "employee-list-list",
                  type: "list",
                  entity: "employee",
                },
              ],
            },
          ],
          navigation: [
            {
              id: "nav-expense-dashboard",
              label: "Expense dashboard",
              pageId: "expense-dashboard",
              icon: "layout-grid",
            },
            {
              id: "nav-expense-list",
              label: "Expense list",
              pageId: "expense-list",
              icon: "list",
            },
            {
              id: "nav-expense-queue",
              label: "Approval queue",
              pageId: "expense-queue",
              icon: "inbox",
            },
            {
              id: "nav-expense-settings",
              label: "Expense settings",
              pageId: "expense-settings",
              icon: "settings",
            },
            {
              id: "nav-employee-list",
              label: "Employee",
              pageId: "employee-list",
              icon: "list",
            },
          ],
        },
        domain: {
          entities: [
            {
              key: "expense",
              label: "Expense",
              fields: [
                {
                  key: "amount",
                  type: "decimal",
                  required: true,
                },
                {
                  key: "category",
                  type: "enum",
                  required: true,
                  values: ["travel", "meals", "software", "office", "other"],
                },
                {
                  key: "date",
                  type: "date",
                  required: true,
                },
                {
                  key: "receipt",
                  type: "url",
                  required: false,
                },
                {
                  key: "notes",
                  type: "text",
                  required: false,
                },
                {
                  key: "status",
                  type: "enum",
                  required: true,
                  values: ["draft", "submitted", "approved", "rejected"],
                },
              ],
              indexes: [
                {
                  fields: ["status"],
                },
              ],
            },
            {
              key: "employee",
              label: "Employee",
              fields: [
                {
                  key: "name",
                  type: "string",
                  required: true,
                },
                {
                  key: "department",
                  type: "string",
                  required: false,
                },
              ],
              indexes: [],
            },
            {
              key: "expense-approval-requirement-principal",
              label: "Expense Approval principal",
              fields: [
                {
                  key: "subjectRef",
                  type: "string",
                  required: true,
                  unique: true,
                },
                {
                  key: "role",
                  type: "enum",
                  required: true,
                  values: ["employee", "manager", "finance"],
                },
                {
                  key: "active",
                  type: "boolean",
                  required: true,
                },
              ],
              indexes: [
                {
                  fields: ["active"],
                },
              ],
            },
            {
              key: "expense-approval-requirement-session",
              label: "Expense Approval session",
              fields: [
                {
                  key: "subjectRef",
                  type: "string",
                  required: true,
                },
                {
                  key: "status",
                  type: "enum",
                  required: true,
                  values: ["active", "expired"],
                },
                {
                  key: "expiresAt",
                  type: "datetime",
                  required: true,
                },
              ],
              indexes: [
                {
                  fields: ["subjectRef", "status"],
                },
              ],
            },
          ],
          relations: [
            {
              from: "expense-approval-requirement-session",
              to: "expense-approval-requirement-principal",
              kind: "many-to-one",
              field: "subjectRef",
            },
          ],
          seedData: [
            {
              entity: "expense",
              id: "sample-expense",
              values: {
                amount: 125.5,
                category: "travel",
                date: "2026-08-01",
                receipt: "sample-receipt.pdf",
                notes: "Sample Notes detail",
                status: "draft",
              },
            },
            {
              entity: "employee",
              id: "sample-employee",
              values: {
                name: "Sample Name",
                department: "Sample Department",
              },
            },
          ],
        },
        policy: {
          roles: ["employee", "manager", "finance"],
          permissions: [
            {
              role: "employee",
              resource: "expense",
              actions: ["create", "read", "submit"],
            },
            {
              role: "employee",
              resource: "employee",
              actions: ["read", "update"],
            },
            {
              role: "employee",
              resource: "expense-approval-requirement-principal",
              actions: ["read"],
            },
            {
              role: "employee",
              resource: "expense-approval-requirement-session",
              actions: ["create", "read", "update"],
            },
            {
              role: "manager",
              resource: "expense",
              actions: ["read", "approve", "reject"],
            },
            {
              role: "manager",
              resource: "expense-approval-requirement-principal",
              actions: ["read"],
            },
            {
              role: "manager",
              resource: "expense-approval-requirement-session",
              actions: ["read"],
            },
            {
              role: "finance",
              resource: "expense",
              actions: ["read", "audit"],
            },
            {
              role: "finance",
              resource: "expense-approval-requirement-principal",
              actions: ["read"],
            },
            {
              role: "finance",
              resource: "expense-approval-requirement-session",
              actions: ["read"],
            },
          ],
        },
        flow: {
          flows: [
            {
              id: "expense-approval",
              entity: "expense",
              initialState: "draft",
              states: ["draft", "submitted", "approved", "rejected"],
              events: ["submit", "approve", "reject"],
              transitions: [
                {
                  from: "draft",
                  event: "submit",
                  to: "submitted",
                  roles: ["employee"],
                  effects: [
                    {
                      capability: "audit.record",
                      operation: "record",
                    },
                  ],
                },
                {
                  from: "submitted",
                  event: "approve",
                  to: "approved",
                  roles: ["manager"],
                  effects: [
                    {
                      capability: "audit.record",
                      operation: "record",
                    },
                    {
                      capability: "notification.send",
                      operation: "send",
                    },
                  ],
                },
                {
                  from: "submitted",
                  event: "reject",
                  to: "rejected",
                  roles: ["manager"],
                  effects: [
                    {
                      capability: "audit.record",
                      operation: "record",
                    },
                    {
                      capability: "notification.send",
                      operation: "send",
                    },
                  ],
                },
              ],
            },
          ],
        },
        integration: {
          providers: [],
          capabilities: [
            {
              key: "audit.record",
              providerId: "factory",
              operation: "record",
            },
            {
              key: "notification.send",
              providerId: "factory",
              operation: "send",
            },
            {
              key: "identity.context.resolve",
              providerId: "factory",
              operation: "resolve",
            },
            {
              key: "authorization.decision",
              providerId: "factory",
              operation: "decision",
            },
          ],
          compositionSelections: [
            {
              lock: {
                key: "core.crud",
                version: "1.0.1",
                packageRoot: "packages/capabilities/assets/core.crud/1.0.1",
                manifestDigest:
                  "sha256:8dede9ba8d63bea9b09c7bf7ac6ce784c52595b644d03eca52ea6996a31882d1",
                lifecycle: "golden",
              },
              bindings: {
                entityKey: {
                  graphSymbol: "graph.domain.expense",
                },
                routeKey: {
                  graphSymbol: "graph.page.expense-list",
                },
              },
            },
            {
              lock: {
                key: "core.workflow",
                version: "1.0.1",
                packageRoot: "packages/capabilities/assets/core.workflow/1.0.1",
                manifestDigest:
                  "sha256:16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884",
                lifecycle: "golden",
              },
              bindings: {
                flowKey: {
                  graphSymbol: "graph.flow.expense-approval",
                },
              },
            },
            {
              lock: {
                key: "core.identity-policy",
                version: "1.0.0",
                packageRoot:
                  "packages/capabilities/assets/core.identity-policy/1.0.0",
                manifestDigest:
                  "sha256:a216444b219f00431820a0df8e2bc3b604296430beb8fa6549f1b40c92025d82",
                lifecycle: "golden",
              },
              bindings: {
                principalEntity: {
                  graphSymbol:
                    "graph.domain.expense-approval-requirement-principal",
                },
                sessionEntity: {
                  graphSymbol:
                    "graph.domain.expense-approval-requirement-session",
                },
                defaultRole: {
                  graphSymbol: "graph.policy.employee",
                },
                authenticatedRole: {
                  graphSymbol: "graph.policy.manager",
                },
              },
            },
            {
              lock: {
                key: "core.policy-declarations",
                version: "1.0.0",
                packageRoot:
                  "packages/capabilities/assets/core.policy-declarations/1.0.0",
                manifestDigest:
                  "sha256:56e6ead5aaa6e9f5fe9cf7c608b6b51b16064964cf95cd123bdc3e0725642c54",
                lifecycle: "golden",
              },
              bindings: {},
            },
            {
              lock: {
                key: "core.audit",
                version: "1.0.2",
                packageRoot: "packages/capabilities/assets/core.audit/1.0.2",
                manifestDigest:
                  "sha256:fe6616252c7b44efe61d516d305e689f3f593d70d5287baac31b5f31013addc8",
                lifecycle: "golden",
              },
              bindings: {
                actorRole: {
                  graphSymbol: "graph.policy.manager",
                },
              },
            },
            {
              lock: {
                key: "core.notification",
                version: "1.1.1",
                packageRoot:
                  "packages/capabilities/assets/core.notification/1.1.1",
                manifestDigest:
                  "sha256:207eaa0fd719013129ba84bd8f66f82219b619ee1f5c9e2d4e3d896c339e6132",
                lifecycle: "golden",
              },
              bindings: {
                recipientRole: {
                  graphSymbol: "graph.policy.employee",
                },
              },
            },
          ],
        },
        experience: {
          theme: {
            mode: "light",
            tokens: {},
          },
          locales: ["en"],
        },
      },
      compositionLock: {
        apiVersion: "factory.composition/v1",
        applicationGraphChecksum:
          "sha256:2af52f9ad0441bf9d850dcf2f842f35613e2f61ff7a65258837e9bbc041d5831",
        packages: [
          {
            lock: {
              key: "core.audit",
              version: "1.0.2",
              packageRoot: "packages/capabilities/assets/core.audit/1.0.2",
              manifestDigest:
                "sha256:fe6616252c7b44efe61d516d305e689f3f593d70d5287baac31b5f31013addc8",
              lifecycle: "golden",
            },
            bindings: {
              actorRole: {
                graphSymbol: "graph.policy.manager",
              },
            },
          },
          {
            lock: {
              key: "core.crud",
              version: "1.0.1",
              packageRoot: "packages/capabilities/assets/core.crud/1.0.1",
              manifestDigest:
                "sha256:8dede9ba8d63bea9b09c7bf7ac6ce784c52595b644d03eca52ea6996a31882d1",
              lifecycle: "golden",
            },
            bindings: {
              entityKey: {
                graphSymbol: "graph.domain.expense",
              },
              routeKey: {
                graphSymbol: "graph.page.expense-list",
              },
            },
          },
          {
            lock: {
              key: "core.identity-policy",
              version: "1.0.0",
              packageRoot:
                "packages/capabilities/assets/core.identity-policy/1.0.0",
              manifestDigest:
                "sha256:a216444b219f00431820a0df8e2bc3b604296430beb8fa6549f1b40c92025d82",
              lifecycle: "golden",
            },
            bindings: {
              authenticatedRole: {
                graphSymbol: "graph.policy.manager",
              },
              defaultRole: {
                graphSymbol: "graph.policy.employee",
              },
              principalEntity: {
                graphSymbol:
                  "graph.domain.expense-approval-requirement-principal",
              },
              sessionEntity: {
                graphSymbol:
                  "graph.domain.expense-approval-requirement-session",
              },
            },
          },
          {
            lock: {
              key: "core.notification",
              version: "1.1.1",
              packageRoot:
                "packages/capabilities/assets/core.notification/1.1.1",
              manifestDigest:
                "sha256:207eaa0fd719013129ba84bd8f66f82219b619ee1f5c9e2d4e3d896c339e6132",
              lifecycle: "golden",
            },
            bindings: {
              recipientRole: {
                graphSymbol: "graph.policy.employee",
              },
            },
          },
          {
            lock: {
              key: "core.policy-declarations",
              version: "1.0.0",
              packageRoot:
                "packages/capabilities/assets/core.policy-declarations/1.0.0",
              manifestDigest:
                "sha256:56e6ead5aaa6e9f5fe9cf7c608b6b51b16064964cf95cd123bdc3e0725642c54",
              lifecycle: "golden",
            },
            bindings: {},
          },
          {
            lock: {
              key: "core.workflow",
              version: "1.0.1",
              packageRoot: "packages/capabilities/assets/core.workflow/1.0.1",
              manifestDigest:
                "sha256:16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884",
              lifecycle: "golden",
            },
            bindings: {
              flowKey: {
                graphSymbol: "graph.flow.expense-approval",
              },
            },
          },
        ],
        resolvedContributionDigests: [
          "sha256:0249329a78a7fc15eaf285892df9e6bb21b3ae04808d73316eae1b320bb0197c",
          "sha256:05c687edf087fa7d2c91b4f1e2cebb2fd0d8c543234017ee735bc28f7cd67bae",
          "sha256:6c61ba129df9ab99afa28a6ef49d43678277a991176d9b7ea77b8529d96126be",
          "sha256:80ae0802501d2d97c3270f88251426a1cb53fa0cabcb8fddf8142975ba38f2d7",
          "sha256:b8a6d2392a3f881f6f742e6e2fa1bb2ff30966b3cc345221f186ad9a685f9b90",
          "sha256:be8d5b70bc8764671f7298d0ef31d74ba3d49f0be31870e715ebe74181c89afd",
          "sha256:e540e98476f8e7f35470f55c1d2fa6cc14cf82d163ade6f52c4881c53361cfa6",
        ],
        providedAndRequiredInterfaces: [
          "provides:audit.event@v1",
          "provides:authorization.decision@v1",
          "provides:identity.principal-context@v1",
          "provides:notification.outbox@v1",
          "provides:policy.resource-action@v1",
          "requires:audit.event@v1",
          "requires:policy.resource-action@v1",
        ],
        targetRuntimeInterfaceVersions: [
          "api.service@factory.api-service/v1",
          "database.schema@factory.prisma-schema/v1",
          "policy.rule@factory.policy-rule/v1",
          "test.fixture@factory.test-fixture/v1",
          "web.route@factory.web-route/v1",
        ],
        resolvedDependencyOrder: [
          "core.audit",
          "core.crud",
          "core.notification",
          "core.policy-declarations",
          "core.identity-policy",
          "core.workflow",
        ],
        lockDigest:
          "sha256:51e49215fcfc422c849043d3048a3a780269033a3ac7a646f08086a5597c4382",
      },
    },
    hashes: {
      "THIRD_PARTY_NOTICES.md":
        "8dac8d5c476c101d05d4a2b2b9350ae29685271fa2a8641f9210b9189789013b",
      "package.json":
        "a0100585dba06226064e327bdf845f01f30579b77a5ae11ebca9aefe17f54841",
      "pnpm-workspace.yaml":
        "f0473b2f758a8a4f74f6d1eca80f35fe546a0e6ed9af0f41fbc276e7dafa51c2",
      "capability-lock.json":
        "5bfdfba179079f78915c024c7a4550f2567aa9b2760945bcdf02cfecbf41d50f",
      "composition-lock.json":
        "b12525598e7a964f5bcea8aec0a78234a0437b51cc8eae1a33c21c7799421174",
      "capability-template-lock.json":
        "be0cbdf2c0db92e93986b7b6eae85b103e49e9f4a09e2a4c4af2b9ff5fed89ff",
      "simulator/index.html":
        "d99be9748da291fc9d68a975a64595d85793313d5ae8d011b7637b738270254b",
      "web/package.json":
        "c13604a1355604db3a1ae2d55a8ed1b4963e2a2be5a558748091ee50b56d13ea",
      "web/tsconfig.json":
        "2e5e91cdf839359ad69bab84cbfea405bc70b5243251a8e5ce33b8d0b070ed6a",
      "web/next-env.d.ts":
        "bc460da01d99074c5173c5e2943bb6f39a7537533c28b837571ccf8bda616ccf",
      "web/app/layout.tsx":
        "42736336d5855e393b706dfed114c62101d9734bda762c547b09bcee5813c8c7",
      "web/app/page-runtime.tsx":
        "00775bdc2cc0c835a46ccb6697012fbb099e89507b3ee18f297be58af354f6dc",
      "web/app/page.tsx":
        "25cdd881f063770b2931e20ad68d5aec072cadad43f92d4b8b8a7003227a6d65",
      "web/app/[...path]/page.tsx":
        "511cdd8e42c187897360be87b6835a09f7ed2bcc0819e8781ab798f340ebecdb",
      "web/app/favicon.ico/route.ts":
        "3011528d42efd01c9c7605520699b67a4cb8908697257e81b11503fffd4c8e76",
      "web/app/api/[...path]/route.ts":
        "4d29a822fa47f5fd28a708fd2300d9e9bb8bb7ed7e93d7c9b9dc521171ef5d93",
      "web/app/globals.css":
        "1efdde296a910a171a2443a01786b5d4a49a57312adbc8fd2825114b17110a98",
      "api/package.json":
        "f758b1daaecedeab6f65f4f251d03f2fd8147de1f2b8a86747e116a0fb5d068e",
      "api/tsconfig.json":
        "ba06ca0caffb054b4c1128d1a43e9ba8d40d97993b41e6fe621dd4cfc19b1f70",
      "api/Dockerfile":
        "620b0eed690c3df5de947bd580a2bf99255cc22409c8a834ff4e5c831dc340bb",
      "api/.dockerignore":
        "51b683467baace87247effed923b8aaecc559168ba0efbb43fd4714a8dc19362",
      "api/src/main.ts":
        "ab310486c41b7fadaa1fb2550ada1a3b5983e8aee9042f678483032a7a56fdce",
      "api/src/capabilities/contract.ts":
        "b13c886fc22acbcc4f3d9754867525e31b12f6dfb3d964bea0daf17ad2f2a64c",
      "api/src/capabilities/core.audit.ts":
        "82977b1045a197d26a8c344c9ac15f4cc5358e68038df7beb29f9fd268885118",
      "api/src/capabilities/core.crud.ts":
        "a3fa0c458fccc70eca0f8fbc88f13efcf37d5c4775bb59a21e436bca8b181404",
      "api/src/capabilities/core.identity-policy.ts":
        "a7b2e68c7c8aa3611a1cba746a7ac789f1b0ea21af75a3785a5fd0c1bcaff588",
      "api/src/capabilities/core.notification.ts":
        "6b7334f2b06fc31cd5c87e1f944f86ec4edf6360e297833a31e3e184d52fabc0",
      "api/src/capabilities/core.policy-declarations.ts":
        "cc33898ae356a914c08b716d57297714a4f6b5090b0848c188fa1a346a1b4490",
      "api/src/capabilities/core.workflow.ts":
        "c6b52eceb307c4988f627bc49b1fbeeca67d7b601f59d7ebf565e91517a94aa5",
      "database/prisma/fragments/expense.prisma":
        "bd3276507771a650224872f280122073da5bfdedf82fd0e2c00578722a309911",
      "web/src/app/expense-list/page.tsx":
        "9fe4f32b57efe436ca27df002a195ae15a12b78c5859065d482aeaff0b4b0b83",
      "api/policy/fragments/resource-action.conf":
        "05c687edf087fa7d2c91b4f1e2cebb2fd0d8c543234017ee735bc28f7cd67bae",
      "api/policy/fragments/identity-policy.conf":
        "e540e98476f8e7f35470f55c1d2fa6cc14cf82d163ade6f52c4881c53361cfa6",
      "api/src/services/identity-policy-local.service.ts":
        "1df55444e475719adfb5b17bf1bda4dfeeca13578d01649bc40f0509d6143797",
      "api/test/fixtures/identity-policy.json":
        "6c61ba129df9ab99afa28a6ef49d43678277a991176d9b7ea77b8529d96126be",
      "api/src/capabilities/registry.ts":
        "f56c988a988b277e41b73769711287b2b89b90acbec98abff2e7976c53ea36c9",
      "api/src/application-runtime.ts":
        "c83a0775002d900268e1cda18f371d9076ce0ac615c212a88debe497bde2f754",
      "api/src/prisma-record-store.ts":
        "f66484882aaf638f8eca9352dd43e480af1abe00c7693d22cc2590133c364bc1",
      "api/src/notification-outbox-worker.ts":
        "02989ed0a878af1daf8cbc968ff1e0e0746f660258c95e6bc215eae4b4818e6f",
      "api/src/notification-outbox-drain.ts":
        "439d0bb92af9bbee554c4f14653b7a4686108cf1f9b4af34a24be1145269306a",
      "api/README.md":
        "c909240a419da5fd9eeb8bdf49f0287c604b6e694d2b6d6e18922a37d9b4075b",
      "api/policy/model.conf":
        "10f281d006f6e3b3210e56fa0ffc1771993156fdc5e131f8bdc975b03ef0ef26",
      "api/policy/policy.csv":
        "75897f59e0621e25f23957c42499069dada2e4267bdba9f1aa5c711ece133f37",
      "api/src/policy.ts":
        "867fc370526640c880260c772795256f5505c52a3a1d217e3301873e8f3d29b8",
      "database/prisma/schema.prisma":
        "e550e8d80e352fe6fc3167f8c787e94a626e99abe74710e70217f0bbead0b142",
      "api/prisma/schema.prisma":
        "e550e8d80e352fe6fc3167f8c787e94a626e99abe74710e70217f0bbead0b142",
      "database/prisma/migrations/0001_initial/migration.sql":
        "a84dd86c89a7e31d2a84ffa3304b6dcb6542c5ff866a746a51d2cb2036c60efc",
      "database/prisma/seed.ts":
        "ea1a85699912f29808c306e002ad448edcc42868c6c819dcc568826d5936bc83",
      "database/package.json":
        "e1637d8e1356472a6f331b35110004f8b7e82209a03e05b4b16a293dd4ae7dc0",
      "database/Dockerfile":
        "3226c780acb59a88e1ace066c2639fdaedf394b409d561b7f0496de6aefd9f27",
      "database/.dockerignore":
        "1d1e0e64dd7d274f2bff103d50536f8d98d5705fc1bc51ebd7447dd06827864e",
      "api/src/flows/definitions.ts":
        "9c8b15a300d0e1a1f32c4269bede4d5db84001202ae6fb1b25a9bb64a67b0dca",
      "api/src/flows/machines.ts":
        "86f9aaef38d6e150e3e9299209e6c8e48c22b3b65529013578ee624d88ec81e5",
      "api/test/journey.generated.test.ts":
        "1ded3eada2ca0d41f68ed2283e9ecee5dee3ed61c9f7004ae76162d0ee036b3e",
      "tests/journeys.generated.md":
        "53b3a117df30790a7eb8bda927a4c9ccb7f80cca9dc6165df8362445bcfa1097",
      "docs/api-reference.md":
        "d26cddd990a64a1e260521d5f1462632f5d68765450bad7ae641ec7c5fe9d5e6",
      "docs/entity-relationship.md":
        "d17281249397a88a7cd34eee7ed4ac5dc758e0eab17136e1157af2600d4d4a13",
      "docs/permission-matrix.md":
        "899081f7667695b2bc541d924fd0ad2256b7c4480e26028bd373110ee4d57d23",
      "docs/application.md":
        "39ec551d2c4087f00388fc3efa86709aac270032d63d73dd924e390c2888a5ce",
      "web/Dockerfile":
        "98b6a4233a02d430750ad058ddaa88394ce4f109c26906a4045ab6cf49d0b7d0",
      "web/.dockerignore":
        "b48855493dc2f402291313f76096909a8962ed4ca1350956138259e071fce13d",
      "docker-compose.yml":
        "ecce420aae30da58f988dc71c9aa58bd29ef7798542afd6c13da36a79bdc077f",
      "README.md":
        "cb0d3dad4a361bc67fccf3bebad67d32de461f3e7dc30111bf69ebdf844636ea",
    },
    manifest: [
      {
        path: "THIRD_PARTY_NOTICES.md",
        bytes: 1053,
        sha256:
          "8dac8d5c476c101d05d4a2b2b9350ae29685271fa2a8641f9210b9189789013b",
      },
      {
        path: "package.json",
        bytes: 251,
        sha256:
          "a0100585dba06226064e327bdf845f01f30579b77a5ae11ebca9aefe17f54841",
      },
      {
        path: "pnpm-workspace.yaml",
        bytes: 39,
        sha256:
          "f0473b2f758a8a4f74f6d1eca80f35fe546a0e6ed9af0f41fbc276e7dafa51c2",
      },
      {
        path: "capability-lock.json",
        bytes: 1852,
        sha256:
          "5bfdfba179079f78915c024c7a4550f2567aa9b2760945bcdf02cfecbf41d50f",
      },
      {
        path: "composition-lock.json",
        bytes: 4440,
        sha256:
          "b12525598e7a964f5bcea8aec0a78234a0437b51cc8eae1a33c21c7799421174",
      },
      {
        path: "capability-template-lock.json",
        bytes: 2164,
        sha256:
          "be0cbdf2c0db92e93986b7b6eae85b103e49e9f4a09e2a4c4af2b9ff5fed89ff",
      },
      {
        path: "simulator/index.html",
        bytes: 5181,
        sha256:
          "d99be9748da291fc9d68a975a64595d85793313d5ae8d011b7637b738270254b",
      },
      {
        path: "web/package.json",
        bytes: 385,
        sha256:
          "c13604a1355604db3a1ae2d55a8ed1b4963e2a2be5a558748091ee50b56d13ea",
      },
      {
        path: "web/tsconfig.json",
        bytes: 612,
        sha256:
          "2e5e91cdf839359ad69bab84cbfea405bc70b5243251a8e5ce33b8d0b070ed6a",
      },
      {
        path: "web/next-env.d.ts",
        bytes: 126,
        sha256:
          "bc460da01d99074c5173c5e2943bb6f39a7537533c28b837571ccf8bda616ccf",
      },
      {
        path: "web/app/layout.tsx",
        bytes: 254,
        sha256:
          "42736336d5855e393b706dfed114c62101d9734bda762c547b09bcee5813c8c7",
      },
      {
        path: "web/app/page-runtime.tsx",
        bytes: 143055,
        sha256:
          "00775bdc2cc0c835a46ccb6697012fbb099e89507b3ee18f297be58af354f6dc",
      },
      {
        path: "web/app/page.tsx",
        bytes: 157,
        sha256:
          "25cdd881f063770b2931e20ad68d5aec072cadad43f92d4b8b8a7003227a6d65",
      },
      {
        path: "web/app/[...path]/page.tsx",
        bytes: 362,
        sha256:
          "511cdd8e42c187897360be87b6835a09f7ed2bcc0819e8781ab798f340ebecdb",
      },
      {
        path: "web/app/favicon.ico/route.ts",
        bytes: 349,
        sha256:
          "3011528d42efd01c9c7605520699b67a4cb8908697257e81b11503fffd4c8e76",
      },
      {
        path: "web/app/api/[...path]/route.ts",
        bytes: 1043,
        sha256:
          "4d29a822fa47f5fd28a708fd2300d9e9bb8bb7ed7e93d7c9b9dc521171ef5d93",
      },
      {
        path: "web/app/globals.css",
        bytes: 42666,
        sha256:
          "1efdde296a910a171a2443a01786b5d4a49a57312adbc8fd2825114b17110a98",
      },
      {
        path: "api/package.json",
        bytes: 694,
        sha256:
          "f758b1daaecedeab6f65f4f251d03f2fd8147de1f2b8a86747e116a0fb5d068e",
      },
      {
        path: "api/tsconfig.json",
        bytes: 267,
        sha256:
          "ba06ca0caffb054b4c1128d1a43e9ba8d40d97993b41e6fe621dd4cfc19b1f70",
      },
      {
        path: "api/Dockerfile",
        bytes: 296,
        sha256:
          "620b0eed690c3df5de947bd580a2bf99255cc22409c8a834ff4e5c831dc340bb",
      },
      {
        path: "api/.dockerignore",
        bytes: 23,
        sha256:
          "51b683467baace87247effed923b8aaecc559168ba0efbb43fd4714a8dc19362",
      },
      {
        path: "api/src/main.ts",
        bytes: 7087,
        sha256:
          "ab310486c41b7fadaa1fb2550ada1a3b5983e8aee9042f678483032a7a56fdce",
      },
      {
        path: "api/src/capabilities/contract.ts",
        bytes: 6358,
        sha256:
          "b13c886fc22acbcc4f3d9754867525e31b12f6dfb3d964bea0daf17ad2f2a64c",
      },
      {
        path: "api/src/capabilities/core.audit.ts",
        bytes: 559,
        sha256:
          "82977b1045a197d26a8c344c9ac15f4cc5358e68038df7beb29f9fd268885118",
      },
      {
        path: "api/src/capabilities/core.crud.ts",
        bytes: 463,
        sha256:
          "a3fa0c458fccc70eca0f8fbc88f13efcf37d5c4775bb59a21e436bca8b181404",
      },
      {
        path: "api/src/capabilities/core.identity-policy.ts",
        bytes: 2061,
        sha256:
          "a7b2e68c7c8aa3611a1cba746a7ac789f1b0ea21af75a3785a5fd0c1bcaff588",
      },
      {
        path: "api/src/capabilities/core.notification.ts",
        bytes: 619,
        sha256:
          "6b7334f2b06fc31cd5c87e1f944f86ec4edf6360e297833a31e3e184d52fabc0",
      },
      {
        path: "api/src/capabilities/core.policy-declarations.ts",
        bytes: 244,
        sha256:
          "cc33898ae356a914c08b716d57297714a4f6b5090b0848c188fa1a346a1b4490",
      },
      {
        path: "api/src/capabilities/core.workflow.ts",
        bytes: 442,
        sha256:
          "c6b52eceb307c4988f627bc49b1fbeeca67d7b601f59d7ebf565e91517a94aa5",
      },
      {
        path: "database/prisma/fragments/expense.prisma",
        bytes: 51,
        sha256:
          "bd3276507771a650224872f280122073da5bfdedf82fd0e2c00578722a309911",
      },
      {
        path: "web/src/app/expense-list/page.tsx",
        bytes: 161,
        sha256:
          "9fe4f32b57efe436ca27df002a195ae15a12b78c5859065d482aeaff0b4b0b83",
      },
      {
        path: "api/policy/fragments/resource-action.conf",
        bytes: 236,
        sha256:
          "05c687edf087fa7d2c91b4f1e2cebb2fd0d8c543234017ee735bc28f7cd67bae",
      },
      {
        path: "api/policy/fragments/identity-policy.conf",
        bytes: 156,
        sha256:
          "e540e98476f8e7f35470f55c1d2fa6cc14cf82d163ade6f52c4881c53361cfa6",
      },
      {
        path: "api/src/services/identity-policy-local.service.ts",
        bytes: 227,
        sha256:
          "1df55444e475719adfb5b17bf1bda4dfeeca13578d01649bc40f0509d6143797",
      },
      {
        path: "api/test/fixtures/identity-policy.json",
        bytes: 254,
        sha256:
          "6c61ba129df9ab99afa28a6ef49d43678277a991176d9b7ea77b8529d96126be",
      },
      {
        path: "api/src/capabilities/registry.ts",
        bytes: 4104,
        sha256:
          "f56c988a988b277e41b73769711287b2b89b90acbec98abff2e7976c53ea36c9",
      },
      {
        path: "api/src/application-runtime.ts",
        bytes: 21661,
        sha256:
          "c83a0775002d900268e1cda18f371d9076ce0ac615c212a88debe497bde2f754",
      },
      {
        path: "api/src/prisma-record-store.ts",
        bytes: 7751,
        sha256:
          "f66484882aaf638f8eca9352dd43e480af1abe00c7693d22cc2590133c364bc1",
      },
      {
        path: "api/src/notification-outbox-worker.ts",
        bytes: 2122,
        sha256:
          "02989ed0a878af1daf8cbc968ff1e0e0746f660258c95e6bc215eae4b4818e6f",
      },
      {
        path: "api/src/notification-outbox-drain.ts",
        bytes: 975,
        sha256:
          "439d0bb92af9bbee554c4f14653b7a4686108cf1f9b4af34a24be1145269306a",
      },
      {
        path: "api/README.md",
        bytes: 368,
        sha256:
          "c909240a419da5fd9eeb8bdf49f0287c604b6e694d2b6d6e18922a37d9b4075b",
      },
      {
        path: "api/policy/model.conf",
        bytes: 195,
        sha256:
          "10f281d006f6e3b3210e56fa0ffc1771993156fdc5e131f8bdc975b03ef0ef26",
      },
      {
        path: "api/policy/policy.csv",
        bytes: 733,
        sha256:
          "75897f59e0621e25f23957c42499069dada2e4267bdba9f1aa5c711ece133f37",
      },
      {
        path: "api/src/policy.ts",
        bytes: 1459,
        sha256:
          "867fc370526640c880260c772795256f5505c52a3a1d217e3301873e8f3d29b8",
      },
      {
        path: "database/prisma/schema.prisma",
        bytes: 2166,
        sha256:
          "e550e8d80e352fe6fc3167f8c787e94a626e99abe74710e70217f0bbead0b142",
      },
      {
        path: "api/prisma/schema.prisma",
        bytes: 2166,
        sha256:
          "e550e8d80e352fe6fc3167f8c787e94a626e99abe74710e70217f0bbead0b142",
      },
      {
        path: "database/prisma/migrations/0001_initial/migration.sql",
        bytes: 3128,
        sha256:
          "a84dd86c89a7e31d2a84ffa3304b6dcb6542c5ff866a746a51d2cb2036c60efc",
      },
      {
        path: "database/prisma/seed.ts",
        bytes: 1172,
        sha256:
          "ea1a85699912f29808c306e002ad448edcc42868c6c819dcc568826d5936bc83",
      },
      {
        path: "database/package.json",
        bytes: 380,
        sha256:
          "e1637d8e1356472a6f331b35110004f8b7e82209a03e05b4b16a293dd4ae7dc0",
      },
      {
        path: "database/Dockerfile",
        bytes: 319,
        sha256:
          "3226c780acb59a88e1ace066c2639fdaedf394b409d561b7f0496de6aefd9f27",
      },
      {
        path: "database/.dockerignore",
        bytes: 18,
        sha256:
          "1d1e0e64dd7d274f2bff103d50536f8d98d5705fc1bc51ebd7447dd06827864e",
      },
      {
        path: "api/src/flows/definitions.ts",
        bytes: 1272,
        sha256:
          "9c8b15a300d0e1a1f32c4269bede4d5db84001202ae6fb1b25a9bb64a67b0dca",
      },
      {
        path: "api/src/flows/machines.ts",
        bytes: 561,
        sha256:
          "86f9aaef38d6e150e3e9299209e6c8e48c22b3b65529013578ee624d88ec81e5",
      },
      {
        path: "api/test/journey.generated.test.ts",
        bytes: 1448,
        sha256:
          "1ded3eada2ca0d41f68ed2283e9ecee5dee3ed61c9f7004ae76162d0ee036b3e",
      },
      {
        path: "tests/journeys.generated.md",
        bytes: 106,
        sha256:
          "53b3a117df30790a7eb8bda927a4c9ccb7f80cca9dc6165df8362445bcfa1097",
      },
      {
        path: "docs/api-reference.md",
        bytes: 1189,
        sha256:
          "d26cddd990a64a1e260521d5f1462632f5d68765450bad7ae641ec7c5fe9d5e6",
      },
      {
        path: "docs/entity-relationship.md",
        bytes: 935,
        sha256:
          "d17281249397a88a7cd34eee7ed4ac5dc758e0eab17136e1157af2600d4d4a13",
      },
      {
        path: "docs/permission-matrix.md",
        bytes: 764,
        sha256:
          "899081f7667695b2bc541d924fd0ad2256b7c4480e26028bd373110ee4d57d23",
      },
      {
        path: "docs/application.md",
        bytes: 476,
        sha256:
          "39ec551d2c4087f00388fc3efa86709aac270032d63d73dd924e390c2888a5ce",
      },
      {
        path: "web/Dockerfile",
        bytes: 186,
        sha256:
          "98b6a4233a02d430750ad058ddaa88394ce4f109c26906a4045ab6cf49d0b7d0",
      },
      {
        path: "web/.dockerignore",
        bytes: 24,
        sha256:
          "b48855493dc2f402291313f76096909a8962ed4ca1350956138259e071fce13d",
      },
      {
        path: "docker-compose.yml",
        bytes: 1099,
        sha256:
          "ecce420aae30da58f988dc71c9aa58bd29ef7798542afd6c13da36a79bdc077f",
      },
      {
        path: "README.md",
        bytes: 841,
        sha256:
          "cb0d3dad4a361bc67fccf3bebad67d32de461f3e7dc30111bf69ebdf844636ea",
      },
    ],
    manifestHash:
      "ba92104233b89d77cba794aa5bac632294aa3f436a14d114ab94f9f17e61c19e",
    bundleHash:
      "1f2e8cd027720107ac48a44cb2ca5335ddbe4380f2f58073250309dde75adac6",
  },
  purchase: {
    baseCommit: "92f21089beeb184a236a1512cb4c1866f158e903",
    input: {
      publishedRevisionId: "correction-legacy-purchase",
      graph: {
        apiVersion: "factory.application-graph/v1",
        metadata: {
          id: "purchase-request-approval-requirement",
          workspaceId: "local-workspace",
          name: "Purchase Request Approval",
        },
        page: {
          pages: [
            {
              id: "purchase-request-dashboard",
              route: "/purchase-request-dashboard",
              title: "Purchase request dashboard",
              blocks: [
                {
                  id: "purchase-request-dashboard-stats",
                  type: "stats",
                  entity: "purchase-request",
                },
              ],
            },
            {
              id: "purchase-request-list",
              route: "/purchase-request-list",
              title: "Purchase request list",
              blocks: [
                {
                  id: "purchase-request-list-list",
                  type: "list",
                  entity: "purchase-request",
                },
              ],
            },
            {
              id: "purchase-request-form",
              route: "/purchase-request-form",
              title: "New purchase request",
              blocks: [
                {
                  id: "purchase-request-form-form",
                  type: "form",
                  entity: "purchase-request",
                },
              ],
            },
            {
              id: "purchase-request-detail",
              route: "/purchase-request-detail",
              title: "Purchase request detail",
              blocks: [
                {
                  id: "purchase-request-detail-detail",
                  type: "detail",
                  entity: "purchase-request",
                },
              ],
            },
            {
              id: "purchase-request-queue",
              route: "/purchase-request-queue",
              title: "Approval queue",
              blocks: [
                {
                  id: "purchase-request-queue-queue",
                  type: "queue",
                  entity: "purchase-request",
                },
              ],
            },
            {
              id: "purchase-request-settings",
              route: "/purchase-request-settings",
              title: "Purchase request settings",
              blocks: [
                {
                  id: "purchase-request-settings-settings",
                  type: "settings",
                },
              ],
            },
            {
              id: "requester-list",
              route: "/requester-list",
              title: "Requester",
              blocks: [
                {
                  id: "requester-list-list",
                  type: "list",
                  entity: "requester",
                },
              ],
            },
          ],
          navigation: [
            {
              id: "nav-purchase-request-dashboard",
              label: "Purchase request dashboard",
              pageId: "purchase-request-dashboard",
              icon: "layout-grid",
            },
            {
              id: "nav-purchase-request-list",
              label: "Purchase request list",
              pageId: "purchase-request-list",
              icon: "list",
            },
            {
              id: "nav-purchase-request-queue",
              label: "Approval queue",
              pageId: "purchase-request-queue",
              icon: "inbox",
            },
            {
              id: "nav-purchase-request-settings",
              label: "Purchase request settings",
              pageId: "purchase-request-settings",
              icon: "settings",
            },
            {
              id: "nav-requester-list",
              label: "Requester",
              pageId: "requester-list",
              icon: "list",
            },
          ],
        },
        domain: {
          entities: [
            {
              key: "purchase-request",
              label: "Purchase request",
              fields: [
                {
                  key: "amount",
                  type: "decimal",
                  required: true,
                },
                {
                  key: "category",
                  type: "enum",
                  required: true,
                  values: [
                    "equipment",
                    "software",
                    "services",
                    "supplies",
                    "other",
                  ],
                },
                {
                  key: "neededBy",
                  type: "date",
                  required: true,
                },
                {
                  key: "item",
                  type: "string",
                  required: true,
                },
                {
                  key: "supplier",
                  type: "string",
                  required: false,
                },
                {
                  key: "businessJustification",
                  type: "text",
                  required: true,
                },
                {
                  key: "status",
                  type: "enum",
                  required: true,
                  values: ["draft", "submitted", "approved", "rejected"],
                },
              ],
              indexes: [
                {
                  fields: ["status"],
                },
              ],
            },
            {
              key: "requester",
              label: "Requester",
              fields: [
                {
                  key: "name",
                  type: "string",
                  required: true,
                },
                {
                  key: "department",
                  type: "string",
                  required: false,
                },
              ],
              indexes: [],
            },
            {
              key: "purchase-request-approval-requirement-principal",
              label: "Purchase Request Approval principal",
              fields: [
                {
                  key: "subjectRef",
                  type: "string",
                  required: true,
                  unique: true,
                },
                {
                  key: "role",
                  type: "enum",
                  required: true,
                  values: ["requester", "manager", "procurement"],
                },
                {
                  key: "active",
                  type: "boolean",
                  required: true,
                },
              ],
              indexes: [
                {
                  fields: ["active"],
                },
              ],
            },
            {
              key: "purchase-request-approval-requirement-session",
              label: "Purchase Request Approval session",
              fields: [
                {
                  key: "subjectRef",
                  type: "string",
                  required: true,
                },
                {
                  key: "status",
                  type: "enum",
                  required: true,
                  values: ["active", "expired"],
                },
                {
                  key: "expiresAt",
                  type: "datetime",
                  required: true,
                },
              ],
              indexes: [
                {
                  fields: ["subjectRef", "status"],
                },
              ],
            },
          ],
          relations: [
            {
              from: "purchase-request-approval-requirement-session",
              to: "purchase-request-approval-requirement-principal",
              kind: "many-to-one",
              field: "subjectRef",
            },
          ],
          seedData: [
            {
              entity: "purchase-request",
              id: "sample-purchase-request",
              values: {
                amount: 125.5,
                category: "equipment",
                neededBy: "2026-08-01",
                item: "Sample Item",
                supplier: "Sample Supplier",
                businessJustification: "Sample Business justification detail",
                status: "draft",
              },
            },
            {
              entity: "requester",
              id: "sample-requester",
              values: {
                name: "Sample Name",
                department: "Sample Department",
              },
            },
          ],
        },
        policy: {
          roles: ["requester", "manager", "procurement"],
          permissions: [
            {
              role: "requester",
              resource: "purchase-request",
              actions: ["create", "read", "submit"],
            },
            {
              role: "requester",
              resource: "requester",
              actions: ["read", "update"],
            },
            {
              role: "requester",
              resource: "purchase-request-approval-requirement-principal",
              actions: ["read"],
            },
            {
              role: "requester",
              resource: "purchase-request-approval-requirement-session",
              actions: ["create", "read", "update"],
            },
            {
              role: "manager",
              resource: "purchase-request",
              actions: ["read", "approve", "reject"],
            },
            {
              role: "manager",
              resource: "purchase-request-approval-requirement-principal",
              actions: ["read"],
            },
            {
              role: "manager",
              resource: "purchase-request-approval-requirement-session",
              actions: ["read"],
            },
            {
              role: "procurement",
              resource: "purchase-request",
              actions: ["read", "audit"],
            },
            {
              role: "procurement",
              resource: "purchase-request-approval-requirement-principal",
              actions: ["read"],
            },
            {
              role: "procurement",
              resource: "purchase-request-approval-requirement-session",
              actions: ["read"],
            },
          ],
        },
        flow: {
          flows: [
            {
              id: "purchase-request-approval",
              entity: "purchase-request",
              initialState: "draft",
              states: ["draft", "submitted", "approved", "rejected"],
              events: ["submit", "approve", "reject"],
              transitions: [
                {
                  from: "draft",
                  event: "submit",
                  to: "submitted",
                  roles: ["requester"],
                  effects: [
                    {
                      capability: "audit.record",
                      operation: "record",
                    },
                  ],
                },
                {
                  from: "submitted",
                  event: "approve",
                  to: "approved",
                  roles: ["manager"],
                  effects: [
                    {
                      capability: "audit.record",
                      operation: "record",
                    },
                    {
                      capability: "notification.send",
                      operation: "send",
                    },
                  ],
                },
                {
                  from: "submitted",
                  event: "reject",
                  to: "rejected",
                  roles: ["manager"],
                  effects: [
                    {
                      capability: "audit.record",
                      operation: "record",
                    },
                    {
                      capability: "notification.send",
                      operation: "send",
                    },
                  ],
                },
              ],
            },
          ],
        },
        integration: {
          providers: [],
          capabilities: [
            {
              key: "audit.record",
              providerId: "factory",
              operation: "record",
            },
            {
              key: "notification.send",
              providerId: "factory",
              operation: "send",
            },
            {
              key: "identity.context.resolve",
              providerId: "factory",
              operation: "resolve",
            },
            {
              key: "authorization.decision",
              providerId: "factory",
              operation: "decision",
            },
          ],
          compositionSelections: [
            {
              lock: {
                key: "core.crud",
                version: "1.0.1",
                packageRoot: "packages/capabilities/assets/core.crud/1.0.1",
                manifestDigest:
                  "sha256:8dede9ba8d63bea9b09c7bf7ac6ce784c52595b644d03eca52ea6996a31882d1",
                lifecycle: "golden",
              },
              bindings: {
                entityKey: {
                  graphSymbol: "graph.domain.purchase-request",
                },
                routeKey: {
                  graphSymbol: "graph.page.purchase-request-list",
                },
              },
            },
            {
              lock: {
                key: "core.workflow",
                version: "1.0.1",
                packageRoot: "packages/capabilities/assets/core.workflow/1.0.1",
                manifestDigest:
                  "sha256:16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884",
                lifecycle: "golden",
              },
              bindings: {
                flowKey: {
                  graphSymbol: "graph.flow.purchase-request-approval",
                },
              },
            },
            {
              lock: {
                key: "core.identity-policy",
                version: "1.0.0",
                packageRoot:
                  "packages/capabilities/assets/core.identity-policy/1.0.0",
                manifestDigest:
                  "sha256:a216444b219f00431820a0df8e2bc3b604296430beb8fa6549f1b40c92025d82",
                lifecycle: "golden",
              },
              bindings: {
                principalEntity: {
                  graphSymbol:
                    "graph.domain.purchase-request-approval-requirement-principal",
                },
                sessionEntity: {
                  graphSymbol:
                    "graph.domain.purchase-request-approval-requirement-session",
                },
                defaultRole: {
                  graphSymbol: "graph.policy.requester",
                },
                authenticatedRole: {
                  graphSymbol: "graph.policy.manager",
                },
              },
            },
            {
              lock: {
                key: "core.policy-declarations",
                version: "1.0.0",
                packageRoot:
                  "packages/capabilities/assets/core.policy-declarations/1.0.0",
                manifestDigest:
                  "sha256:56e6ead5aaa6e9f5fe9cf7c608b6b51b16064964cf95cd123bdc3e0725642c54",
                lifecycle: "golden",
              },
              bindings: {},
            },
            {
              lock: {
                key: "core.audit",
                version: "1.0.2",
                packageRoot: "packages/capabilities/assets/core.audit/1.0.2",
                manifestDigest:
                  "sha256:fe6616252c7b44efe61d516d305e689f3f593d70d5287baac31b5f31013addc8",
                lifecycle: "golden",
              },
              bindings: {
                actorRole: {
                  graphSymbol: "graph.policy.manager",
                },
              },
            },
            {
              lock: {
                key: "core.notification",
                version: "1.1.1",
                packageRoot:
                  "packages/capabilities/assets/core.notification/1.1.1",
                manifestDigest:
                  "sha256:207eaa0fd719013129ba84bd8f66f82219b619ee1f5c9e2d4e3d896c339e6132",
                lifecycle: "golden",
              },
              bindings: {
                recipientRole: {
                  graphSymbol: "graph.policy.requester",
                },
              },
            },
          ],
        },
        experience: {
          theme: {
            mode: "light",
            tokens: {},
          },
          locales: ["en"],
        },
      },
      compositionLock: {
        apiVersion: "factory.composition/v1",
        applicationGraphChecksum:
          "sha256:8075c14be98300dfda61e2d2cf253ae11de75c9f2d4d6f573995607fb563d484",
        packages: [
          {
            lock: {
              key: "core.audit",
              version: "1.0.2",
              packageRoot: "packages/capabilities/assets/core.audit/1.0.2",
              manifestDigest:
                "sha256:fe6616252c7b44efe61d516d305e689f3f593d70d5287baac31b5f31013addc8",
              lifecycle: "golden",
            },
            bindings: {
              actorRole: {
                graphSymbol: "graph.policy.manager",
              },
            },
          },
          {
            lock: {
              key: "core.crud",
              version: "1.0.1",
              packageRoot: "packages/capabilities/assets/core.crud/1.0.1",
              manifestDigest:
                "sha256:8dede9ba8d63bea9b09c7bf7ac6ce784c52595b644d03eca52ea6996a31882d1",
              lifecycle: "golden",
            },
            bindings: {
              entityKey: {
                graphSymbol: "graph.domain.purchase-request",
              },
              routeKey: {
                graphSymbol: "graph.page.purchase-request-list",
              },
            },
          },
          {
            lock: {
              key: "core.identity-policy",
              version: "1.0.0",
              packageRoot:
                "packages/capabilities/assets/core.identity-policy/1.0.0",
              manifestDigest:
                "sha256:a216444b219f00431820a0df8e2bc3b604296430beb8fa6549f1b40c92025d82",
              lifecycle: "golden",
            },
            bindings: {
              authenticatedRole: {
                graphSymbol: "graph.policy.manager",
              },
              defaultRole: {
                graphSymbol: "graph.policy.requester",
              },
              principalEntity: {
                graphSymbol:
                  "graph.domain.purchase-request-approval-requirement-principal",
              },
              sessionEntity: {
                graphSymbol:
                  "graph.domain.purchase-request-approval-requirement-session",
              },
            },
          },
          {
            lock: {
              key: "core.notification",
              version: "1.1.1",
              packageRoot:
                "packages/capabilities/assets/core.notification/1.1.1",
              manifestDigest:
                "sha256:207eaa0fd719013129ba84bd8f66f82219b619ee1f5c9e2d4e3d896c339e6132",
              lifecycle: "golden",
            },
            bindings: {
              recipientRole: {
                graphSymbol: "graph.policy.requester",
              },
            },
          },
          {
            lock: {
              key: "core.policy-declarations",
              version: "1.0.0",
              packageRoot:
                "packages/capabilities/assets/core.policy-declarations/1.0.0",
              manifestDigest:
                "sha256:56e6ead5aaa6e9f5fe9cf7c608b6b51b16064964cf95cd123bdc3e0725642c54",
              lifecycle: "golden",
            },
            bindings: {},
          },
          {
            lock: {
              key: "core.workflow",
              version: "1.0.1",
              packageRoot: "packages/capabilities/assets/core.workflow/1.0.1",
              manifestDigest:
                "sha256:16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884",
              lifecycle: "golden",
            },
            bindings: {
              flowKey: {
                graphSymbol: "graph.flow.purchase-request-approval",
              },
            },
          },
        ],
        resolvedContributionDigests: [
          "sha256:0249329a78a7fc15eaf285892df9e6bb21b3ae04808d73316eae1b320bb0197c",
          "sha256:05c687edf087fa7d2c91b4f1e2cebb2fd0d8c543234017ee735bc28f7cd67bae",
          "sha256:6c61ba129df9ab99afa28a6ef49d43678277a991176d9b7ea77b8529d96126be",
          "sha256:80ae0802501d2d97c3270f88251426a1cb53fa0cabcb8fddf8142975ba38f2d7",
          "sha256:b8a6d2392a3f881f6f742e6e2fa1bb2ff30966b3cc345221f186ad9a685f9b90",
          "sha256:be8d5b70bc8764671f7298d0ef31d74ba3d49f0be31870e715ebe74181c89afd",
          "sha256:e540e98476f8e7f35470f55c1d2fa6cc14cf82d163ade6f52c4881c53361cfa6",
        ],
        providedAndRequiredInterfaces: [
          "provides:audit.event@v1",
          "provides:authorization.decision@v1",
          "provides:identity.principal-context@v1",
          "provides:notification.outbox@v1",
          "provides:policy.resource-action@v1",
          "requires:audit.event@v1",
          "requires:policy.resource-action@v1",
        ],
        targetRuntimeInterfaceVersions: [
          "api.service@factory.api-service/v1",
          "database.schema@factory.prisma-schema/v1",
          "policy.rule@factory.policy-rule/v1",
          "test.fixture@factory.test-fixture/v1",
          "web.route@factory.web-route/v1",
        ],
        resolvedDependencyOrder: [
          "core.audit",
          "core.crud",
          "core.notification",
          "core.policy-declarations",
          "core.identity-policy",
          "core.workflow",
        ],
        lockDigest:
          "sha256:572f48efea78e01f3fa58fc7f4aa0d203dd689675cb6b38aefaf20d35444cced",
      },
    },
    hashes: {
      "THIRD_PARTY_NOTICES.md":
        "8dac8d5c476c101d05d4a2b2b9350ae29685271fa2a8641f9210b9189789013b",
      "package.json":
        "01cc254a4a3f152d9ca776150322eff711875bd51737fefaa0c1c55fc12e62fc",
      "pnpm-workspace.yaml":
        "f0473b2f758a8a4f74f6d1eca80f35fe546a0e6ed9af0f41fbc276e7dafa51c2",
      "capability-lock.json":
        "f528b889e77a79767d2b23c771de98ae1e05c72d62ff3bbeec810d068a27b4dc",
      "composition-lock.json":
        "a429e3267705c91b1e80b156f39a1282e20e45113fc1bb1a44569912009d33c1",
      "capability-template-lock.json":
        "f531355d67a22d206286575c5cd250fd989817f49a154c4971732b94f9f0b719",
      "simulator/index.html":
        "9623f310910ec0e534873beceaa190874e06f5b81dda054f54ccb1fbd8c5fde2",
      "web/package.json":
        "c13604a1355604db3a1ae2d55a8ed1b4963e2a2be5a558748091ee50b56d13ea",
      "web/tsconfig.json":
        "2e5e91cdf839359ad69bab84cbfea405bc70b5243251a8e5ce33b8d0b070ed6a",
      "web/next-env.d.ts":
        "bc460da01d99074c5173c5e2943bb6f39a7537533c28b837571ccf8bda616ccf",
      "web/app/layout.tsx":
        "5e990d678b5ccab96094e71c29d22c677bdb7c63a2913980dcd0c89742ff67f5",
      "web/app/page-runtime.tsx":
        "c4ec8ab847b15d63807ad2b9e188f6acf8a72087804b144de3821af139e981ee",
      "web/app/page.tsx":
        "25cdd881f063770b2931e20ad68d5aec072cadad43f92d4b8b8a7003227a6d65",
      "web/app/[...path]/page.tsx":
        "511cdd8e42c187897360be87b6835a09f7ed2bcc0819e8781ab798f340ebecdb",
      "web/app/favicon.ico/route.ts":
        "3011528d42efd01c9c7605520699b67a4cb8908697257e81b11503fffd4c8e76",
      "web/app/api/[...path]/route.ts":
        "4d29a822fa47f5fd28a708fd2300d9e9bb8bb7ed7e93d7c9b9dc521171ef5d93",
      "web/app/globals.css":
        "1efdde296a910a171a2443a01786b5d4a49a57312adbc8fd2825114b17110a98",
      "api/package.json":
        "f758b1daaecedeab6f65f4f251d03f2fd8147de1f2b8a86747e116a0fb5d068e",
      "api/tsconfig.json":
        "ba06ca0caffb054b4c1128d1a43e9ba8d40d97993b41e6fe621dd4cfc19b1f70",
      "api/Dockerfile":
        "620b0eed690c3df5de947bd580a2bf99255cc22409c8a834ff4e5c831dc340bb",
      "api/.dockerignore":
        "51b683467baace87247effed923b8aaecc559168ba0efbb43fd4714a8dc19362",
      "api/src/main.ts":
        "3e3293fea45ff32a021dfde429ceab6b9af973d55f4c8e13022145f709783103",
      "api/src/capabilities/contract.ts":
        "b13c886fc22acbcc4f3d9754867525e31b12f6dfb3d964bea0daf17ad2f2a64c",
      "api/src/capabilities/core.audit.ts":
        "40033a79c81e521c59e3ba361604655a1506cf1a241ea5d5643328b239459418",
      "api/src/capabilities/core.crud.ts":
        "ffea3b6984f92798374f0aea33b1cecce9da2e12d7d050aa63403efc61999c8e",
      "api/src/capabilities/core.identity-policy.ts":
        "3c84728e43752ccf95ce9e6809e6cf18fc96d326e4ad942a69c33bcd655ca89b",
      "api/src/capabilities/core.notification.ts":
        "47dcdc9c6d99930cb12e1121a58382f2e565620b44f190a0af68fde9198376ac",
      "api/src/capabilities/core.policy-declarations.ts":
        "e266c02d6ee9c2accf2322165cda2eb64aea7c12594f272a9389c787763b01cc",
      "api/src/capabilities/core.workflow.ts":
        "1197355ce7226695972737fe35b7d9c0f881a6549bdd11de70c787c4b8c27a71",
      "database/prisma/fragments/purchase-request.prisma":
        "8b2e9f3859a208e3c726a97c36cdeaceef5fde8b8661eed55f976aa4f2c45ae0",
      "web/src/app/purchase-request-list/page.tsx":
        "5f5a87be88845647d719a3661a21ba7897d27ca0f0b279cc7153d340e9ca4608",
      "api/policy/fragments/resource-action.conf":
        "05c687edf087fa7d2c91b4f1e2cebb2fd0d8c543234017ee735bc28f7cd67bae",
      "api/policy/fragments/identity-policy.conf":
        "e540e98476f8e7f35470f55c1d2fa6cc14cf82d163ade6f52c4881c53361cfa6",
      "api/src/services/identity-policy-local.service.ts":
        "9d628b5a349218e96746baf0cab491a1fe81a6db34abae273106e6155b9624b5",
      "api/test/fixtures/identity-policy.json":
        "6c61ba129df9ab99afa28a6ef49d43678277a991176d9b7ea77b8529d96126be",
      "api/src/capabilities/registry.ts":
        "f56c988a988b277e41b73769711287b2b89b90acbec98abff2e7976c53ea36c9",
      "api/src/application-runtime.ts":
        "6efcd247e860a8ea4decbaa8f8f20cac7e8927fa014a75bf16604ddbbf725884",
      "api/src/prisma-record-store.ts":
        "aa63aa7ae06148a153ff5d6f9c1d4632786b6fcac314c588412eebfb445fab87",
      "api/src/notification-outbox-worker.ts":
        "02989ed0a878af1daf8cbc968ff1e0e0746f660258c95e6bc215eae4b4818e6f",
      "api/src/notification-outbox-drain.ts":
        "439d0bb92af9bbee554c4f14653b7a4686108cf1f9b4af34a24be1145269306a",
      "api/README.md":
        "c909240a419da5fd9eeb8bdf49f0287c604b6e694d2b6d6e18922a37d9b4075b",
      "api/policy/model.conf":
        "10f281d006f6e3b3210e56fa0ffc1771993156fdc5e131f8bdc975b03ef0ef26",
      "api/policy/policy.csv":
        "399294494dd81cdb13e40919733c2a6d71b25b4450f4203154566cb52ef10df2",
      "api/src/policy.ts":
        "dd30bbe6181a08a45c9aef3bbf976acf1afcee6f42cea7f9f3a166b64e9f61bd",
      "database/prisma/schema.prisma":
        "18648b443898f4e69a5aadd1b514c59aa3506a4960d2a6096e0726ce171b660b",
      "api/prisma/schema.prisma":
        "18648b443898f4e69a5aadd1b514c59aa3506a4960d2a6096e0726ce171b660b",
      "database/prisma/migrations/0001_initial/migration.sql":
        "90c16474568ae1f74138d1bf4d1df6232ca081b2f47f88c93c144f61637fd86c",
      "database/prisma/seed.ts":
        "4011b5c1f3e3d6140d4e974a4a9ce162c10b43fc1f829d5e4bd2e865bd96c74a",
      "database/package.json":
        "e1637d8e1356472a6f331b35110004f8b7e82209a03e05b4b16a293dd4ae7dc0",
      "database/Dockerfile":
        "3226c780acb59a88e1ace066c2639fdaedf394b409d561b7f0496de6aefd9f27",
      "database/.dockerignore":
        "1d1e0e64dd7d274f2bff103d50536f8d98d5705fc1bc51ebd7447dd06827864e",
      "api/src/flows/definitions.ts":
        "11c7140b1942314ceac4864aee31a02aec982942bd4ae7c653da13093cfda560",
      "api/src/flows/machines.ts":
        "86f9aaef38d6e150e3e9299209e6c8e48c22b3b65529013578ee624d88ec81e5",
      "api/test/journey.generated.test.ts":
        "41ca2455a67f3a0214f1c4210d7fd835e1caf2178102f6fdaf2ecf35f37e7c4c",
      "tests/journeys.generated.md":
        "8d2d4ff093bf554341120f76df698b01b15e52b6adb18a584b4103726a8a3ad6",
      "docs/api-reference.md":
        "537d14f2b098bcdc456a7364fc8eb4af7bfc8057103af116fc07790f27229c3e",
      "docs/entity-relationship.md":
        "757791eaba995a4ea1f0bed2436a6d7c01ca748295f6914cac502df71598c830",
      "docs/permission-matrix.md":
        "316f8c52e9216bf1181716ae8e399a272f4e19a95df5ce62669e666eb588c065",
      "docs/application.md":
        "9003448dbaedcd1a355fbc9f19659df9c77e33e01224df7d1f499cdafa725692",
      "web/Dockerfile":
        "98b6a4233a02d430750ad058ddaa88394ce4f109c26906a4045ab6cf49d0b7d0",
      "web/.dockerignore":
        "b48855493dc2f402291313f76096909a8962ed4ca1350956138259e071fce13d",
      "docker-compose.yml":
        "90e879b4d8170edaba5a9011f86e3d904b79d31d2a7bb68c315b2e30d7f139e2",
      "README.md":
        "722e29586f1c226cdb2a051cb25d9e717f784e64d7580d1b61a08005c57af907",
    },
    manifest: [
      {
        path: "THIRD_PARTY_NOTICES.md",
        bytes: 1053,
        sha256:
          "8dac8d5c476c101d05d4a2b2b9350ae29685271fa2a8641f9210b9189789013b",
      },
      {
        path: "package.json",
        bytes: 261,
        sha256:
          "01cc254a4a3f152d9ca776150322eff711875bd51737fefaa0c1c55fc12e62fc",
      },
      {
        path: "pnpm-workspace.yaml",
        bytes: 39,
        sha256:
          "f0473b2f758a8a4f74f6d1eca80f35fe546a0e6ed9af0f41fbc276e7dafa51c2",
      },
      {
        path: "capability-lock.json",
        bytes: 1861,
        sha256:
          "f528b889e77a79767d2b23c771de98ae1e05c72d62ff3bbeec810d068a27b4dc",
      },
      {
        path: "composition-lock.json",
        bytes: 4487,
        sha256:
          "a429e3267705c91b1e80b156f39a1282e20e45113fc1bb1a44569912009d33c1",
      },
      {
        path: "capability-template-lock.json",
        bytes: 2173,
        sha256:
          "f531355d67a22d206286575c5cd250fd989817f49a154c4971732b94f9f0b719",
      },
      {
        path: "simulator/index.html",
        bytes: 5223,
        sha256:
          "9623f310910ec0e534873beceaa190874e06f5b81dda054f54ccb1fbd8c5fde2",
      },
      {
        path: "web/package.json",
        bytes: 385,
        sha256:
          "c13604a1355604db3a1ae2d55a8ed1b4963e2a2be5a558748091ee50b56d13ea",
      },
      {
        path: "web/tsconfig.json",
        bytes: 612,
        sha256:
          "2e5e91cdf839359ad69bab84cbfea405bc70b5243251a8e5ce33b8d0b070ed6a",
      },
      {
        path: "web/next-env.d.ts",
        bytes: 126,
        sha256:
          "bc460da01d99074c5173c5e2943bb6f39a7537533c28b837571ccf8bda616ccf",
      },
      {
        path: "web/app/layout.tsx",
        bytes: 263,
        sha256:
          "5e990d678b5ccab96094e71c29d22c677bdb7c63a2913980dcd0c89742ff67f5",
      },
      {
        path: "web/app/page-runtime.tsx",
        bytes: 105688,
        sha256:
          "c4ec8ab847b15d63807ad2b9e188f6acf8a72087804b144de3821af139e981ee",
      },
      {
        path: "web/app/page.tsx",
        bytes: 157,
        sha256:
          "25cdd881f063770b2931e20ad68d5aec072cadad43f92d4b8b8a7003227a6d65",
      },
      {
        path: "web/app/[...path]/page.tsx",
        bytes: 362,
        sha256:
          "511cdd8e42c187897360be87b6835a09f7ed2bcc0819e8781ab798f340ebecdb",
      },
      {
        path: "web/app/favicon.ico/route.ts",
        bytes: 349,
        sha256:
          "3011528d42efd01c9c7605520699b67a4cb8908697257e81b11503fffd4c8e76",
      },
      {
        path: "web/app/api/[...path]/route.ts",
        bytes: 1043,
        sha256:
          "4d29a822fa47f5fd28a708fd2300d9e9bb8bb7ed7e93d7c9b9dc521171ef5d93",
      },
      {
        path: "web/app/globals.css",
        bytes: 42666,
        sha256:
          "1efdde296a910a171a2443a01786b5d4a49a57312adbc8fd2825114b17110a98",
      },
      {
        path: "api/package.json",
        bytes: 694,
        sha256:
          "f758b1daaecedeab6f65f4f251d03f2fd8147de1f2b8a86747e116a0fb5d068e",
      },
      {
        path: "api/tsconfig.json",
        bytes: 267,
        sha256:
          "ba06ca0caffb054b4c1128d1a43e9ba8d40d97993b41e6fe621dd4cfc19b1f70",
      },
      {
        path: "api/Dockerfile",
        bytes: 296,
        sha256:
          "620b0eed690c3df5de947bd580a2bf99255cc22409c8a834ff4e5c831dc340bb",
      },
      {
        path: "api/.dockerignore",
        bytes: 23,
        sha256:
          "51b683467baace87247effed923b8aaecc559168ba0efbb43fd4714a8dc19362",
      },
      {
        path: "api/src/main.ts",
        bytes: 7282,
        sha256:
          "3e3293fea45ff32a021dfde429ceab6b9af973d55f4c8e13022145f709783103",
      },
      {
        path: "api/src/capabilities/contract.ts",
        bytes: 6358,
        sha256:
          "b13c886fc22acbcc4f3d9754867525e31b12f6dfb3d964bea0daf17ad2f2a64c",
      },
      {
        path: "api/src/capabilities/core.audit.ts",
        bytes: 568,
        sha256:
          "40033a79c81e521c59e3ba361604655a1506cf1a241ea5d5643328b239459418",
      },
      {
        path: "api/src/capabilities/core.crud.ts",
        bytes: 472,
        sha256:
          "ffea3b6984f92798374f0aea33b1cecce9da2e12d7d050aa63403efc61999c8e",
      },
      {
        path: "api/src/capabilities/core.identity-policy.ts",
        bytes: 2070,
        sha256:
          "3c84728e43752ccf95ce9e6809e6cf18fc96d326e4ad942a69c33bcd655ca89b",
      },
      {
        path: "api/src/capabilities/core.notification.ts",
        bytes: 628,
        sha256:
          "47dcdc9c6d99930cb12e1121a58382f2e565620b44f190a0af68fde9198376ac",
      },
      {
        path: "api/src/capabilities/core.policy-declarations.ts",
        bytes: 253,
        sha256:
          "e266c02d6ee9c2accf2322165cda2eb64aea7c12594f272a9389c787763b01cc",
      },
      {
        path: "api/src/capabilities/core.workflow.ts",
        bytes: 451,
        sha256:
          "1197355ce7226695972737fe35b7d9c0f881a6549bdd11de70c787c4b8c27a71",
      },
      {
        path: "database/prisma/fragments/purchase-request.prisma",
        bytes: 60,
        sha256:
          "8b2e9f3859a208e3c726a97c36cdeaceef5fde8b8661eed55f976aa4f2c45ae0",
      },
      {
        path: "web/src/app/purchase-request-list/page.tsx",
        bytes: 179,
        sha256:
          "5f5a87be88845647d719a3661a21ba7897d27ca0f0b279cc7153d340e9ca4608",
      },
      {
        path: "api/policy/fragments/resource-action.conf",
        bytes: 236,
        sha256:
          "05c687edf087fa7d2c91b4f1e2cebb2fd0d8c543234017ee735bc28f7cd67bae",
      },
      {
        path: "api/policy/fragments/identity-policy.conf",
        bytes: 156,
        sha256:
          "e540e98476f8e7f35470f55c1d2fa6cc14cf82d163ade6f52c4881c53361cfa6",
      },
      {
        path: "api/src/services/identity-policy-local.service.ts",
        bytes: 246,
        sha256:
          "9d628b5a349218e96746baf0cab491a1fe81a6db34abae273106e6155b9624b5",
      },
      {
        path: "api/test/fixtures/identity-policy.json",
        bytes: 254,
        sha256:
          "6c61ba129df9ab99afa28a6ef49d43678277a991176d9b7ea77b8529d96126be",
      },
      {
        path: "api/src/capabilities/registry.ts",
        bytes: 4104,
        sha256:
          "f56c988a988b277e41b73769711287b2b89b90acbec98abff2e7976c53ea36c9",
      },
      {
        path: "api/src/application-runtime.ts",
        bytes: 21999,
        sha256:
          "6efcd247e860a8ea4decbaa8f8f20cac7e8927fa014a75bf16604ddbbf725884",
      },
      {
        path: "api/src/prisma-record-store.ts",
        bytes: 7804,
        sha256:
          "aa63aa7ae06148a153ff5d6f9c1d4632786b6fcac314c588412eebfb445fab87",
      },
      {
        path: "api/src/notification-outbox-worker.ts",
        bytes: 2122,
        sha256:
          "02989ed0a878af1daf8cbc968ff1e0e0746f660258c95e6bc215eae4b4818e6f",
      },
      {
        path: "api/src/notification-outbox-drain.ts",
        bytes: 975,
        sha256:
          "439d0bb92af9bbee554c4f14653b7a4686108cf1f9b4af34a24be1145269306a",
      },
      {
        path: "api/README.md",
        bytes: 368,
        sha256:
          "c909240a419da5fd9eeb8bdf49f0287c604b6e694d2b6d6e18922a37d9b4075b",
      },
      {
        path: "api/policy/model.conf",
        bytes: 195,
        sha256:
          "10f281d006f6e3b3210e56fa0ffc1771993156fdc5e131f8bdc975b03ef0ef26",
      },
      {
        path: "api/policy/policy.csv",
        bytes: 904,
        sha256:
          "399294494dd81cdb13e40919733c2a6d71b25b4450f4203154566cb52ef10df2",
      },
      {
        path: "api/src/policy.ts",
        bytes: 1630,
        sha256:
          "dd30bbe6181a08a45c9aef3bbf976acf1afcee6f42cea7f9f3a166b64e9f61bd",
      },
      {
        path: "database/prisma/schema.prisma",
        bytes: 2289,
        sha256:
          "18648b443898f4e69a5aadd1b514c59aa3506a4960d2a6096e0726ce171b660b",
      },
      {
        path: "api/prisma/schema.prisma",
        bytes: 2289,
        sha256:
          "18648b443898f4e69a5aadd1b514c59aa3506a4960d2a6096e0726ce171b660b",
      },
      {
        path: "database/prisma/migrations/0001_initial/migration.sql",
        bytes: 3287,
        sha256:
          "90c16474568ae1f74138d1bf4d1df6232ca081b2f47f88c93c144f61637fd86c",
      },
      {
        path: "database/prisma/seed.ts",
        bytes: 1258,
        sha256:
          "4011b5c1f3e3d6140d4e974a4a9ce162c10b43fc1f829d5e4bd2e865bd96c74a",
      },
      {
        path: "database/package.json",
        bytes: 380,
        sha256:
          "e1637d8e1356472a6f331b35110004f8b7e82209a03e05b4b16a293dd4ae7dc0",
      },
      {
        path: "database/Dockerfile",
        bytes: 319,
        sha256:
          "3226c780acb59a88e1ace066c2639fdaedf394b409d561b7f0496de6aefd9f27",
      },
      {
        path: "database/.dockerignore",
        bytes: 18,
        sha256:
          "1d1e0e64dd7d274f2bff103d50536f8d98d5705fc1bc51ebd7447dd06827864e",
      },
      {
        path: "api/src/flows/definitions.ts",
        bytes: 1282,
        sha256:
          "11c7140b1942314ceac4864aee31a02aec982942bd4ae7c653da13093cfda560",
      },
      {
        path: "api/src/flows/machines.ts",
        bytes: 561,
        sha256:
          "86f9aaef38d6e150e3e9299209e6c8e48c22b3b65529013578ee624d88ec81e5",
      },
      {
        path: "api/test/journey.generated.test.ts",
        bytes: 1670,
        sha256:
          "41ca2455a67f3a0214f1c4210d7fd835e1caf2178102f6fdaf2ecf35f37e7c4c",
      },
      {
        path: "tests/journeys.generated.md",
        bytes: 106,
        sha256:
          "8d2d4ff093bf554341120f76df698b01b15e52b6adb18a584b4103726a8a3ad6",
      },
      {
        path: "docs/api-reference.md",
        bytes: 1272,
        sha256:
          "537d14f2b098bcdc456a7364fc8eb4af7bfc8057103af116fc07790f27229c3e",
      },
      {
        path: "docs/entity-relationship.md",
        bytes: 1072,
        sha256:
          "757791eaba995a4ea1f0bed2436a6d7c01ca748295f6914cac502df71598c830",
      },
      {
        path: "docs/permission-matrix.md",
        bytes: 867,
        sha256:
          "316f8c52e9216bf1181716ae8e399a272f4e19a95df5ce62669e666eb588c065",
      },
      {
        path: "docs/application.md",
        bytes: 540,
        sha256:
          "9003448dbaedcd1a355fbc9f19659df9c77e33e01224df7d1f499cdafa725692",
      },
      {
        path: "web/Dockerfile",
        bytes: 186,
        sha256:
          "98b6a4233a02d430750ad058ddaa88394ce4f109c26906a4045ab6cf49d0b7d0",
      },
      {
        path: "web/.dockerignore",
        bytes: 24,
        sha256:
          "b48855493dc2f402291313f76096909a8962ed4ca1350956138259e071fce13d",
      },
      {
        path: "docker-compose.yml",
        bytes: 1109,
        sha256:
          "90e879b4d8170edaba5a9011f86e3d904b79d31d2a7bb68c315b2e30d7f139e2",
      },
      {
        path: "README.md",
        bytes: 860,
        sha256:
          "722e29586f1c226cdb2a051cb25d9e717f784e64d7580d1b61a08005c57af907",
      },
    ],
    manifestHash:
      "0e9f7c95065f7261e9ca4bff271294d78e475644d84e8d6853d11d944e8c5791",
    bundleHash:
      "e1a4aa49712f7b79fb9214c89c8439a1dbb4c61b6c6833545787fc81473f35fb",
  },
  booking: {
    baseCommit: "92f21089beeb184a236a1512cb4c1866f158e903",
    input: {
      publishedRevisionId: "correction-legacy-booking",
      graph: {
        apiVersion: "factory.application-graph/v1",
        metadata: {
          id: "appointment-booking-requirement",
          workspaceId: "local-workspace",
          name: "Appointment Booking",
        },
        page: {
          pages: [
            {
              id: "booking-calendar",
              route: "/booking-calendar",
              title: "Booking calendar",
              blocks: [
                {
                  id: "booking-calendar-calendar",
                  type: "calendar",
                  entity: "appointment",
                },
              ],
            },
            {
              id: "booking-list",
              route: "/booking-list",
              title: "Appointment list",
              blocks: [
                {
                  id: "booking-list-list",
                  type: "list",
                  entity: "appointment",
                },
              ],
            },
            {
              id: "booking-form",
              route: "/booking-form",
              title: "New appointment",
              blocks: [
                {
                  id: "booking-form-form",
                  type: "form",
                  entity: "appointment",
                },
              ],
            },
            {
              id: "booking-detail",
              route: "/booking-detail",
              title: "Appointment detail",
              blocks: [
                {
                  id: "booking-detail-detail",
                  type: "detail",
                  entity: "appointment",
                },
              ],
            },
            {
              id: "service-list",
              route: "/service-list",
              title: "Service list",
              blocks: [
                {
                  id: "service-list-list",
                  type: "list",
                  entity: "service",
                },
              ],
            },
            {
              id: "service-form",
              route: "/service-form",
              title: "New service",
              blocks: [
                {
                  id: "service-form-form",
                  type: "form",
                  entity: "service",
                },
              ],
            },
            {
              id: "schedule-list",
              route: "/schedule-list",
              title: "Schedule",
              blocks: [
                {
                  id: "schedule-list-list",
                  type: "list",
                  entity: "schedule",
                },
              ],
            },
          ],
          navigation: [
            {
              id: "nav-booking-calendar",
              label: "Booking calendar",
              pageId: "booking-calendar",
              icon: "calendar",
            },
            {
              id: "nav-booking-list",
              label: "Appointment list",
              pageId: "booking-list",
              icon: "list",
            },
            {
              id: "nav-service-list",
              label: "Service list",
              pageId: "service-list",
              icon: "list",
            },
            {
              id: "nav-schedule-list",
              label: "Schedule",
              pageId: "schedule-list",
              icon: "list",
            },
          ],
        },
        domain: {
          entities: [
            {
              key: "service",
              label: "Service",
              fields: [
                {
                  key: "name",
                  type: "string",
                  required: true,
                },
                {
                  key: "durationMinutes",
                  type: "integer",
                  required: true,
                },
                {
                  key: "price",
                  type: "decimal",
                  required: true,
                },
              ],
              indexes: [],
            },
            {
              key: "appointment",
              label: "Appointment",
              fields: [
                {
                  key: "serviceKey",
                  type: "string",
                  required: true,
                },
                {
                  key: "startsAt",
                  type: "datetime",
                  required: true,
                },
                {
                  key: "customerName",
                  type: "string",
                  required: true,
                },
                {
                  key: "notes",
                  type: "text",
                  required: false,
                },
                {
                  key: "status",
                  type: "enum",
                  required: true,
                  values: [
                    "requested",
                    "confirmed",
                    "rescheduled",
                    "cancelled",
                  ],
                },
              ],
              indexes: [
                {
                  fields: ["status"],
                },
              ],
            },
            {
              key: "schedule",
              label: "Schedule",
              fields: [
                {
                  key: "day",
                  type: "date",
                  required: true,
                },
                {
                  key: "capacity",
                  type: "integer",
                  required: true,
                },
              ],
              indexes: [],
            },
            {
              key: "appointment-booking-requirement-principal",
              label: "Appointment Booking principal",
              fields: [
                {
                  key: "subjectRef",
                  type: "string",
                  required: true,
                  unique: true,
                },
                {
                  key: "role",
                  type: "enum",
                  required: true,
                  values: ["customer", "staff", "administrator"],
                },
                {
                  key: "active",
                  type: "boolean",
                  required: true,
                },
              ],
              indexes: [
                {
                  fields: ["active"],
                },
              ],
            },
            {
              key: "appointment-booking-requirement-session",
              label: "Appointment Booking session",
              fields: [
                {
                  key: "subjectRef",
                  type: "string",
                  required: true,
                },
                {
                  key: "status",
                  type: "enum",
                  required: true,
                  values: ["active", "expired"],
                },
                {
                  key: "expiresAt",
                  type: "datetime",
                  required: true,
                },
              ],
              indexes: [
                {
                  fields: ["subjectRef", "status"],
                },
              ],
            },
          ],
          relations: [
            {
              from: "appointment",
              to: "service",
              kind: "many-to-one",
              field: "serviceKey",
            },
            {
              from: "appointment-booking-requirement-session",
              to: "appointment-booking-requirement-principal",
              kind: "many-to-one",
              field: "subjectRef",
            },
          ],
          seedData: [
            {
              entity: "service",
              id: "sample-service",
              values: {
                name: "Sample Name",
                durationMinutes: 12,
                price: 125.5,
              },
            },
            {
              entity: "appointment",
              id: "sample-appointment",
              values: {
                startsAt: "2026-08-01T09:00:00Z",
                customerName: "Sample Customer name",
                notes: "Sample Notes detail",
                status: "requested",
              },
            },
            {
              entity: "schedule",
              id: "sample-schedule",
              values: {
                day: "2026-08-01",
                capacity: 12,
              },
            },
          ],
        },
        policy: {
          roles: ["customer", "staff", "administrator"],
          permissions: [
            {
              role: "customer",
              resource: "appointment",
              actions: ["create", "read"],
            },
            {
              role: "customer",
              resource: "appointment-booking-requirement-principal",
              actions: ["read"],
            },
            {
              role: "customer",
              resource: "appointment-booking-requirement-session",
              actions: ["create", "read", "update"],
            },
            {
              role: "staff",
              resource: "appointment",
              actions: ["read", "confirm", "reschedule"],
            },
            {
              role: "staff",
              resource: "appointment-booking-requirement-principal",
              actions: ["read"],
            },
            {
              role: "staff",
              resource: "appointment-booking-requirement-session",
              actions: ["read"],
            },
            {
              role: "administrator",
              resource: "service",
              actions: ["create", "read", "update", "delete", "manage"],
            },
            {
              role: "administrator",
              resource: "schedule",
              actions: ["create", "read", "update", "delete", "manage"],
            },
            {
              role: "administrator",
              resource: "appointment",
              actions: ["read", "delete", "cancel", "manage"],
            },
            {
              role: "administrator",
              resource: "appointment-booking-requirement-principal",
              actions: ["read"],
            },
            {
              role: "administrator",
              resource: "appointment-booking-requirement-session",
              actions: ["read"],
            },
          ],
        },
        flow: {
          flows: [
            {
              id: "appointment-lifecycle",
              entity: "appointment",
              initialState: "requested",
              states: ["requested", "confirmed", "rescheduled", "cancelled"],
              events: ["confirm", "reschedule", "delete", "cancel"],
              transitions: [
                {
                  from: "requested",
                  event: "confirm",
                  to: "confirmed",
                  roles: ["staff"],
                },
                {
                  from: "confirmed",
                  event: "reschedule",
                  to: "rescheduled",
                  roles: ["staff"],
                },
                {
                  from: "requested",
                  event: "delete",
                  to: "cancelled",
                  roles: ["administrator"],
                },
                {
                  from: "confirmed",
                  event: "cancel",
                  to: "cancelled",
                  roles: ["administrator"],
                },
              ],
            },
          ],
        },
        integration: {
          providers: [],
          capabilities: [
            {
              key: "identity.context.resolve",
              providerId: "factory",
              operation: "resolve",
            },
            {
              key: "authorization.decision",
              providerId: "factory",
              operation: "decision",
            },
          ],
          compositionSelections: [
            {
              lock: {
                key: "core.crud",
                version: "1.0.1",
                packageRoot: "packages/capabilities/assets/core.crud/1.0.1",
                manifestDigest:
                  "sha256:8dede9ba8d63bea9b09c7bf7ac6ce784c52595b644d03eca52ea6996a31882d1",
                lifecycle: "golden",
              },
              bindings: {
                entityKey: {
                  graphSymbol: "graph.domain.service",
                },
                routeKey: {
                  graphSymbol: "graph.page.service-list",
                },
              },
            },
            {
              lock: {
                key: "core.workflow",
                version: "1.0.1",
                packageRoot: "packages/capabilities/assets/core.workflow/1.0.1",
                manifestDigest:
                  "sha256:16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884",
                lifecycle: "golden",
              },
              bindings: {
                flowKey: {
                  graphSymbol: "graph.flow.appointment-lifecycle",
                },
              },
            },
            {
              lock: {
                key: "core.identity-policy",
                version: "1.0.0",
                packageRoot:
                  "packages/capabilities/assets/core.identity-policy/1.0.0",
                manifestDigest:
                  "sha256:a216444b219f00431820a0df8e2bc3b604296430beb8fa6549f1b40c92025d82",
                lifecycle: "golden",
              },
              bindings: {
                principalEntity: {
                  graphSymbol:
                    "graph.domain.appointment-booking-requirement-principal",
                },
                sessionEntity: {
                  graphSymbol:
                    "graph.domain.appointment-booking-requirement-session",
                },
                defaultRole: {
                  graphSymbol: "graph.policy.customer",
                },
                authenticatedRole: {
                  graphSymbol: "graph.policy.staff",
                },
              },
            },
            {
              lock: {
                key: "core.policy-declarations",
                version: "1.0.0",
                packageRoot:
                  "packages/capabilities/assets/core.policy-declarations/1.0.0",
                manifestDigest:
                  "sha256:56e6ead5aaa6e9f5fe9cf7c608b6b51b16064964cf95cd123bdc3e0725642c54",
                lifecycle: "golden",
              },
              bindings: {},
            },
            {
              lock: {
                key: "core.audit",
                version: "1.0.2",
                packageRoot: "packages/capabilities/assets/core.audit/1.0.2",
                manifestDigest:
                  "sha256:fe6616252c7b44efe61d516d305e689f3f593d70d5287baac31b5f31013addc8",
                lifecycle: "golden",
              },
              bindings: {
                actorRole: {
                  graphSymbol: "graph.policy.customer",
                },
              },
            },
            {
              lock: {
                key: "core.notification",
                version: "1.1.1",
                packageRoot:
                  "packages/capabilities/assets/core.notification/1.1.1",
                manifestDigest:
                  "sha256:207eaa0fd719013129ba84bd8f66f82219b619ee1f5c9e2d4e3d896c339e6132",
                lifecycle: "golden",
              },
              bindings: {
                recipientRole: {
                  graphSymbol: "graph.policy.customer",
                },
              },
            },
          ],
        },
        experience: {
          theme: {
            mode: "light",
            tokens: {},
          },
          locales: ["en"],
        },
      },
      compositionLock: {
        apiVersion: "factory.composition/v1",
        applicationGraphChecksum:
          "sha256:104ff793b257de5b3b6084b1bce509fc0f74320dc46267ee1b69a7d1da609af3",
        packages: [
          {
            lock: {
              key: "core.audit",
              version: "1.0.2",
              packageRoot: "packages/capabilities/assets/core.audit/1.0.2",
              manifestDigest:
                "sha256:fe6616252c7b44efe61d516d305e689f3f593d70d5287baac31b5f31013addc8",
              lifecycle: "golden",
            },
            bindings: {
              actorRole: {
                graphSymbol: "graph.policy.customer",
              },
            },
          },
          {
            lock: {
              key: "core.crud",
              version: "1.0.1",
              packageRoot: "packages/capabilities/assets/core.crud/1.0.1",
              manifestDigest:
                "sha256:8dede9ba8d63bea9b09c7bf7ac6ce784c52595b644d03eca52ea6996a31882d1",
              lifecycle: "golden",
            },
            bindings: {
              entityKey: {
                graphSymbol: "graph.domain.service",
              },
              routeKey: {
                graphSymbol: "graph.page.service-list",
              },
            },
          },
          {
            lock: {
              key: "core.identity-policy",
              version: "1.0.0",
              packageRoot:
                "packages/capabilities/assets/core.identity-policy/1.0.0",
              manifestDigest:
                "sha256:a216444b219f00431820a0df8e2bc3b604296430beb8fa6549f1b40c92025d82",
              lifecycle: "golden",
            },
            bindings: {
              authenticatedRole: {
                graphSymbol: "graph.policy.staff",
              },
              defaultRole: {
                graphSymbol: "graph.policy.customer",
              },
              principalEntity: {
                graphSymbol:
                  "graph.domain.appointment-booking-requirement-principal",
              },
              sessionEntity: {
                graphSymbol:
                  "graph.domain.appointment-booking-requirement-session",
              },
            },
          },
          {
            lock: {
              key: "core.notification",
              version: "1.1.1",
              packageRoot:
                "packages/capabilities/assets/core.notification/1.1.1",
              manifestDigest:
                "sha256:207eaa0fd719013129ba84bd8f66f82219b619ee1f5c9e2d4e3d896c339e6132",
              lifecycle: "golden",
            },
            bindings: {
              recipientRole: {
                graphSymbol: "graph.policy.customer",
              },
            },
          },
          {
            lock: {
              key: "core.policy-declarations",
              version: "1.0.0",
              packageRoot:
                "packages/capabilities/assets/core.policy-declarations/1.0.0",
              manifestDigest:
                "sha256:56e6ead5aaa6e9f5fe9cf7c608b6b51b16064964cf95cd123bdc3e0725642c54",
              lifecycle: "golden",
            },
            bindings: {},
          },
          {
            lock: {
              key: "core.workflow",
              version: "1.0.1",
              packageRoot: "packages/capabilities/assets/core.workflow/1.0.1",
              manifestDigest:
                "sha256:16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884",
              lifecycle: "golden",
            },
            bindings: {
              flowKey: {
                graphSymbol: "graph.flow.appointment-lifecycle",
              },
            },
          },
        ],
        resolvedContributionDigests: [
          "sha256:0249329a78a7fc15eaf285892df9e6bb21b3ae04808d73316eae1b320bb0197c",
          "sha256:05c687edf087fa7d2c91b4f1e2cebb2fd0d8c543234017ee735bc28f7cd67bae",
          "sha256:6c61ba129df9ab99afa28a6ef49d43678277a991176d9b7ea77b8529d96126be",
          "sha256:80ae0802501d2d97c3270f88251426a1cb53fa0cabcb8fddf8142975ba38f2d7",
          "sha256:b8a6d2392a3f881f6f742e6e2fa1bb2ff30966b3cc345221f186ad9a685f9b90",
          "sha256:be8d5b70bc8764671f7298d0ef31d74ba3d49f0be31870e715ebe74181c89afd",
          "sha256:e540e98476f8e7f35470f55c1d2fa6cc14cf82d163ade6f52c4881c53361cfa6",
        ],
        providedAndRequiredInterfaces: [
          "provides:audit.event@v1",
          "provides:authorization.decision@v1",
          "provides:identity.principal-context@v1",
          "provides:notification.outbox@v1",
          "provides:policy.resource-action@v1",
          "requires:audit.event@v1",
          "requires:policy.resource-action@v1",
        ],
        targetRuntimeInterfaceVersions: [
          "api.service@factory.api-service/v1",
          "database.schema@factory.prisma-schema/v1",
          "policy.rule@factory.policy-rule/v1",
          "test.fixture@factory.test-fixture/v1",
          "web.route@factory.web-route/v1",
        ],
        resolvedDependencyOrder: [
          "core.audit",
          "core.crud",
          "core.notification",
          "core.policy-declarations",
          "core.identity-policy",
          "core.workflow",
        ],
        lockDigest:
          "sha256:b7780b16231bda715ea3ca80383bf6bbacf1af2fc1533cac4d211cde18b81ea9",
      },
    },
    hashes: {
      "package.json":
        "bd3550e18349acfd856e6c8f234a320c2885766d2c919b213c9e683ab0071adf",
      "pnpm-workspace.yaml":
        "f0473b2f758a8a4f74f6d1eca80f35fe546a0e6ed9af0f41fbc276e7dafa51c2",
      "capability-lock.json":
        "b17d73fda7a44ae386c6cb74f4f12969267d46093be2622521666f5d5ae3c2e4",
      "composition-lock.json":
        "dd09231f2d73302dcc2e1c507a475dc7e73980558c56e83002df052f9152f143",
      "capability-template-lock.json":
        "56ddda58f2ae910e56fcaa56da5957e1abfdccee71c02a3fb7bc2e5c83dffbee",
      "simulator/index.html":
        "8a2b2eb89d61071b01a0b2199f0e0cb47b4509031f8319a48425f823df9921ea",
      "web/package.json":
        "c13604a1355604db3a1ae2d55a8ed1b4963e2a2be5a558748091ee50b56d13ea",
      "web/tsconfig.json":
        "2e5e91cdf839359ad69bab84cbfea405bc70b5243251a8e5ce33b8d0b070ed6a",
      "web/next-env.d.ts":
        "bc460da01d99074c5173c5e2943bb6f39a7537533c28b837571ccf8bda616ccf",
      "web/app/layout.tsx":
        "cdfcf676441f17402f7fef805ea3ca987bb242b0a57dcefda030a5bc78368ee5",
      "web/app/page-runtime.tsx":
        "28c6d4cf8564ae9ea420712c5d2f46050e337f7d5793f4928dd20441c7da8ad3",
      "web/app/page.tsx":
        "25cdd881f063770b2931e20ad68d5aec072cadad43f92d4b8b8a7003227a6d65",
      "web/app/[...path]/page.tsx":
        "511cdd8e42c187897360be87b6835a09f7ed2bcc0819e8781ab798f340ebecdb",
      "web/app/favicon.ico/route.ts":
        "3011528d42efd01c9c7605520699b67a4cb8908697257e81b11503fffd4c8e76",
      "web/app/api/[...path]/route.ts":
        "4d29a822fa47f5fd28a708fd2300d9e9bb8bb7ed7e93d7c9b9dc521171ef5d93",
      "web/app/globals.css":
        "c7a735c7a208480e24a8ff41b8b139e740826f147cbbd406ff547c14422ea2ca",
      "api/package.json":
        "f758b1daaecedeab6f65f4f251d03f2fd8147de1f2b8a86747e116a0fb5d068e",
      "api/tsconfig.json":
        "ba06ca0caffb054b4c1128d1a43e9ba8d40d97993b41e6fe621dd4cfc19b1f70",
      "api/Dockerfile":
        "620b0eed690c3df5de947bd580a2bf99255cc22409c8a834ff4e5c831dc340bb",
      "api/.dockerignore":
        "51b683467baace87247effed923b8aaecc559168ba0efbb43fd4714a8dc19362",
      "api/src/main.ts":
        "16d613de8f31602803e01aa7c47db625b435d4d61c202b4941401dc09833ec68",
      "api/src/capabilities/contract.ts":
        "b13c886fc22acbcc4f3d9754867525e31b12f6dfb3d964bea0daf17ad2f2a64c",
      "api/src/capabilities/core.audit.ts":
        "58cdb13aaf83d4509c02abd58099f0fe2b0ebc24f56a2c17ab22f731bdb2c6e1",
      "api/src/capabilities/core.crud.ts":
        "c6d785113d4ed64cb1a6bff0843971015009eea17be68c665fcb7761d38896de",
      "api/src/capabilities/core.identity-policy.ts":
        "5c778bf8aab50ed0c47ad339b8222ef0b71d246d1546bcd93e10a646aeb90c0d",
      "api/src/capabilities/core.notification.ts":
        "82de28c39579ae18e1f048f784022569f0078126c737d4b2773ffd6cace79f2c",
      "api/src/capabilities/core.policy-declarations.ts":
        "6109cd260a7d6b8a638b85d0699c363363a8f96931243bfde02d7a395c283b66",
      "api/src/capabilities/core.workflow.ts":
        "b9b582c92e535e5df9c4f28661742d554996a5691109c5141923a2746ae6b287",
      "database/prisma/fragments/service.prisma":
        "7259667a1bd8e61e7f579ad284f52f8df2cb0a298b3b2354582f507470482de6",
      "web/src/app/service-list/page.tsx":
        "6e38cc502971d9995f242bab8289950be34a764f0388c3e163bd9fccc65cc8ea",
      "api/policy/fragments/resource-action.conf":
        "05c687edf087fa7d2c91b4f1e2cebb2fd0d8c543234017ee735bc28f7cd67bae",
      "api/policy/fragments/identity-policy.conf":
        "e540e98476f8e7f35470f55c1d2fa6cc14cf82d163ade6f52c4881c53361cfa6",
      "api/src/services/identity-policy-local.service.ts":
        "78f1efa203be875253f6bfad0fce150ba88aff5a0e003a8accd630c453039bc7",
      "api/test/fixtures/identity-policy.json":
        "6c61ba129df9ab99afa28a6ef49d43678277a991176d9b7ea77b8529d96126be",
      "api/src/capabilities/registry.ts":
        "3eb1e2e47663b179f6fc54bf9182afd4aa295c54e51ba60e1186afe8b3f0dd05",
      "api/src/application-runtime.ts":
        "abf8b588a1060be45f81a85321ede57888ffb0f8b5f8152b80de60278cd7b5dc",
      "api/src/prisma-record-store.ts":
        "36f8921d25d8c4b40ed6bc4626691a5baf56a6076584017c572e81f519082a6b",
      "api/src/notification-outbox-worker.ts":
        "02989ed0a878af1daf8cbc968ff1e0e0746f660258c95e6bc215eae4b4818e6f",
      "api/src/notification-outbox-drain.ts":
        "439d0bb92af9bbee554c4f14653b7a4686108cf1f9b4af34a24be1145269306a",
      "api/README.md":
        "c909240a419da5fd9eeb8bdf49f0287c604b6e694d2b6d6e18922a37d9b4075b",
      "api/policy/model.conf":
        "10f281d006f6e3b3210e56fa0ffc1771993156fdc5e131f8bdc975b03ef0ef26",
      "api/policy/policy.csv":
        "c3d7f1ca6f6f17a0e0ec3d280eeae5e0e886ff6ba23527f361c05881801a9836",
      "api/src/policy.ts":
        "2881fd871dacb2018fe92ce439ecf16ffc7b097f92bf5ac6d4373b64cd3a9347",
      "database/prisma/schema.prisma":
        "2f1d2477f149ab8fa6942440d937c0e531c79636eeb064a008faa2611710d43e",
      "api/prisma/schema.prisma":
        "2f1d2477f149ab8fa6942440d937c0e531c79636eeb064a008faa2611710d43e",
      "database/prisma/migrations/0001_initial/migration.sql":
        "c09feaa7fcfb0d4f6b51fe31c8fa6f266cec2f06bc67503fbd5ce57adfecde33",
      "database/prisma/seed.ts":
        "b3badccde25f02555d0779bc5d7dda53df883841fa4ebf6d86ffd0d765db9c73",
      "database/package.json":
        "e1637d8e1356472a6f331b35110004f8b7e82209a03e05b4b16a293dd4ae7dc0",
      "database/Dockerfile":
        "3226c780acb59a88e1ace066c2639fdaedf394b409d561b7f0496de6aefd9f27",
      "database/.dockerignore":
        "1d1e0e64dd7d274f2bff103d50536f8d98d5705fc1bc51ebd7447dd06827864e",
      "api/src/flows/definitions.ts":
        "d8fab6ff1f320d80a86fa36c8be6c6c4f71e4ff54692c31a663b2c955e837577",
      "api/src/flows/machines.ts":
        "86f9aaef38d6e150e3e9299209e6c8e48c22b3b65529013578ee624d88ec81e5",
      "api/test/journey.generated.test.ts":
        "94762de2c32cc64e9dfe8dcb771bbb1f35c22b9dc620e08135b4cf5f888a0ef7",
      "tests/journeys.generated.md":
        "534bb4fef0d2824a3d9c1002981b50699fdd52bae9920f5a752ca1330e660f4c",
      "docs/api-reference.md":
        "e8b281a5fed40d09c63e5b07a0a5cea657ec78832d3933ccf9890b950f5fec93",
      "docs/entity-relationship.md":
        "cf0040384a7c040b91689dcf3f445fbd6dfe345e86e639eb5139d4e231ecf083",
      "docs/permission-matrix.md":
        "07ae5eb5b0cde01b8dc833f2abc33e7346588eaa58b7b3c6fdd74bd16cbb66e5",
      "docs/application.md":
        "e5ca80e575c382ab9b3360d71ea26e967e767f857b1529541fba1fce6c8d4fa5",
      "web/Dockerfile":
        "98b6a4233a02d430750ad058ddaa88394ce4f109c26906a4045ab6cf49d0b7d0",
      "web/.dockerignore":
        "b48855493dc2f402291313f76096909a8962ed4ca1350956138259e071fce13d",
      "docker-compose.yml":
        "57ef33d55df784dc389504077cb27bd31d01eb2a5c0f04a3a10e4f56b87b7d84",
      "README.md":
        "33078727a014fad97c1a16c3f45f375124df22b3fb4585d80be33833370dc08a",
    },
    manifest: [
      {
        path: "package.json",
        bytes: 254,
        sha256:
          "bd3550e18349acfd856e6c8f234a320c2885766d2c919b213c9e683ab0071adf",
      },
      {
        path: "pnpm-workspace.yaml",
        bytes: 39,
        sha256:
          "f0473b2f758a8a4f74f6d1eca80f35fe546a0e6ed9af0f41fbc276e7dafa51c2",
      },
      {
        path: "capability-lock.json",
        bytes: 1855,
        sha256:
          "b17d73fda7a44ae386c6cb74f4f12969267d46093be2622521666f5d5ae3c2e4",
      },
      {
        path: "composition-lock.json",
        bytes: 4450,
        sha256:
          "dd09231f2d73302dcc2e1c507a475dc7e73980558c56e83002df052f9152f143",
      },
      {
        path: "capability-template-lock.json",
        bytes: 2167,
        sha256:
          "56ddda58f2ae910e56fcaa56da5957e1abfdccee71c02a3fb7bc2e5c83dffbee",
      },
      {
        path: "simulator/index.html",
        bytes: 5001,
        sha256:
          "8a2b2eb89d61071b01a0b2199f0e0cb47b4509031f8319a48425f823df9921ea",
      },
      {
        path: "web/package.json",
        bytes: 385,
        sha256:
          "c13604a1355604db3a1ae2d55a8ed1b4963e2a2be5a558748091ee50b56d13ea",
      },
      {
        path: "web/tsconfig.json",
        bytes: 612,
        sha256:
          "2e5e91cdf839359ad69bab84cbfea405bc70b5243251a8e5ce33b8d0b070ed6a",
      },
      {
        path: "web/next-env.d.ts",
        bytes: 126,
        sha256:
          "bc460da01d99074c5173c5e2943bb6f39a7537533c28b837571ccf8bda616ccf",
      },
      {
        path: "web/app/layout.tsx",
        bytes: 257,
        sha256:
          "cdfcf676441f17402f7fef805ea3ca987bb242b0a57dcefda030a5bc78368ee5",
      },
      {
        path: "web/app/page-runtime.tsx",
        bytes: 33547,
        sha256:
          "28c6d4cf8564ae9ea420712c5d2f46050e337f7d5793f4928dd20441c7da8ad3",
      },
      {
        path: "web/app/page.tsx",
        bytes: 157,
        sha256:
          "25cdd881f063770b2931e20ad68d5aec072cadad43f92d4b8b8a7003227a6d65",
      },
      {
        path: "web/app/[...path]/page.tsx",
        bytes: 362,
        sha256:
          "511cdd8e42c187897360be87b6835a09f7ed2bcc0819e8781ab798f340ebecdb",
      },
      {
        path: "web/app/favicon.ico/route.ts",
        bytes: 349,
        sha256:
          "3011528d42efd01c9c7605520699b67a4cb8908697257e81b11503fffd4c8e76",
      },
      {
        path: "web/app/api/[...path]/route.ts",
        bytes: 1043,
        sha256:
          "4d29a822fa47f5fd28a708fd2300d9e9bb8bb7ed7e93d7c9b9dc521171ef5d93",
      },
      {
        path: "web/app/globals.css",
        bytes: 12426,
        sha256:
          "c7a735c7a208480e24a8ff41b8b139e740826f147cbbd406ff547c14422ea2ca",
      },
      {
        path: "api/package.json",
        bytes: 694,
        sha256:
          "f758b1daaecedeab6f65f4f251d03f2fd8147de1f2b8a86747e116a0fb5d068e",
      },
      {
        path: "api/tsconfig.json",
        bytes: 267,
        sha256:
          "ba06ca0caffb054b4c1128d1a43e9ba8d40d97993b41e6fe621dd4cfc19b1f70",
      },
      {
        path: "api/Dockerfile",
        bytes: 296,
        sha256:
          "620b0eed690c3df5de947bd580a2bf99255cc22409c8a834ff4e5c831dc340bb",
      },
      {
        path: "api/.dockerignore",
        bytes: 23,
        sha256:
          "51b683467baace87247effed923b8aaecc559168ba0efbb43fd4714a8dc19362",
      },
      {
        path: "api/src/main.ts",
        bytes: 7989,
        sha256:
          "16d613de8f31602803e01aa7c47db625b435d4d61c202b4941401dc09833ec68",
      },
      {
        path: "api/src/capabilities/contract.ts",
        bytes: 6358,
        sha256:
          "b13c886fc22acbcc4f3d9754867525e31b12f6dfb3d964bea0daf17ad2f2a64c",
      },
      {
        path: "api/src/capabilities/core.audit.ts",
        bytes: 562,
        sha256:
          "58cdb13aaf83d4509c02abd58099f0fe2b0ebc24f56a2c17ab22f731bdb2c6e1",
      },
      {
        path: "api/src/capabilities/core.crud.ts",
        bytes: 466,
        sha256:
          "c6d785113d4ed64cb1a6bff0843971015009eea17be68c665fcb7761d38896de",
      },
      {
        path: "api/src/capabilities/core.identity-policy.ts",
        bytes: 2064,
        sha256:
          "5c778bf8aab50ed0c47ad339b8222ef0b71d246d1546bcd93e10a646aeb90c0d",
      },
      {
        path: "api/src/capabilities/core.notification.ts",
        bytes: 622,
        sha256:
          "82de28c39579ae18e1f048f784022569f0078126c737d4b2773ffd6cace79f2c",
      },
      {
        path: "api/src/capabilities/core.policy-declarations.ts",
        bytes: 247,
        sha256:
          "6109cd260a7d6b8a638b85d0699c363363a8f96931243bfde02d7a395c283b66",
      },
      {
        path: "api/src/capabilities/core.workflow.ts",
        bytes: 445,
        sha256:
          "b9b582c92e535e5df9c4f28661742d554996a5691109c5141923a2746ae6b287",
      },
      {
        path: "database/prisma/fragments/service.prisma",
        bytes: 51,
        sha256:
          "7259667a1bd8e61e7f579ad284f52f8df2cb0a298b3b2354582f507470482de6",
      },
      {
        path: "web/src/app/service-list/page.tsx",
        bytes: 161,
        sha256:
          "6e38cc502971d9995f242bab8289950be34a764f0388c3e163bd9fccc65cc8ea",
      },
      {
        path: "api/policy/fragments/resource-action.conf",
        bytes: 236,
        sha256:
          "05c687edf087fa7d2c91b4f1e2cebb2fd0d8c543234017ee735bc28f7cd67bae",
      },
      {
        path: "api/policy/fragments/identity-policy.conf",
        bytes: 156,
        sha256:
          "e540e98476f8e7f35470f55c1d2fa6cc14cf82d163ade6f52c4881c53361cfa6",
      },
      {
        path: "api/src/services/identity-policy-local.service.ts",
        bytes: 233,
        sha256:
          "78f1efa203be875253f6bfad0fce150ba88aff5a0e003a8accd630c453039bc7",
      },
      {
        path: "api/test/fixtures/identity-policy.json",
        bytes: 254,
        sha256:
          "6c61ba129df9ab99afa28a6ef49d43678277a991176d9b7ea77b8529d96126be",
      },
      {
        path: "api/src/capabilities/registry.ts",
        bytes: 4047,
        sha256:
          "3eb1e2e47663b179f6fc54bf9182afd4aa295c54e51ba60e1186afe8b3f0dd05",
      },
      {
        path: "api/src/application-runtime.ts",
        bytes: 21713,
        sha256:
          "abf8b588a1060be45f81a85321ede57888ffb0f8b5f8152b80de60278cd7b5dc",
      },
      {
        path: "api/src/prisma-record-store.ts",
        bytes: 7795,
        sha256:
          "36f8921d25d8c4b40ed6bc4626691a5baf56a6076584017c572e81f519082a6b",
      },
      {
        path: "api/src/notification-outbox-worker.ts",
        bytes: 2122,
        sha256:
          "02989ed0a878af1daf8cbc968ff1e0e0746f660258c95e6bc215eae4b4818e6f",
      },
      {
        path: "api/src/notification-outbox-drain.ts",
        bytes: 975,
        sha256:
          "439d0bb92af9bbee554c4f14653b7a4686108cf1f9b4af34a24be1145269306a",
      },
      {
        path: "api/README.md",
        bytes: 368,
        sha256:
          "c909240a419da5fd9eeb8bdf49f0287c604b6e694d2b6d6e18922a37d9b4075b",
      },
      {
        path: "api/policy/model.conf",
        bytes: 195,
        sha256:
          "10f281d006f6e3b3210e56fa0ffc1771993156fdc5e131f8bdc975b03ef0ef26",
      },
      {
        path: "api/policy/policy.csv",
        bytes: 1134,
        sha256:
          "c3d7f1ca6f6f17a0e0ec3d280eeae5e0e886ff6ba23527f361c05881801a9836",
      },
      {
        path: "api/src/policy.ts",
        bytes: 1869,
        sha256:
          "2881fd871dacb2018fe92ce439ecf16ffc7b097f92bf5ac6d4373b64cd3a9347",
      },
      {
        path: "database/prisma/schema.prisma",
        bytes: 2515,
        sha256:
          "2f1d2477f149ab8fa6942440d937c0e531c79636eeb064a008faa2611710d43e",
      },
      {
        path: "api/prisma/schema.prisma",
        bytes: 2515,
        sha256:
          "2f1d2477f149ab8fa6942440d937c0e531c79636eeb064a008faa2611710d43e",
      },
      {
        path: "database/prisma/migrations/0001_initial/migration.sql",
        bytes: 3593,
        sha256:
          "c09feaa7fcfb0d4f6b51fe31c8fa6f266cec2f06bc67503fbd5ce57adfecde33",
      },
      {
        path: "database/prisma/seed.ts",
        bytes: 1336,
        sha256:
          "b3badccde25f02555d0779bc5d7dda53df883841fa4ebf6d86ffd0d765db9c73",
      },
      {
        path: "database/package.json",
        bytes: 380,
        sha256:
          "e1637d8e1356472a6f331b35110004f8b7e82209a03e05b4b16a293dd4ae7dc0",
      },
      {
        path: "database/Dockerfile",
        bytes: 319,
        sha256:
          "3226c780acb59a88e1ace066c2639fdaedf394b409d561b7f0496de6aefd9f27",
      },
      {
        path: "database/.dockerignore",
        bytes: 18,
        sha256:
          "1d1e0e64dd7d274f2bff103d50536f8d98d5705fc1bc51ebd7447dd06827864e",
      },
      {
        path: "api/src/flows/definitions.ts",
        bytes: 853,
        sha256:
          "d8fab6ff1f320d80a86fa36c8be6c6c4f71e4ff54692c31a663b2c955e837577",
      },
      {
        path: "api/src/flows/machines.ts",
        bytes: 561,
        sha256:
          "86f9aaef38d6e150e3e9299209e6c8e48c22b3b65529013578ee624d88ec81e5",
      },
      {
        path: "api/test/journey.generated.test.ts",
        bytes: 1242,
        sha256:
          "94762de2c32cc64e9dfe8dcb771bbb1f35c22b9dc620e08135b4cf5f888a0ef7",
      },
      {
        path: "tests/journeys.generated.md",
        bytes: 106,
        sha256:
          "534bb4fef0d2824a3d9c1002981b50699fdd52bae9920f5a752ca1330e660f4c",
      },
      {
        path: "docs/api-reference.md",
        bytes: 1259,
        sha256:
          "e8b281a5fed40d09c63e5b07a0a5cea657ec78832d3933ccf9890b950f5fec93",
      },
      {
        path: "docs/entity-relationship.md",
        bytes: 1143,
        sha256:
          "cf0040384a7c040b91689dcf3f445fbd6dfe345e86e639eb5139d4e231ecf083",
      },
      {
        path: "docs/permission-matrix.md",
        bytes: 919,
        sha256:
          "07ae5eb5b0cde01b8dc833f2abc33e7346588eaa58b7b3c6fdd74bd16cbb66e5",
      },
      {
        path: "docs/application.md",
        bytes: 533,
        sha256:
          "e5ca80e575c382ab9b3360d71ea26e967e767f857b1529541fba1fce6c8d4fa5",
      },
      {
        path: "web/Dockerfile",
        bytes: 186,
        sha256:
          "98b6a4233a02d430750ad058ddaa88394ce4f109c26906a4045ab6cf49d0b7d0",
      },
      {
        path: "web/.dockerignore",
        bytes: 24,
        sha256:
          "b48855493dc2f402291313f76096909a8962ed4ca1350956138259e071fce13d",
      },
      {
        path: "docker-compose.yml",
        bytes: 1102,
        sha256:
          "57ef33d55df784dc389504077cb27bd31d01eb2a5c0f04a3a10e4f56b87b7d84",
      },
      {
        path: "README.md",
        bytes: 847,
        sha256:
          "33078727a014fad97c1a16c3f45f375124df22b3fb4585d80be33833370dc08a",
      },
    ],
    manifestHash:
      "c96ec5e61fdc8c2b5a4163c429fa4dfea8c13a2964e607561439f2b8eb5e2888",
    bundleHash:
      "cd1c3e4693bb6f3056ca667f17985f5fcefbe07c8d4dffd1ad151edc4819ce18",
  },
} as const;
