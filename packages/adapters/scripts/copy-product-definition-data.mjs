import { copyFileSync, mkdirSync } from "node:fs";

// One reviewed file, fixed source and adjacent emitted destination. No discovery.
mkdirSync(new URL("../dist/requirements/definitions/", import.meta.url), {
  recursive: true,
});
copyFileSync(
  new URL(
    "../src/requirements/definitions/product-definitions.v1.json",
    import.meta.url,
  ),
  new URL(
    "../dist/requirements/definitions/product-definitions.v1.json",
    import.meta.url,
  ),
);
