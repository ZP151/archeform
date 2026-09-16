import { z } from "zod";

export type NumericFieldType = "integer" | "decimal";

const numericBoundSchema = z
  .object({ value: z.number().finite(), inclusive: z.boolean() })
  .strict();

/** Only the new policy and bound objects are closed; enclosing V1 parsing is unchanged. */
export const numericFieldDomainSchema = z
  .object({
    apiVersion: z.literal("factory.numeric-field-domain/v1"),
    minimum: numericBoundSchema.optional(),
    maximum: numericBoundSchema.optional(),
  })
  .strict()
  .refine(
    (domain) => domain.minimum !== undefined || domain.maximum !== undefined,
    {
      message: "A numeric domain requires at least one bound.",
    },
  );

export type NumericFieldDomainV1 = z.infer<typeof numericFieldDomainSchema>;

const int32Minimum = -2147483648;
const int32Maximum = 2147483647;

function isInt32(value: number): boolean {
  return (
    Number.isInteger(value) && value >= int32Minimum && value <= int32Maximum
  );
}

/** Validates representation and mathematical nonemptiness, including integer discreteness. */
export function isNumericFieldDomainValidForType(
  domain: NumericFieldDomainV1,
  type: NumericFieldType,
): boolean {
  const parsed = numericFieldDomainSchema.safeParse(domain);
  if (!parsed.success || (type !== "integer" && type !== "decimal"))
    return false;
  const { minimum, maximum } = parsed.data;
  if (type === "integer") {
    if (
      (minimum && !isInt32(minimum.value)) ||
      (maximum && !isInt32(maximum.value))
    )
      return false;
    const first = minimum
      ? minimum.value + (minimum.inclusive ? 0 : 1)
      : int32Minimum;
    const last = maximum
      ? maximum.value - (maximum.inclusive ? 0 : 1)
      : int32Maximum;
    return first <= last;
  }
  if (!minimum || !maximum) return true;
  return (
    minimum.value < maximum.value ||
    (minimum.value === maximum.value && minimum.inclusive && maximum.inclusive)
  );
}

/** Untrusted values must be finite number primitives. No request or persisted-value coercion. */
export function isNumericFieldValueAllowed(
  value: unknown,
  type: NumericFieldType,
  domain: NumericFieldDomainV1,
): boolean {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (!isNumericFieldDomainValidForType(domain, type)) return false;
  if (type === "integer" && !isInt32(value)) return false;
  const { minimum, maximum } = domain;
  if (
    minimum &&
    (value < minimum.value || (value === minimum.value && !minimum.inclusive))
  )
    return false;
  if (
    maximum &&
    (value > maximum.value || (value === maximum.value && !maximum.inclusive))
  )
    return false;
  return true;
}
