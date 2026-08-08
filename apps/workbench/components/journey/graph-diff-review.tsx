import { CheckCircle2 } from "lucide-react";

/**
 * The Diff review step: the accepted plan decision binds the re-derived
 * composition Diff checksum, and applying it is the single primary action
 * that turns the blank Draft into the composed product Graph.
 */

export interface GraphDiffReviewProps {
  readonly diffChecksum: string;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onApply: () => void;
}

export function GraphDiffReview({
  diffChecksum,
  busy,
  error,
  onApply,
}: GraphDiffReviewProps) {
  return (
    <section aria-label="Review the approved plan Diff">
      <h3>Plan Diff accepted</h3>
      <p>
        The approved composition Diff will be applied to the blank Draft as a
        new revision. The Diff is bound to the accepted decision by its
        checksum.
      </p>
      <code className="diff-checksum">{diffChecksum}</code>
      {error !== null && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}
      <button
        type="button"
        className="primary-action"
        disabled={busy}
        onClick={onApply}
      >
        <CheckCircle2 size={16} aria-hidden="true" />
        Apply to Draft
      </button>
    </section>
  );
}
