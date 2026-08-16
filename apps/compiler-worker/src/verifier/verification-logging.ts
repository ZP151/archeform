import { boundedFailureMessage } from "../diagnostics.js";
import type { executeCompilation } from "../compilation-executor.js";
import type { startPreviewRun, stopPreviewRun } from "../preview-runner.js";

type VerificationLogger = {
  readonly info: (message: string) => void;
  readonly error: (message: string) => void;
};

type VerificationOperations = {
  readonly executeCompilation: typeof executeCompilation;
  readonly startPreviewRun: typeof startPreviewRun;
  readonly stopPreviewRun: typeof stopPreviewRun;
};

type LoggedVerificationOperationsOptions = VerificationOperations & {
  readonly jobId: string | undefined;
  readonly logger: VerificationLogger;
};

export function createLoggedVerificationOperations({
  jobId,
  executeCompilation: compile,
  startPreviewRun: start,
  stopPreviewRun: stop,
  logger,
}: LoggedVerificationOperationsOptions): VerificationOperations {
  return {
    async executeCompilation(artifactRoot, input) {
      logger.info(
        `Factory verification job ${jobId}: compiling the immutable input`,
      );
      try {
        const result = await compile(artifactRoot, input);
        logger.info(`Factory verification job ${jobId}: compilation finished`);
        return result;
      } catch (error) {
        logger.error(
          `Factory verification job ${jobId}: compilation failed (${boundedFailureMessage(error)})`,
        );
        throw error;
      }
    },
    async startPreviewRun(artifactRoot, request, processRunner, options) {
      logger.info(
        `Factory verification job ${jobId}: booting the isolated preview`,
      );
      try {
        const result = await start(
          artifactRoot,
          request,
          processRunner,
          options,
        );
        logger.info(`Factory verification job ${jobId}: preview boot finished`);
        return result;
      } catch (error) {
        logger.error(
          `Factory verification job ${jobId}: preview boot failed (${boundedFailureMessage(error)})`,
        );
        throw error;
      }
    },
    async stopPreviewRun(artifactRoot, request, processRunner, options) {
      logger.info(`Factory verification job ${jobId}: stopping the preview`);
      try {
        await stop(artifactRoot, request, processRunner, options);
        logger.info(`Factory verification job ${jobId}: preview stopped`);
      } catch (error) {
        logger.error(
          `Factory verification job ${jobId}: preview stop failed (${boundedFailureMessage(error)})`,
        );
        throw error;
      }
    },
  };
}
