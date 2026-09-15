import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// Published package assets, not user-selected paths. See THIRD_PARTY_NOTICES.md.
const sourceHashes = Object.freeze({
  house: "2c13f570d9b9727c9b6c23400c95acfa9737e91884ed926332edb18fd47a2a76",
  "utensils-crossed":
    "38477d82cec9fd3065e8ddeb08a3b6c0d9bb58355e6ac13403e6a0b2d738ccdd",
  "shopping-bag":
    "65c8153cf4b231dcc9b03187c87fa27cc811c049c6dba5db7b88b7e2cd33f1c2",
  "receipt-text":
    "f3ef8667b07dcb9ba0b9daf154376fdb9234cc858ee91fd7016d83d089340a2b",
  "user-round":
    "d7390d374551a27503c64a6c4232753f0f5ad5dc03aefa760b52c9347e5474c3",
  "refresh-cw":
    "d63b359b0fe05e03cff8aaa7acf82f9569733e83f7fb4742d583a086972c4bb0",
  "arrow-right":
    "12b97a4d2821da556ce7df95f89df46deb94aa711d46b36a848be0de0ac2a7f0",
  "arrow-left":
    "e31ed0af85ffbed2b54f78f37af197c3b84b24e776cba1d27613d6a9ad555a16",
  "chef-hat":
    "637f9b37999f919ca36e83595ec93d48c2ecb7acb9ea26918001a756ef178ddb",
  "circle-check":
    "d48c0901de2262e9f7c0566b5ad3893eafeab509715be6ac4e3b449f15d9260b",
  "circle-x":
    "b3da7693d11354983042fbfe8be785e9757a656805a629facbb98b737f97ea8d",
  clock: "4bd6906a9b756dea41ff62ed88b594ce9a231c19f1a06522571457b6e4d774e6",
  "circle-help":
    "e2522d899494d7fbd9d1da86175ba3f17a1516a5e8a9aac90517f497884c8b29",
});
type CustomerIconKey = keyof typeof sourceHashes;
type IconAssets = Readonly<{
  icons: Readonly<Record<CustomerIconKey, string>>;
  notice: string;
}>;
let assets: IconAssets | undefined;

export function getCustomerIconAssets(): IconAssets {
  if (assets) return assets;
  const root = dirname(
    createRequire(import.meta.url).resolve("lucide-static/package.json"),
  );
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  if (
    manifest.version !== "0.468.0" ||
    Object.keys(manifest.dependencies ?? {}).length !== 0
  )
    throw new Error("Unexpected customer icon package coordinate.");
  const readPinned = (path: string, hash: string): string => {
    const source = readFileSync(join(root, path), "utf8");
    if (createHash("sha256").update(source).digest("hex") !== hash)
      throw new Error("Customer icon package asset integrity mismatch.");
    return source;
  };
  const license = readPinned(
    "LICENSE",
    "1e7290b35280a048667bbf0ebabac1c7fd52a75300e8b2946ac165715997f2bc",
  );
  const icons = Object.fromEntries(
    Object.entries(sourceHashes).map(([key, hash]) => [
      key,
      readPinned(`icons/${key}.svg`, hash).replace(
        "<svg",
        '<svg aria-hidden="true" focusable="false"',
      ),
    ]),
  ) as Record<CustomerIconKey, string>;
  assets = Object.freeze({
    icons: Object.freeze(icons),
    notice:
      "# Third-party notices\n\n## lucide-static 0.468.0\n\nSource: https://github.com/lucide-icons/lucide\n\nSelected SVG assets are embedded with decorative accessibility attributes.\n\n" +
      license,
  });
  return assets;
}

export function getCustomerIcon(key: CustomerIconKey): string {
  if (!Object.hasOwn(sourceHashes, key))
    throw new Error("Unknown customer icon.");
  return getCustomerIconAssets().icons[key];
}
