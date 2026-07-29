"use client";

import { useEffect, useMemo, useReducer } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Check,
  CircleDot,
  LockKeyhole,
  Moon,
  ScrollText,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import {
  getProfileComposition,
  type FactoryProfile,
} from "@factory/capabilities";

import {
  createGuidedApplicationDraft,
  guidedProfileSummary,
  type GuidedApplicationInput,
} from "../lib/guided-application";
import {
  initialGuidedCreationState,
  transitionGuidedCreation,
} from "../lib/guided-creation-model";
import { profileStarterOptions } from "../lib/profile-starters";

type Props = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onCreate: (input: GuidedApplicationInput) => Promise<void>;
};

const stages = [
  { id: "template", label: "Outcome" },
  { id: "capabilities", label: "Capabilities" },
  { id: "details", label: "Details" },
  { id: "review", label: "Review" },
] as const;

function profileIcon(profile: FactoryProfile): string {
  if (profile === "expense-approval") return "Approval";
  if (profile === "restaurant-ordering") return "Ordering";
  return "Commerce";
}

function capabilityIcon(key: string) {
  if (key === "core.audit") return <ScrollText size={16} />;
  if (key === "core.notification") return <BellRing size={16} />;
  return <CircleDot size={16} />;
}

export function GuidedCreationDrawer({ open, onClose, onCreate }: Props) {
  const [state, dispatch] = useReducer(
    transitionGuidedCreation,
    initialGuidedCreationState,
  );

  useEffect(() => {
    if (open) dispatch({ type: "open" });
  }, [open]);

  const selectedStarter = useMemo(
    () =>
      profileStarterOptions.find(
        (option) => option.profile === state.input.profile,
      ) ?? null,
    [state.input.profile],
  );
  const composition = useMemo(
    () =>
      state.input.profile ? getProfileComposition(state.input.profile) : null,
    [state.input.profile],
  );
  const summary = useMemo(() => {
    if (!state.input.profile || !state.input.name.trim()) return null;
    try {
      return guidedProfileSummary(
        createGuidedApplicationDraft(
          {
            profile: state.input.profile,
            name: state.input.name,
            theme: state.input.theme,
            optionalCapabilities: state.input.optionalCapabilities,
          },
          "preview",
        ),
      );
    } catch {
      return null;
    }
  }, [state.input]);

  if (!open) return null;

  const close = () => {
    dispatch({ type: "close" });
    onClose();
  };

  const create = () => {
    if (!state.input.profile) return;
    dispatch({ type: "create" });
    void onCreate({
      profile: state.input.profile,
      name: state.input.name,
      theme: state.input.theme,
      optionalCapabilities: state.input.optionalCapabilities,
    })
      .then(() => {
        dispatch({ type: "create-succeeded" });
        onClose();
      })
      .catch((error) => {
        dispatch({
          type: "create-failed",
          message:
            error instanceof Error
              ? error.message
              : "The application Draft could not be created.",
        });
      });
  };

  const stageIndex = stages.findIndex((stage) => stage.id === state.stage);

  return (
    <div
      className="guided-creation-layer"
      aria-label="Create application left-side drawer"
      role="dialog"
      aria-modal="true"
    >
      <button
        className="guided-creation-scrim"
        aria-label="Close application creation"
        onClick={close}
        type="button"
      />
      <aside className="guided-creation-drawer">
        <header className="guided-creation-header">
          <div>
            <span className="guided-creation-kicker">
              <Sparkles size={13} /> New application
            </span>
            <h2>Create application</h2>
          </div>
          <button
            aria-label="Close application creation"
            className="guided-icon-button"
            onClick={close}
            type="button"
          >
            <X size={18} />
          </button>
        </header>

        <ol className="guided-steps" aria-label="Application creation steps">
          {stages.map(({ id, label }, index) => {
            const active = stageIndex === index;
            const complete = stageIndex > index;
            return (
              <li
                className={active ? "is-active" : complete ? "is-complete" : ""}
                key={id}
              >
                <span>
                  {complete ? <Check size={12} /> : "0" + (index + 1)}
                </span>
                {label}
              </li>
            );
          })}
        </ol>

        <div className="guided-creation-content">
          {state.stage === "template" && (
            <section aria-labelledby="guided-outcome-heading">
              <p className="guided-section-label">Start with an outcome</p>
              <h3 id="guided-outcome-heading">What are you creating?</h3>
              <p className="guided-copy">
                Begin with a proven application shape, then make it your own.
              </p>
              <div className="guided-template-list">
                {profileStarterOptions.map((option) => (
                  <button
                    className={
                      state.input.profile === option.profile
                        ? "guided-template-card is-selected"
                        : "guided-template-card"
                    }
                    data-testid={"guided-template-" + option.profile}
                    key={option.profile}
                    onClick={() =>
                      dispatch({
                        type: "select-profile",
                        profile: option.profile,
                      })
                    }
                    type="button"
                  >
                    <span className="guided-template-icon">
                      <CircleDot size={16} />
                    </span>
                    <span>
                      <strong>{option.label}</strong>
                      <small>{profileIcon(option.profile)}</small>
                      <em>{option.description}</em>
                    </span>
                    {state.input.profile === option.profile && (
                      <Check className="guided-template-check" size={16} />
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {state.stage === "capabilities" && composition && (
            <section aria-labelledby="guided-capabilities-heading">
              <p className="guided-section-label">Verified building blocks</p>
              <h3 id="guided-capabilities-heading">Keep only what you need</h3>
              <p className="guided-copy">
                These options change the initial Graph. You can refine every
                declared surface after the Draft is created.
              </p>
              <div className="guided-capability-list">
                {composition.optionalCapabilities.map((capability) => {
                  const selected = state.input.optionalCapabilities.includes(
                    capability.key as "core.audit" | "core.notification",
                  );
                  return (
                    <button
                      aria-pressed={selected}
                      className={
                        selected
                          ? "guided-capability-row is-selected"
                          : "guided-capability-row"
                      }
                      data-testid={"guided-capability-" + capability.key}
                      key={capability.key}
                      onClick={() =>
                        dispatch({
                          type: "toggle-optional-capability",
                          capability: capability.key as
                            "core.audit" | "core.notification",
                        })
                      }
                      type="button"
                    >
                      <span className="guided-capability-icon">
                        {capabilityIcon(capability.key)}
                      </span>
                      <span className="guided-capability-copy">
                        <strong>{capability.name}</strong>
                        <small>{capability.description}</small>
                      </span>
                      <span className="guided-capability-state">
                        {selected ? <Check size={14} /> : <span />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="guided-required-capabilities">
                <span>Included with this outcome</span>
                {composition.requiredCapabilities.map((capability) => (
                  <p key={capability.key}>
                    <LockKeyhole size={12} /> {capability.name}
                  </p>
                ))}
              </div>
            </section>
          )}

          {state.stage === "details" && (
            <section aria-labelledby="guided-details-heading">
              <p className="guided-section-label">Make it yours</p>
              <h3 id="guided-details-heading">Name the application</h3>
              <p className="guided-copy">
                You can change pages, records, policies, and flows after this
                Draft is created.
              </p>
              <label className="guided-field">
                <span>Application name</span>
                <input
                  aria-label="Application name"
                  autoFocus
                  maxLength={160}
                  onChange={(event) =>
                    dispatch({ type: "set-name", name: event.target.value })
                  }
                  placeholder="For example, Travel approvals"
                  value={state.input.name}
                />
              </label>
              <fieldset className="guided-theme-picker">
                <legend>Generated application mode</legend>
                <button
                  aria-pressed={state.input.theme === "light"}
                  className={state.input.theme === "light" ? "is-selected" : ""}
                  onClick={() =>
                    dispatch({ type: "set-theme", theme: "light" })
                  }
                  type="button"
                >
                  <Sun size={16} /> Light
                </button>
                <button
                  aria-pressed={state.input.theme === "dark"}
                  className={state.input.theme === "dark" ? "is-selected" : ""}
                  onClick={() => dispatch({ type: "set-theme", theme: "dark" })}
                  type="button"
                >
                  <Moon size={16} /> Dark
                </button>
              </fieldset>
            </section>
          )}

          {state.stage === "review" &&
            selectedStarter &&
            summary &&
            composition && (
              <section aria-labelledby="guided-review-heading">
                <p className="guided-section-label">Draft review</p>
                <h3 id="guided-review-heading">Ready to shape</h3>
                <p className="guided-copy">
                  Factory will create a mutable Draft. Nothing is published or
                  compiled until you decide.
                </p>
                <div className="guided-review-title">
                  <span className="guided-template-icon">
                    <Sparkles size={16} />
                  </span>
                  <div>
                    <strong>{state.input.name.trim()}</strong>
                    <small>{selectedStarter.label}</small>
                  </div>
                </div>
                <dl className="guided-summary">
                  <div>
                    <dt>Pages</dt>
                    <dd>{summary.pages}</dd>
                  </div>
                  <div>
                    <dt>Records</dt>
                    <dd>{summary.entities}</dd>
                  </div>
                  <div>
                    <dt>Roles</dt>
                    <dd>{summary.roles}</dd>
                  </div>
                  <div>
                    <dt>Flows</dt>
                    <dd>{summary.flows}</dd>
                  </div>
                </dl>
                <div className="guided-review-capabilities">
                  <span>Selected capabilities</span>
                  <div>
                    {[
                      ...composition.requiredCapabilities,
                      ...composition.optionalCapabilities.filter((capability) =>
                        state.input.optionalCapabilities.includes(
                          capability.key as "core.audit" | "core.notification",
                        ),
                      ),
                    ].map((capability) => (
                      <em key={capability.key}>{capability.name}</em>
                    ))}
                  </div>
                </div>
                <p className="guided-boundary">
                  <span /> Draft only · {state.input.theme} mode
                </p>
              </section>
            )}
        </div>

        {state.error && (
          <p className="guided-creation-error" role="alert">
            {state.error}
          </p>
        )}

        <footer className="guided-creation-footer">
          {state.stage !== "template" ? (
            <button
              className="guided-secondary-button"
              disabled={state.creating}
              onClick={() => dispatch({ type: "back" })}
              type="button"
            >
              <ArrowLeft size={15} /> Back
            </button>
          ) : (
            <span />
          )}
          {state.stage === "review" ? (
            <button
              className="guided-primary-button"
              data-testid="guided-create"
              disabled={state.creating}
              onClick={create}
              type="button"
            >
              {state.creating ? "Creating Draft…" : "Create Draft"}{" "}
              {!state.creating && <Check size={15} />}
            </button>
          ) : (
            <button
              className="guided-primary-button"
              onClick={() => dispatch({ type: "next" })}
              type="button"
            >
              Continue <ArrowRight size={15} />
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}
