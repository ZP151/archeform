export interface PreviewCleanupIdentity {
  readonly previewRunId: string;
  readonly composeProjectName: string;
}

export async function cleanRequestedPreview(input: {
  readonly knownIdentity: PreviewCleanupIdentity | null;
  readonly recoverIdentity: () => Promise<PreviewCleanupIdentity>;
  readonly stopViaUi: () => Promise<void>;
  readonly stopViaApi: (previewRunId: string) => Promise<void>;
  readonly assertAbsent: (identity: PreviewCleanupIdentity) => Promise<void>;
}): Promise<void> {
  let identity = input.knownIdentity;
  const errors: unknown[] = [];
  try {
    await input.stopViaUi();
  } catch (error) {
    errors.push(error);
  } finally {
    try {
      identity ??= await input.recoverIdentity();
    } catch (error) {
      errors.push(error);
    }
    if (identity !== null) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          await input.stopViaApi(identity.previewRunId);
          break;
        } catch (error) {
          errors.push(error);
        }
      }
      try {
        await input.assertAbsent(identity);
        return;
      } catch (error) {
        errors.push(error);
      }
    }
  }
  throw new AggregateError(errors, "Preview cleanup failed.");
}
