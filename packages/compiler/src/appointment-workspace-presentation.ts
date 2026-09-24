import type { ApplicationGraphV1 } from "@factory/graph";
import type { AppointmentConsumerProfile } from "./appointment-consumer-contract.js";
import { createGeneratedPageRuntimeProjection } from "./page-runtime-projection.js";
import {
  approvalWorkspacePresentation,
  renderWorkspaceStyles,
} from "./approval-workspace-presentation.js";
import { getCustomerIconAssets } from "./targets/restaurant-v3/customer-icons.js";

export const appointmentWorkspacePresentation = {
  key: "appointment-workspace-presentation",
  version: "1.0.0",
  ownership: "factory-authored",
  license: "UNLICENSED",
  reuse: [
    ...approvalWorkspacePresentation.reuse,
    "native-date-input",
    "confirmation-state",
  ],
  semanticGap:
    "Named availability selection, server-clock recovery, saved appointment summaries and exact booking/setup intent recovery require an appointment-specific composition.",
  iconPackage: "lucide-static@0.468.0",
  iconLicense: "ISC",
  media:
    "No photographs or invented business records. Existing pinned clock, navigation and state icons carry useful meaning.",
} as const;

export function renderAppointmentWorkspace(
  graph: ApplicationGraphV1,
  profile: AppointmentConsumerProfile,
  fixture: boolean,
): string {
  const assets = getCustomerIconAssets();
  const safe = (value: unknown) =>
    JSON.stringify(value).replaceAll("<", "\\u003c");
  const config = {
    name: graph.metadata.name,
    theme: createGeneratedPageRuntimeProjection(graph).themeMode,
    storageKey: "appointment-role-" + graph.metadata.id,
    fields: profile.runtime.fields,
    entity: profile.runtime.appointmentEntity,
    serviceEntity: profile.runtime.serviceEntity,
    scheduleEntity: profile.runtime.scheduleEntity,
    serviceName: profile.serviceName,
    serviceDuration: profile.serviceDuration,
    routes: graph.page.pages.map((page) => page.route),
  };
  return String.raw`"use client";
// appointment-workspace-presentation@1.0.0 — factory-authored composition.
import { useEffect, useRef, useState } from "react";
const config = CONFIG_JSON;
const icons = ICONS_JSON;
type Row = { id: string; version?: number; [field: string]: unknown };
type Slot = {
  scheduleId: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  startUtc: string;
  endUtc: string;
  timezone: string;
};
type Summary = {
  serviceName: string;
  durationMinutes: number;
  slot: Pick<Slot, "scheduleId" | "serviceId" | "startUtc" | "endUtc" | "timezone">;
  source: "history" | "current-schedule";
};
type WindowRange = { from: string; to: string };
type Command = {
  url: string;
  method: string;
  body: string;
  key: string;
  role: string;
  operation: string;
};
const fields = config.fields;
class RequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}
function Icon({ name }: { name: keyof typeof icons }) {
  return (
    <span
      className="appointment-icon"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: icons[name] }}
    />
  );
}
function time(value: string, zone: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: zone,
  });
}
function day(value: string, zone = "UTC") {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: zone,
  });
}
function utcFormValue(value: unknown) {
  const text = String(value ?? "");
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z$/.test(text)
    ? text.slice(0, 16)
    : "";
}
function utcInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const result = value + ":00.000Z";
  return new Date(result).toISOString() === result ? result : null;
}
function serverDate(response: Response) {
  const value = response.headers.get("date");
  if (
    !value ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toUTCString() !== value
  )
    throw new RequestError(503, "clock");
  return new Date(value).toISOString();
}
function recordList(value: unknown): Row[] {
  if (!Array.isArray(value) || value.some((row) => !row || typeof row.id !== "string"))
    throw new RequestError(503, "read");
  return value;
}
function notice(error: unknown) {
  const code = error instanceof RequestError ? error.code : "";
  if (code === "clock")
    return "The server time could not be confirmed. Retry availability to choose a time.";
  if (code.includes("capacity"))
    return "That time is now full. Choose another available time.";
  if (code.includes("forbidden")) return "This demo role cannot make that change.";
  if (code.includes("conflict"))
    return "The details changed while you were working. Review the latest values before submitting again.";
  if (code.includes("not_found"))
    return "These details are no longer available. Refresh to choose again.";
  return "The request could not be completed. Your input is preserved; review it and try again.";
}
function Workspace({
  role,
  onBusy,
  roleControls,
}: {
  role: string;
  onBusy: (busy: boolean) => void;
  roleControls: React.ReactNode;
}) {
  const customer = role === "customer",
    staff = role === "staff",
    admin = role === "administrator",
    canChoose = customer || staff;
  const [tab, setTab] = useState<"book" | "appointments">(
    customer ? "book" : "appointments",
  );
  const [statusFilter, setStatusFilter] = useState("all"),
    [visibleLimit, setVisibleLimit] = useState(20);
  const [records, setRecords] = useState<Row[]>([]),
    [summaries, setSummaries] = useState<Record<string, Summary>>({}),
    [setupServices, setSetupServices] = useState<Row[]>([]),
    [setupSchedules, setSetupSchedules] = useState<Row[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]),
    [services, setServices] = useState<Record<string, string>>({}),
    [service, setService] = useState(""),
    [selected, setSelected] = useState("");
  const [name, setName] = useState(""),
    [notes, setNotes] = useState(""),
    [cursor, setCursor] = useState<number | null>(null),
    [windowLabel, setWindowLabel] = useState("Available times");
  const [loading, setLoading] = useState(false),
    [clockReady, setClockReady] = useState(false),
    [availabilityError, setAvailabilityError] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [pending, setPending] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [needsRefresh, setNeedsRefresh] = useState(false),
    [serviceName, setServiceName] = useState(""),
    [serviceDuration, setServiceDuration] = useState(""),
    [serviceActive, setServiceActive] = useState(true),
    [editingService, setEditingService] = useState<Row | null>(null),
    [scheduleService, setScheduleService] = useState(""),
    [scheduleStart, setScheduleStart] = useState(""),
    [scheduleEnd, setScheduleEnd] = useState(""),
    [scheduleTimezone, setScheduleTimezone] = useState("UTC"),
    [scheduleCapacity, setScheduleCapacity] = useState("1"),
    [scheduleStatus, setScheduleStatus] = useState<"open" | "closed">("open"),
    [editingSchedule, setEditingSchedule] = useState<Row | null>(null),
    [rescheduleTargets, setRescheduleTargets] = useState<Record<string, string>>({}),
    [cancelReasons, setCancelReasons] = useState<Record<string, string>>({}),
    [history, setHistory] = useState<
      Record<
        string,
        readonly { action: string; at: string; actorRole: string; toStatus: string }[]
      >
    >({});
  const alive = useRef(true),
    sequence = useRef(0),
    historyGeneration = useRef(0),
    historyRequests = useRef(new Map<string, number>()),
    inspectedHistory = useRef(new Set<string>()),
    currentSchedules = useRef<Row[]>([]),
    sending = useRef(false),
    windowRef = useRef<WindowRange | null>(null),
    intent = useRef<Command | null>(null);
  const locked = pending || uncertain || needsRefresh;
  function headers() {
    return { "content-type": "application/json", HEADER_CHANNEL };
  }
  async function request(url: string, options: RequestInit = {}) {
    let response: Response;
    try {
      response = await fetch(url, {
        cache: "no-store",
        ...options,
        headers: { ...headers(), ...options.headers },
      });
    } catch {
      throw new RequestError(503, "transport");
    }
    let value: unknown;
    try {
      value = await response.json();
    } catch {
      throw new RequestError(503, "response");
    }
    if (!response.ok)
      throw new RequestError(
        response.status,
        String((value as { code?: string })?.code ?? "request"),
      );
    return { response, value };
  }
  async function availability(
    range: WindowRange,
    offset: number,
    token: number,
    append = false,
  ) {
    const query = new URLSearchParams({ ...range, offset: String(offset) });
    const result = await request("/api/appointment-availability?" + query);
    serverDate(result.response);
    const data = result.value as {
      apiVersion: string;
      slots: Slot[];
      next: { offset: number } | null;
    };
    if (
      data?.apiVersion !== "factory.generated.appointment-availability/v1" ||
      !Array.isArray(data.slots) ||
      data.slots.length > 100 ||
      data.slots.some(
        (slot) =>
          !slot ||
          typeof slot.scheduleId !== "string" ||
          typeof slot.serviceName !== "string" ||
          !Number.isFinite(Date.parse(slot.startUtc)),
      ) ||
      !(
        data.next === null ||
        (Number.isInteger(data.next?.offset) && data.next.offset > offset)
      )
    )
      throw new RequestError(503, "read");
    if (!alive.current || token !== sequence.current) return;
    setSlots((previous) => [
      ...new Map(
        [...(append ? previous : []), ...data.slots].map((slot) => [
          slot.scheduleId,
          slot,
        ]),
      ).values(),
    ]);
    setServices((previous) => ({
      ...previous,
      ...Object.fromEntries(data.slots.map((slot) => [slot.serviceId, slot.serviceName])),
    }));
    setCursor(data.next?.offset ?? null);
    setAvailabilityError("");
    setClockReady(true);
    if (!append)
      setSelected((previous) => {
        if (previous && !data.slots.some((slot) => slot.scheduleId === previous)) {
          setMessage(
            "That time is no longer offered. Choose another time; your name and notes are kept.",
          );
          return "";
        }
        return previous;
      });
  }
  async function refresh(rangeOverride?: WindowRange) {
    const token = ++sequence.current;
    historyGeneration.current++;
    setHistory({});
    setLoading(true);
    setAvailabilityError("");
    try {
      const result = await request("/api/" + config.entity),
        rows = recordList(result.value);
      if (!alive.current || token !== sequence.current) return false;
      setRecords(rows);
      for (const row of rows
        .filter(
          (row) =>
            statusFilter === "all" || row[fields.appointmentStatus] === statusFilter,
        )
        .slice(0, visibleLimit)) {
        if (inspectedHistory.current.has(row.id)) void loadHistory(row);
      }
      if (admin) {
        const setup = await Promise.all([
          request("/api/" + config.serviceEntity),
          request("/api/" + config.scheduleEntity),
        ]);
        if (!alive.current || token !== sequence.current) return false;
        setSetupServices(recordList(setup[0].value));
        currentSchedules.current = recordList(setup[1].value);
        setSetupSchedules(currentSchedules.current);
      }
      if (canChoose) {
        const now = serverDate(result.response);
        const range = rangeOverride ??
          windowRef.current ?? {
            from: now,
            to: new Date(Date.parse(now) + 7 * 86400000).toISOString(),
          };
        windowRef.current = range;
        setWindowLabel(
          day(range.from) + " – " + day(new Date(Date.parse(range.to) - 1).toISOString()),
        );
        await availability(range, 0, token);
      }
      const details = await Promise.all(
        rows
          .filter(
            (row) =>
              statusFilter === "all" || row[fields.appointmentStatus] === statusFilter,
          )
          .slice(0, visibleLimit)
          .map(async (row) => {
            try {
              const result = await request(
                "/api/" +
                  config.entity +
                  "/" +
                  encodeURIComponent(row.id) +
                  "/appointment-summary",
              );
              const value = result.value as Summary & { apiVersion: string };
              if (
                value.apiVersion !== "factory.generated.appointment-summary/v1" ||
                !value.slot
              )
                throw new Error("summary");
              return [row.id, value] as const;
            } catch {
              return null;
            }
          }),
      );
      if (!alive.current || token !== sequence.current) return false;
      setSummaries(
        Object.fromEntries(
          details.filter((value): value is NonNullable<typeof value> => value !== null),
        ),
      );
      setNeedsRefresh(false);
      if (!intent.current) onBusy(false);
      return true;
    } catch (cause) {
      if (alive.current && token === sequence.current) {
        if (canChoose) {
          setAvailabilityError(notice(cause));
          setClockReady(false);
        } else setError(notice(cause));
      }
      return false;
    } finally {
      if (alive.current && token === sequence.current) setLoading(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => {
      alive.current = false;
      sequence.current++;
      historyGeneration.current++;
    };
  }, [statusFilter, visibleLimit]);
  async function more() {
    if (cursor === null || !windowRef.current || locked || loading || !clockReady) return;
    const token = ++sequence.current;
    setLoading(true);
    try {
      await availability(windowRef.current, cursor, token, true);
    } catch (cause) {
      if (alive.current) {
        setAvailabilityError(notice(cause));
        setClockReady(false);
      }
    } finally {
      if (alive.current) setLoading(false);
    }
  }
  function shiftWindow(direction: number) {
    if (!windowRef.current || locked || loading) return;
    const delta = direction * 7 * 86400000;
    const range = {
      from: new Date(Date.parse(windowRef.current.from) + delta).toISOString(),
      to: new Date(Date.parse(windowRef.current.to) + delta).toISOString(),
    };
    void refresh(range);
  }
  async function refreshSetupConflict(command: Command) {
    const parts = command.url.split("/").filter(Boolean),
      entity = parts[1],
      id = parts[2];
    if (!id || (entity !== config.serviceEntity && entity !== config.scheduleEntity)) {
      await refresh();
      return;
    }
    try {
      const current = recordList([
        (await request("/api/" + entity + "/" + encodeURIComponent(id))).value,
      ])[0]!;
      if (entity === config.serviceEntity) setEditingService(current);
      else setEditingSchedule(current);
      await refresh();
      setError(
        "Latest saved values are shown below. Your draft is kept in the form; review it and submit a deliberate new change.",
      );
    } catch (cause) {
      setError(
        "The details changed while you were working. Refresh the current values before submitting again.",
      );
    }
  }
  async function send(command: Command) {
    if (sending.current || command.role !== role) return;
    sending.current = true;
    setPending(true);
    setError("");
    onBusy(true);
    try {
      await request(command.url, {
        method: command.method,
        headers: { "x-factory-idempotency-key": command.key },
        body: command.body,
      });
      if (!alive.current) return;
      setUncertain(false);
      intent.current = null;
      setNeedsRefresh(true);
      setMessage(
        command.operation === "request" ? "Appointment requested." : "Changes saved.",
      );
      const ready = await refresh();
      if (ready && command.operation === "schedule" && command.method === "PATCH") {
        setEditingSchedule(
          (previous) =>
            currentSchedules.current.find((row) => row.id === previous?.id) ?? null,
        );
      }
      if (ready && command.operation === "request") {
        setName("");
        setNotes("");
        setSelected("");
      }
      if (!ready)
        setMessage("Saved. Refresh the current details before making another change.");
    } catch (cause) {
      if (!alive.current) return;
      if (!(cause instanceof RequestError) || cause.status >= 500) {
        setUncertain(true);
        setError(
          "The result is uncertain. Retry this same request to check its saved result.",
        );
      } else {
        intent.current = null;
        setUncertain(false);
        onBusy(false);
        if (
          cause.status === 409 &&
          (command.operation === "service" || command.operation === "schedule")
        )
          await refreshSetupConflict(command);
        else {
          setError(notice(cause));
          await refresh();
        }
      }
    } finally {
      sending.current = false;
      if (alive.current) setPending(false);
    }
  }
  function book(event: React.FormEvent) {
    event.preventDefault();
    if (locked || !clockReady || !selected || !name.trim()) return;
    const body = {
      values: {
        [fields.appointmentSchedule]: selected,
        [fields.appointmentCustomer]: name,
        ...(notes ? { [fields.appointmentNotes]: notes } : {}),
      },
    };
    const command: Command = {
      url: "/api/" + config.entity,
      method: "POST",
      body: JSON.stringify(body),
      key: crypto.randomUUID(),
      role,
      operation: "request",
    };
    intent.current = command;
    void send(command);
  }
  function appointmentAction(
    record: Row,
    operation: "confirm" | "reschedule" | "cancel",
    extra: Record<string, unknown> = {},
  ) {
    if (locked || !Number.isSafeInteger(record.version)) return;
    if (
      operation === "reschedule" &&
      (loading ||
        !clockReady ||
        !slots.some(
          (slot) =>
            slot.scheduleId === extra.scheduleId &&
            slot.scheduleId !== record[fields.appointmentSchedule],
        ))
    )
      return;
    const body = { expectedVersion: record.version, ...extra };
    const command: Command = {
      url:
        "/api/" +
        config.entity +
        "/" +
        encodeURIComponent(record.id) +
        "/events/" +
        operation,
      method: "POST",
      body: JSON.stringify(body),
      key: crypto.randomUUID(),
      role,
      operation,
    };
    intent.current = command;
    void send(command);
  }
  function createService(event: React.FormEvent) {
    event.preventDefault();
    const duration = Number(serviceDuration),
      name = serviceName.trim();
    if (locked || !name || !Number.isSafeInteger(duration) || duration < 1) {
      setError("Enter a service name and a positive whole-number duration.");
      return;
    }
    const values = {
        [config.serviceName]: name,
        [config.serviceDuration]: duration,
        [fields.serviceActive]: serviceActive,
      },
      expectedValues = editingService
        ? {
            [config.serviceName]: editingService[config.serviceName],
            [config.serviceDuration]: editingService[config.serviceDuration],
            [fields.serviceActive]: editingService[fields.serviceActive],
          }
        : null;
    const command: Command = expectedValues
      ? {
          url:
            "/api/" + config.serviceEntity + "/" + encodeURIComponent(editingService!.id),
          method: "PATCH",
          body: JSON.stringify({ expectedValues, values }),
          key: crypto.randomUUID(),
          role,
          operation: "service",
        }
      : {
          url: "/api/" + config.serviceEntity,
          method: "POST",
          body: JSON.stringify(values),
          key: crypto.randomUUID(),
          role,
          operation: "service",
        };
    intent.current = command;
    void send(command);
  }
  function createSchedule(event: React.FormEvent) {
    event.preventDefault();
    const capacity = Number(scheduleCapacity),
      enteredStart = utcInput(scheduleStart),
      enteredEnd = utcInput(scheduleEnd),
      sameStart =
        editingSchedule &&
        scheduleStart === utcFormValue(editingSchedule[fields.scheduleStart]),
      sameEnd =
        editingSchedule &&
        scheduleEnd === utcFormValue(editingSchedule[fields.scheduleEnd]),
      start = sameStart ? String(editingSchedule![fields.scheduleStart]) : enteredStart,
      end = sameEnd ? String(editingSchedule![fields.scheduleEnd]) : enteredEnd;
    if (
      locked ||
      !scheduleService ||
      !Number.isSafeInteger(capacity) ||
      capacity < 1 ||
      !start ||
      !end ||
      start >= end
    ) {
      setError("Choose a service, valid UTC time range, and positive capacity.");
      return;
    }
    const values = {
        [fields.scheduleService]: scheduleService,
        [fields.scheduleStart]: start,
        [fields.scheduleEnd]: end,
        [fields.scheduleTimezone]: scheduleTimezone,
        [fields.scheduleCapacity]: capacity,
        [fields.scheduleStatus]: scheduleStatus,
      },
      expectedValues = editingSchedule
        ? {
            [fields.scheduleService]: editingSchedule[fields.scheduleService],
            [fields.scheduleStart]: editingSchedule[fields.scheduleStart],
            [fields.scheduleEnd]: editingSchedule[fields.scheduleEnd],
            [fields.scheduleTimezone]: editingSchedule[fields.scheduleTimezone],
            [fields.scheduleCapacity]: editingSchedule[fields.scheduleCapacity],
            [fields.scheduleStatus]: editingSchedule[fields.scheduleStatus],
          }
        : null;
    const command: Command = expectedValues
      ? {
          url:
            "/api/" +
            config.scheduleEntity +
            "/" +
            encodeURIComponent(editingSchedule!.id),
          method: "PATCH",
          body: JSON.stringify({ expectedValues, values }),
          key: crypto.randomUUID(),
          role,
          operation: "schedule",
        }
      : {
          url: "/api/" + config.scheduleEntity,
          method: "POST",
          body: JSON.stringify(values),
          key: crypto.randomUUID(),
          role,
          operation: "schedule",
        };
    intent.current = command;
    void send(command);
  }
  async function loadHistory(record: Row) {
    inspectedHistory.current.add(record.id);
    const generation = historyGeneration.current;
    const token = (historyRequests.current.get(record.id) ?? 0) + 1;
    historyRequests.current.set(record.id, token);
    const current = () =>
      alive.current &&
      generation === historyGeneration.current &&
      token === historyRequests.current.get(record.id);
    try {
      const result = await request(
        "/api/" +
          config.entity +
          "/" +
          encodeURIComponent(record.id) +
          "/appointment-history",
      );
      const rows = result.value;
      if (!Array.isArray(rows)) throw new Error("history");
      if (!current()) return;
      setHistory((previous) => ({
        ...previous,
        [record.id]: rows as readonly {
          action: string;
          at: string;
          actorRole: string;
          toStatus: string;
        }[],
      }));
    } catch (cause) {
      if (current()) setError(notice(cause));
    }
  }
  const filteredRecords = records.filter(
    (record) =>
      statusFilter === "all" || record[fields.appointmentStatus] === statusFilter,
  );
  const visibleSlots = slots.filter((slot) => !service || slot.serviceId === service),
    chosen = slots.find((slot) => slot.scheduleId === selected);
  const windowControls = (
    <div className="appointment-window">
      <h2>{windowLabel}</h2>
      <div>
        <button
          className="appointment-icon-button"
          type="button"
          aria-label="Previous week"
          title="Previous week"
          disabled={locked || loading || !clockReady}
          onClick={() => shiftWindow(-1)}
        >
          <Icon name="arrow-left" />
        </button>
        <button
          className="appointment-icon-button"
          type="button"
          aria-label="Next week"
          title="Next week"
          disabled={locked || loading || !clockReady}
          onClick={() => shiftWindow(1)}
        >
          <Icon name="arrow-right" />
        </button>
      </div>
    </div>
  );
  const moreControls =
    cursor !== null ? (
      <button
        type="button"
        disabled={locked || loading || !clockReady}
        onClick={() => void more()}
      >
        More available times
      </button>
    ) : null;
  return (
    <main
      className="generated-app appointment-v1"
      data-theme={config.theme}
      data-role={role}
    >
      {roleControls}
      <aside className="appointment-workspace-sidebar">
        <div className="appointment-workspace-brand">
          <div className="appointment-workspace-mark">
            <Icon name="clock" />
          </div>
          <div>
            <p>{config.name}</p>
            <span>Appointments</span>
          </div>
        </div>
        <nav aria-label="Appointment views">
          {customer ? (
            <button
              type="button"
              aria-current={tab === "book" ? "page" : undefined}
              disabled={locked}
              onClick={() => setTab("book")}
            >
              <Icon name="clock" />
              Book a time
            </button>
          ) : null}
          <button
            type="button"
            aria-current={tab === "appointments" ? "page" : undefined}
            disabled={locked}
            onClick={() => setTab("appointments")}
          >
            <Icon name="receipt-text" />
            {customer ? "My demo appointments" : "Appointments"}
          </button>
        </nav>
        <p className="appointment-demo-note">
          Shared demo data. Roles are examples, not private accounts.
        </p>
      </aside>
      <div className="appointment-workspace-canvas">
        <header className="appointment-heading">
          <div>
            <h1>
              {customer && tab === "book"
                ? "Choose a time that works"
                : customer
                  ? "My demo appointments"
                  : "Appointments"}
            </h1>
            <p>
              {customer
                ? "Choose a service, pick a time, and keep track of your appointment."
                : "Review the shared appointment list."}
            </p>
          </div>
          <button
            type="button"
            className="appointment-icon-button"
            aria-label="Refresh appointments"
            title="Refresh appointments"
            disabled={pending || uncertain || loading}
            onClick={() => void refresh()}
          >
            <Icon name="refresh-cw" />
          </button>
        </header>
        {message ? (
          <p className="appointment-message" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <div className="appointment-error" role="alert">
            <p>{error}</p>
            {uncertain ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => intent.current && void send(intent.current)}
              >
                {pending ? "Checking…" : "Retry same request"}
              </button>
            ) : null}
          </div>
        ) : null}
        {needsRefresh ? (
          <button type="button" disabled={loading} onClick={() => void refresh()}>
            Refresh saved result
          </button>
        ) : null}
        {availabilityError ? (
          <div className="appointment-error" role="alert">
            <p>{availabilityError}</p>
            <button
              type="button"
              disabled={locked || loading}
              onClick={() => void refresh()}
            >
              Retry availability
            </button>
          </div>
        ) : null}
        <div
          className={
            customer && tab === "book"
              ? "appointment-booking-layout"
              : "appointment-list-layout"
          }
        >
          {customer && tab === "book" ? (
            <section aria-label="Book an appointment" className="appointment-booking">
              <form onSubmit={book}>
                <label className="appointment-field">
                  Service
                  <select
                    aria-label="Service"
                    value={service}
                    onChange={(event) => {
                      setService(event.target.value);
                      setSelected("");
                    }}
                    disabled={locked || loading}
                  >
                    <option value="">All available services</option>
                    {Object.entries(services).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {windowControls}
                {loading ? <p aria-live="polite">Loading available times…</p> : null}
                <div
                  className="appointment-slots"
                  role="group"
                  aria-label="Available appointment times"
                >
                  {visibleSlots.map((slot) => (
                    <button
                      className="appointment-slot"
                      type="button"
                      key={slot.scheduleId}
                      aria-pressed={selected === slot.scheduleId}
                      disabled={locked || loading || !clockReady}
                      onClick={() => setSelected(slot.scheduleId)}
                    >
                      <span>{day(slot.startUtc, slot.timezone)}</span>
                      <strong>{time(slot.startUtc, slot.timezone)}</strong>
                      <span>{slot.serviceName}</span>
                      <small>
                        {slot.durationMinutes} min · {slot.timezone}
                      </small>
                    </button>
                  ))}
                </div>
                {!loading && !availabilityError && !visibleSlots.length ? (
                  <div className="appointment-empty">
                    <Icon name="clock" />
                    <h3>No available times in this view</h3>
                    <p>Try another service or week, or check more available times.</p>
                  </div>
                ) : null}
                {moreControls}
                {chosen ? (
                  <div className="appointment-selection">
                    <Icon name="circle-check" />
                    <div>
                      <strong>{chosen.serviceName}</strong>
                      <p>
                        {day(chosen.startUtc, chosen.timezone)} ·{" "}
                        {time(chosen.startUtc, chosen.timezone)}–
                        {time(chosen.endUtc, chosen.timezone)} · {chosen.timezone}
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="appointment-inputs">
                  <label className="appointment-field">
                    Your name
                    <input
                      aria-label="Your name"
                      required
                      value={name}
                      disabled={locked}
                      autoComplete="name"
                      onChange={(event) => setName(event.target.value)}
                    />
                  </label>
                  <label className="appointment-field">
                    Notes
                    <textarea
                      aria-label="Notes"
                      value={notes}
                      disabled={locked}
                      rows={3}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </label>
                </div>
                <button
                  className="appointment-primary"
                  type="submit"
                  disabled={locked || loading || !clockReady || !selected || !name.trim()}
                >
                  <Icon name="circle-check" />
                  {pending ? "Requesting…" : "Request appointment"}
                </button>
              </form>
            </section>
          ) : null}
          <section className="appointment-record-panel" aria-label="Saved appointments">
            <h2>{customer ? "My demo appointments" : "Saved appointments"}</h2>
            {staff ? (
              <section aria-label="Replacement times">
                {windowControls}
                {moreControls}
              </section>
            ) : null}
            {!customer ? (
              <label className="appointment-field appointment-status-filter">
                Status
                <select
                  aria-label="Appointment status"
                  value={statusFilter}
                  disabled={locked || loading}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setVisibleLimit(20);
                  }}
                >
                  <option value="all">All appointments</option>
                  <option value="requested">Requested</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            ) : null}
            {filteredRecords.length ? (
              <ul className="appointment-records">
                {filteredRecords.slice(0, visibleLimit).map((record) => {
                  const summary = summaries[record.id],
                    status = String(record[fields.appointmentStatus]),
                    rescheduleTarget = rescheduleTargets[record.id] ?? "",
                    canReschedule =
                      !locked &&
                      !loading &&
                      clockReady &&
                      slots.some(
                        (slot) =>
                          slot.scheduleId === rescheduleTarget &&
                          slot.scheduleId !== record[fields.appointmentSchedule],
                      ),
                    canCancel =
                      (customer && status === "requested") ||
                      ((staff || admin) &&
                        (status === "requested" || status === "confirmed")),
                    historyRows = history[record.id] ?? [];
                  return (
                    <li key={record.id}>
                      <div className="appointment-record-top">
                        <Icon name="clock" />
                        <span className="appointment-status" data-status={status}>
                          {status}
                        </span>
                      </div>
                      <h3>{summary?.serviceName ?? "Appointment details unavailable"}</h3>
                      {summary ? <small>Current service name</small> : null}
                      <p>{String(record[fields.appointmentCustomer] ?? "")}</p>
                      {record[fields.appointmentNotes] ? (
                        <p className="appointment-record-note">
                          <strong>Notes</strong>
                          <span>{String(record[fields.appointmentNotes])}</span>
                        </p>
                      ) : null}
                      {status === "cancelled" &&
                      record[fields.appointmentCancellationReason] ? (
                        <p className="appointment-record-note">
                          <strong>Cancellation reason</strong>
                          <span>
                            {String(record[fields.appointmentCancellationReason])}
                          </span>
                        </p>
                      ) : null}
                      {summary ? (
                        <p>
                          {day(summary.slot.startUtc, summary.slot.timezone)} ·{" "}
                          {time(summary.slot.startUtc, summary.slot.timezone)}
                          <small>
                            {summary.slot.timezone} ·{" "}
                            {summary.source === "history"
                              ? "Booked time retained from appointment history."
                              : "Current schedule details."}
                          </small>
                        </p>
                      ) : (
                        <p>Refresh to load the saved time.</p>
                      )}
                      <div className="appointment-record-controls">
                        {staff && status === "requested" ? (
                          <div className="appointment-actions">
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() => appointmentAction(record, "confirm")}
                            >
                              Confirm appointment
                            </button>
                          </div>
                        ) : null}
                        {staff && status === "confirmed" ? (
                          <details className="appointment-action-disclosure">
                            <summary>Manage appointment</summary>
                            <div className="appointment-actions">
                              <label>
                                Move to another available time
                                <select
                                  aria-label={
                                    "Reschedule " +
                                    String(
                                      record[fields.appointmentCustomer] ?? "appointment",
                                    )
                                  }
                                  disabled={locked || loading || !clockReady}
                                  value={rescheduleTarget}
                                  onChange={(event) =>
                                    setRescheduleTargets((previous) => ({
                                      ...previous,
                                      [record.id]: event.target.value,
                                    }))
                                  }
                                >
                                  <option value="">Choose an available time</option>
                                  {slots
                                    .filter(
                                      (slot) =>
                                        slot.scheduleId !==
                                        record[fields.appointmentSchedule],
                                    )
                                    .map((slot) => (
                                      <option
                                        key={slot.scheduleId}
                                        value={slot.scheduleId}
                                      >
                                        {slot.serviceName} ·{" "}
                                        {day(slot.startUtc, slot.timezone)}{" "}
                                        {time(slot.startUtc, slot.timezone)}
                                      </option>
                                    ))}
                                </select>
                              </label>
                              <button
                                type="button"
                                disabled={!canReschedule}
                                onClick={() =>
                                  appointmentAction(record, "reschedule", {
                                    scheduleId: rescheduleTarget,
                                  })
                                }
                              >
                                Reschedule appointment
                              </button>
                            </div>
                          </details>
                        ) : null}
                        {canCancel ? (
                          <details className="appointment-action-disclosure">
                            <summary>Cancel appointment</summary>
                            <div className="appointment-actions">
                              <label>
                                Cancellation reason
                                <textarea
                                  aria-label={
                                    "Cancellation reason for " +
                                    String(
                                      record[fields.appointmentCustomer] ?? "appointment",
                                    )
                                  }
                                  value={cancelReasons[record.id] ?? ""}
                                  disabled={locked}
                                  rows={2}
                                  onChange={(event) =>
                                    setCancelReasons((previous) => ({
                                      ...previous,
                                      [record.id]: event.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <button
                                type="button"
                                disabled={
                                  locked || !(cancelReasons[record.id] ?? "").trim()
                                }
                                onClick={() =>
                                  appointmentAction(record, "cancel", {
                                    cancellationReason: (
                                      cancelReasons[record.id] ?? ""
                                    ).trim(),
                                  })
                                }
                              >
                                Cancel appointment
                              </button>
                            </div>
                          </details>
                        ) : null}
                        <details>
                          <summary
                            onClick={() => {
                              if (!history[record.id]) void loadHistory(record);
                            }}
                          >
                            Appointment history
                          </summary>
                          {historyRows.length ? (
                            <ol className="appointment-history">
                              {historyRows.map((entry, index) => (
                                <li key={entry.at + index}>
                                  <strong>
                                    {{
                                      claim: "Requested",
                                      confirm: "Confirmed",
                                      move: "Rescheduled",
                                      cancel: "Cancelled",
                                    }[
                                      entry.action as
                                        "claim" | "confirm" | "move" | "cancel"
                                    ] ?? "Appointment updated"}
                                  </strong>
                                  <span>
                                    {entry.actorRole} · {day(entry.at)} ·{" "}
                                    {time(entry.at, "UTC")} UTC
                                  </span>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <p>Loading appointment history…</p>
                          )}
                        </details>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="appointment-empty">
                <Icon name="receipt-text" />
                <h3>
                  {statusFilter === "all"
                    ? "No appointments yet"
                    : "No appointments match this status"}
                </h3>
                <p>
                  {statusFilter !== "all"
                    ? "Choose another status to see the rest of your appointments."
                    : customer
                      ? "Your requested times will appear here."
                      : "Appointments appear here after a customer requests a time."}
                </p>
              </div>
            )}
            {filteredRecords.length > visibleLimit ? (
              <button
                type="button"
                disabled={locked || loading}
                onClick={() => setVisibleLimit((count) => count + 20)}
              >
                Show more appointments
              </button>
            ) : null}
          </section>
          {admin ? (
            <section className="appointment-setup" aria-label="Appointment setup">
              <div>
                <h2>Services and schedules</h2>
                <p>
                  Closing a service or slot stops new bookings while existing appointments
                  remain readable. A booked slot cannot be retimed; create a replacement
                  and close the old slot. Capacity and status can still be updated within
                  occupancy limits.
                </p>
              </div>
              <div className="appointment-setup-grid">
                <form onSubmit={createService}>
                  <h3>{editingService ? "Update service" : "Create service"}</h3>
                  <label className="appointment-field">
                    Service name
                    <input
                      aria-label="Service name"
                      value={serviceName}
                      disabled={locked}
                      onChange={(event) => setServiceName(event.target.value)}
                    />
                  </label>
                  <label className="appointment-field">
                    Duration minutes
                    <input
                      aria-label="Duration minutes"
                      type="number"
                      min="1"
                      step="1"
                      value={serviceDuration}
                      disabled={locked}
                      onChange={(event) => setServiceDuration(event.target.value)}
                    />
                  </label>
                  <label className="appointment-check">
                    <input
                      type="checkbox"
                      checked={serviceActive}
                      disabled={locked}
                      onChange={(event) => setServiceActive(event.target.checked)}
                    />
                    Available for new bookings
                  </label>
                  <button className="appointment-primary" type="submit" disabled={locked}>
                    {editingService ? "Save service update" : "Save service"}
                  </button>
                  {editingService ? (
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        setEditingService(null);
                        setServiceName("");
                        setServiceDuration("");
                        setServiceActive(true);
                      }}
                    >
                      Create another service
                    </button>
                  ) : null}
                </form>
                <form onSubmit={createSchedule}>
                  <h3>{editingSchedule ? "Update schedule" : "Create schedule"}</h3>
                  {editingSchedule ? (
                    <section
                      aria-label="Current saved schedule"
                      className="appointment-selection"
                    >
                      <div>
                        <strong>Current saved values</strong>
                        <dl>
                          <dt>Service</dt>
                          <dd>
                            {String(
                              setupServices.find(
                                (item) =>
                                  item.id === editingSchedule[fields.scheduleService],
                              )?.[config.serviceName] ??
                                editingSchedule[fields.scheduleService],
                            )}
                          </dd>
                          <dt>Start time (UTC)</dt>
                          <dd>{String(editingSchedule[fields.scheduleStart])}</dd>
                          <dt>End time (UTC)</dt>
                          <dd>{String(editingSchedule[fields.scheduleEnd])}</dd>
                          <dt>Timezone</dt>
                          <dd>{String(editingSchedule[fields.scheduleTimezone])}</dd>
                          <dt>Capacity</dt>
                          <dd>{String(editingSchedule[fields.scheduleCapacity])}</dd>
                          <dt>Availability</dt>
                          <dd>
                            {editingSchedule[fields.scheduleStatus] === "open"
                              ? "Open for booking"
                              : "Closed to new bookings"}
                          </dd>
                        </dl>
                      </div>
                    </section>
                  ) : null}
                  <label className="appointment-field">
                    Service
                    <select
                      aria-label="Schedule service"
                      value={scheduleService}
                      disabled={locked}
                      onChange={(event) => setScheduleService(event.target.value)}
                    >
                      <option value="">Choose a service</option>
                      {setupServices
                        .filter(
                          (item) =>
                            item[fields.serviceActive] === true ||
                            item.id === editingSchedule?.[fields.scheduleService],
                        )
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {String(item[config.serviceName])}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="appointment-field">
                    Start time (UTC)
                    <input
                      aria-label="Start time (UTC)"
                      type="datetime-local"
                      value={scheduleStart}
                      disabled={locked}
                      onChange={(event) => setScheduleStart(event.target.value)}
                    />
                  </label>
                  <label className="appointment-field">
                    End time (UTC)
                    <input
                      aria-label="End time (UTC)"
                      type="datetime-local"
                      value={scheduleEnd}
                      disabled={locked}
                      onChange={(event) => setScheduleEnd(event.target.value)}
                    />
                  </label>
                  <label className="appointment-field">
                    Timezone
                    <input
                      aria-label="Timezone"
                      value={scheduleTimezone}
                      disabled={locked}
                      onChange={(event) => setScheduleTimezone(event.target.value)}
                    />
                  </label>
                  <label className="appointment-field">
                    Capacity
                    <input
                      aria-label="Capacity"
                      type="number"
                      min="1"
                      step="1"
                      value={scheduleCapacity}
                      disabled={locked}
                      onChange={(event) => setScheduleCapacity(event.target.value)}
                    />
                  </label>
                  <label className="appointment-field">
                    Availability
                    <select
                      aria-label="Schedule availability"
                      value={scheduleStatus}
                      disabled={locked}
                      onChange={(event) =>
                        setScheduleStatus(event.target.value as "open" | "closed")
                      }
                    >
                      <option value="open">Open for booking</option>
                      <option value="closed">Closed to new bookings</option>
                    </select>
                  </label>
                  <button className="appointment-primary" type="submit" disabled={locked}>
                    {editingSchedule ? "Save schedule update" : "Save schedule"}
                  </button>
                  {editingSchedule ? (
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => setEditingSchedule(null)}
                    >
                      Create another schedule
                    </button>
                  ) : null}
                </form>
              </div>
              <section
                className="appointment-setup-list"
                aria-label="Current service setup"
              >
                <h3>Current services</h3>
                {setupServices.map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>{String(item[config.serviceName])}</strong>
                      <span>
                        {String(item[config.serviceDuration])} minutes ·{" "}
                        {item[fields.serviceActive] === true
                          ? "Available"
                          : "Closed to new bookings"}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        setEditingService(item);
                        setServiceName(String(item[config.serviceName] ?? ""));
                        setServiceDuration(String(item[config.serviceDuration] ?? ""));
                        setServiceActive(item[fields.serviceActive] === true);
                      }}
                    >
                      Update service
                    </button>
                  </article>
                ))}
              </section>
              <section
                className="appointment-setup-list"
                aria-label="Current schedule setup"
              >
                <h3>Current schedules</h3>
                {setupSchedules.map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>
                        {String(item[fields.scheduleStatus]) === "open"
                          ? "Open for booking"
                          : "Closed to new bookings"}
                      </strong>
                      <span>
                        {String(item[fields.scheduleStart])
                          .replace("T", " ")
                          .replace(".000Z", " UTC")}{" "}
                        · capacity {String(item[fields.scheduleCapacity])}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        setEditingSchedule(item);
                        setScheduleService(String(item[fields.scheduleService] ?? ""));
                        setScheduleStart(
                          String(item[fields.scheduleStart] ?? "").slice(0, 16),
                        );
                        setScheduleEnd(
                          String(item[fields.scheduleEnd] ?? "").slice(0, 16),
                        );
                        setScheduleTimezone(
                          String(item[fields.scheduleTimezone] ?? "UTC"),
                        );
                        setScheduleCapacity(String(item[fields.scheduleCapacity] ?? "1"));
                        setScheduleStatus(
                          item[fields.scheduleStatus] === "closed" ? "closed" : "open",
                        );
                      }}
                    >
                      Update schedule
                    </button>
                  </article>
                ))}
              </section>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
export function GeneratedApplication({ requestedPath }: { requestedPath: string }) {
  const [role, setRole] = useState("customer"),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(config.storageKey);
      if (stored && ["customer", "staff", "administrator"].includes(stored))
        setRole(stored);
    } catch {}
  }, []);
  if (requestedPath !== "/" && !config.routes.includes(requestedPath))
    return (
      <main>
        <h1>Page unavailable</h1>
        <a href="/">Open appointments</a>
      </main>
    );
  return (
    <Workspace
      key={role}
      role={role}
      onBusy={setBusy}
      roleControls={
        <div className="appointment-role-strip">
          <label>
            Demo role
            <select
              value={role}
              disabled={busy}
              onChange={(event) => {
                const next = event.target.value;
                setRole(next);
                try {
                  localStorage.setItem(config.storageKey, next);
                } catch {}
              }}
            >
              <option value="customer">Customer</option>
              <option value="staff">Staff</option>
              <option value="administrator">Administrator</option>
            </select>
          </label>
        </div>
      }
    />
  );
}
`.replace(/CONFIG_JSON|ICONS_JSON|HEADER_CHANNEL/g, (token) => {
    if (token === "CONFIG_JSON") return safe(config);
    if (token === "ICONS_JSON") return safe(assets.icons);
    return fixture
      ? "'x-factory-fixture-session':'fixture-session-'+role"
      : "'x-factory-role':role";
  });
}

export function renderAppointmentWorkspaceStyles(): string {
  return (
    renderWorkspaceStyles("appointment").join("\n") +
    String.raw`
.appointment-v1 { color:var(--factory-text); font-family:var(--factory-typography-font-family-sans,system-ui,sans-serif); }
.appointment-role-strip { position:absolute; inset:1rem 1.5rem auto auto; z-index:2; }
.appointment-role-strip label { display:flex; align-items:center; gap:.65rem; font-size:.8rem; }
.appointment-role-strip select { min-height:44px; border:1px solid var(--factory-border); background:var(--factory-surface); color:var(--factory-text); border-radius:var(--factory-radius-radius-base,8px); padding:.4rem .6rem; }
.appointment-v1 .appointment-workspace-canvas { padding-block-start:5.5rem; gap:1.25rem; }
.appointment-v1 button { display:inline-flex; align-items:center; justify-content:center; gap:.5rem; min-height:44px; padding:.7rem 1rem; border:1px solid var(--factory-border); border-radius:var(--factory-radius-radius-base,8px); background:var(--factory-surface); color:var(--factory-text); font:inherit; cursor:pointer; }
.appointment-v1 button:disabled { opacity:.55; cursor:not-allowed; }
.appointment-v1 :is(button,input,textarea,select):focus-visible { outline:3px solid var(--factory-accent); outline-offset:3px; }
.appointment-v1 button:hover:not(:disabled) { border-color:var(--factory-accent); }
.appointment-v1 .appointment-workspace-sidebar nav button { justify-content:flex-start; text-align:left; background:transparent; border-color:transparent; color:var(--factory-accent-text); }
.appointment-v1 .appointment-workspace-sidebar nav button[aria-current='page'] { color:var(--factory-accent); background:var(--factory-surface); }
.appointment-demo-note { font-size:.78rem; line-height:1.55; color:inherit; }
.appointment-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; }
.appointment-heading h1 { font-size:clamp(1.6rem,3vw,2.35rem); line-height:1.15; letter-spacing:-.025em; margin:0 0 .7rem; }
.appointment-heading p { margin:0; max-width:58ch; line-height:1.6; }
.appointment-v1 .appointment-icon-button { width:44px; padding:0; flex:0 0 44px; }
.appointment-booking-layout { display:grid; grid-template-columns:minmax(0,1fr) minmax(15rem,.7fr); gap:2rem; align-items:start; }
.appointment-booking { background:var(--factory-surface); border:1px solid var(--factory-border); border-radius:var(--factory-radius-radius-lg,12px); padding:1.5rem; }
.appointment-booking form { display:grid; gap:1.25rem; }
.appointment-field { display:grid; gap:.5rem; font-weight:600; min-width:0; }
.appointment-field :is(input,textarea,select) { width:100%; min-width:0; box-sizing:border-box; min-height:44px; border:1px solid var(--factory-border); border-radius:var(--factory-radius-radius-base,8px); background:var(--factory-bg); color:var(--factory-text); font:inherit; font-weight:400; padding:.7rem; caret-color:var(--factory-accent); }
.appointment-field textarea { resize:vertical; }
.appointment-window { display:flex; align-items:center; justify-content:space-between; gap:.5rem; }
.appointment-window h2,.appointment-record-panel>h2 { font-size:1.1rem; line-height:1.4; margin:0; }
.appointment-window>div { display:flex; gap:.3rem; flex-shrink:0; }
.appointment-slots { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.65rem; }
.appointment-v1 .appointment-slot { display:flex; align-items:flex-start; flex-direction:column; gap:.25rem; padding:.85rem; text-align:left; }
.appointment-slot strong { font-size:1.2rem; font-variant-numeric:tabular-nums; }
.appointment-slot :is(span,small) { overflow-wrap:anywhere; font-size:.8rem; }
.appointment-v1 .appointment-slot[aria-pressed='true'] { background:var(--factory-accent); color:var(--factory-accent-text); border-color:var(--factory-accent); }
.appointment-selection { display:flex; gap:.65rem; align-items:flex-start; padding:1rem; border-radius:var(--factory-radius-radius-base,8px); background:color-mix(in srgb,var(--factory-accent) 12%,var(--factory-surface)); }
.appointment-selection .appointment-icon { color:var(--factory-accent); margin-top:.2rem; }
.appointment-selection p { font-size:.85rem; line-height:1.6; margin:.25rem 0 0; }
.appointment-selection dl { display:grid; gap:.2rem; font-size:.8rem; margin:.6rem 0 0; }
.appointment-selection dt { color:var(--factory-muted); margin-top:.4rem; }
.appointment-selection dd { margin:0; overflow-wrap:anywhere; }
.appointment-inputs { display:grid; gap:1rem; }
.appointment-v1 .appointment-primary { background:var(--factory-accent); color:var(--factory-accent-text); border-color:var(--factory-accent); font-weight:600; }
.appointment-record-panel { min-width:0; display:grid; gap:1rem; }
.appointment-records { display:grid; gap:1rem; list-style:none; padding:0; margin:0; }
.appointment-records>li { background:var(--factory-surface); border:1px solid var(--factory-border); border-radius:var(--factory-radius-radius-lg,12px); padding:1.15rem; min-width:0; }
.appointment-records h3 { font-size:1.05rem; margin:.75rem 0 .45rem; overflow-wrap:anywhere; }
.appointment-records p { margin:.35rem 0; line-height:1.65; overflow-wrap:anywhere; }
.appointment-records small { display:block; font-size:.75rem; }
.appointment-record-top { display:flex; align-items:center; justify-content:space-between; gap:.5rem; }
.appointment-record-top>.appointment-icon { color:var(--factory-accent); }
.appointment-status { text-transform:capitalize; padding:.25rem .6rem; border:1px solid var(--factory-border); border-radius:99px; font-size:.75rem; }
.appointment-status[data-status='confirmed'] { color:var(--factory-success,#157347); background:color-mix(in srgb,var(--factory-success,#157347) 10%,var(--factory-surface)); }
.appointment-status[data-status='requested'] { color:var(--factory-accent); background:color-mix(in srgb,var(--factory-accent) 10%,var(--factory-surface)); }
.appointment-empty { text-align:center; padding:1.6rem .8rem; line-height:1.6; }
.appointment-empty>.appointment-icon { color:var(--factory-accent); width:1.8rem!important; height:1.8rem!important; }
.appointment-empty h3 { margin:.75rem 0 .4rem; font-size:1rem; }
.appointment-empty p { margin:0; font-size:.85rem; }
.appointment-message,.appointment-error { margin:0; padding:1rem; border:1px solid var(--factory-border); border-radius:var(--factory-radius-radius-base,8px); line-height:1.6; }
.appointment-message { background:color-mix(in srgb,var(--factory-accent) 8%,var(--factory-surface)); }
.appointment-error { color:var(--factory-text); background:var(--factory-surface); }
.appointment-error p { margin:0 0 .6rem; }
.appointment-actions { display:grid; gap:.65rem; margin-top:1rem; padding-top:1rem; border-top:1px solid var(--factory-border); }
.appointment-actions label { display:grid; gap:.4rem; font-size:.82rem; font-weight:600; }
.appointment-action-disclosure { margin-top:.75rem; padding-top:.75rem; border-top:1px solid var(--factory-border); }
.appointment-action-disclosure>summary { min-height:44px; display:flex; align-items:center; cursor:pointer; color:var(--factory-accent); font-weight:600; }
.appointment-actions textarea,.appointment-actions select { width:100%; min-height:44px; box-sizing:border-box; padding:.65rem; border:1px solid var(--factory-border); border-radius:var(--factory-radius-radius-base,8px); background:var(--factory-bg); color:var(--factory-text); font:inherit; }
.appointment-history { display:grid; gap:.45rem; margin:.75rem 0 0; padding-left:1.25rem; font-size:.82rem; }
.appointment-history li { display:grid; gap:.15rem; }
.appointment-history span { color:var(--factory-muted); }
.appointment-records details { margin-top:1rem; padding-top:.75rem; border-top:1px solid var(--factory-border); }
.appointment-records summary { min-height:44px; display:flex; align-items:center; cursor:pointer; color:var(--factory-accent); font-weight:600; }
.appointment-setup { grid-column:1 / -1; display:grid; gap:1.25rem; padding:1.5rem; background:var(--factory-surface); border:1px solid var(--factory-border); border-radius:var(--factory-radius-radius-lg,12px); }
.appointment-setup h2,.appointment-setup h3 { margin:0; }
.appointment-setup>div>p { max-width:75ch; margin:.5rem 0 0; line-height:1.6; }
.appointment-setup-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1.25rem; align-items:start; }
.appointment-setup-grid form { display:grid; align-content:start; gap:.85rem; padding:1rem; background:var(--factory-bg); border-radius:var(--factory-radius-radius-base,8px); }
.appointment-check { display:flex; align-items:center; gap:.6rem; min-height:44px; font-size:.9rem; }
.appointment-check input { width:1.25rem; height:1.25rem; accent-color:var(--factory-accent); }
.appointment-setup-list { display:grid; gap:.65rem; }
.appointment-setup-list article { display:flex; justify-content:space-between; align-items:center; gap:1rem; padding:.8rem 0; border-top:1px solid var(--factory-border); }
.appointment-setup-list article div { display:grid; gap:.2rem; min-width:0; }
.appointment-setup-list article span { color:var(--factory-muted); font-size:.85rem; }
.appointment-status-filter { max-width:18rem; }
.appointment-record-note { display:grid; gap:.2rem; white-space:pre-wrap; overflow-wrap:anywhere; }
.appointment-record-note strong { font-size:.8rem; }
.appointment-record-controls { display:flex; align-items:flex-start; flex-wrap:wrap; gap:.25rem .9rem; margin-top:.75rem; padding-top:.5rem; border-top:1px solid var(--factory-border); }
.appointment-record-controls>.appointment-actions,.appointment-record-controls>details { margin:0; padding:0; border:0; }
.appointment-record-controls>details[open] { flex:1 1 100%; }
.appointment-record-controls>details:not([open]) { flex:0 1 auto; }
.appointment-record-controls summary { font-size:.85rem; }
.appointment-role-strip { font-family:var(--factory-typography-font-family-sans,system-ui,sans-serif); color:var(--factory-text); background:var(--factory-surface); }
.appointment-role-strip select { min-height:44px; font:inherit; color:inherit; background:var(--factory-surface); border:1px solid var(--factory-border); border-radius:8px; padding:.4rem .6rem; }
@media(min-width:900px){.appointment-v1 .appointment-workspace-sidebar .appointment-demo-note{color:var(--factory-accent-text)}.appointment-v1[data-role='staff'] .appointment-records{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:899px){.appointment-v1 .appointment-workspace-sidebar nav button:not([aria-current='page']){color:var(--factory-text)}}
.appointment-v1 ::selection { background:var(--factory-accent); color:var(--factory-accent-text); }
@media(max-width:1100px){.appointment-booking-layout{grid-template-columns:minmax(0,1fr)}.appointment-records{grid-template-columns:repeat(2,minmax(0,1fr));}}
@media(max-width:899px){.appointment-v1.generated-app{grid-template-columns:minmax(0,1fr)!important;grid-template-rows:auto auto minmax(0,1fr)!important}.appointment-v1 .appointment-workspace-sidebar{display:grid;grid-template-columns:minmax(0,1fr);gap:.8rem;padding:1rem;border-inline-end:0;border-block-end:1px solid var(--factory-border)}.appointment-v1 .appointment-workspace-sidebar nav{display:flex;flex-wrap:wrap;gap:.35rem}.appointment-v1 .appointment-workspace-sidebar nav button{min-width:0;flex:1 1 9rem}.appointment-demo-note{margin:0}.appointment-v1 .appointment-workspace-canvas{grid-template-columns:minmax(0,1fr);padding:1.25rem 1rem;gap:1.25rem}.appointment-v1 .appointment-heading{grid-column:1}.appointment-role-strip{position:static;padding:.65rem 1rem;background:var(--factory-surface);border-bottom:1px solid var(--factory-border)}.appointment-role-strip label{justify-content:flex-end}.appointment-booking{padding:1rem}.appointment-records{grid-template-columns:minmax(0,1fr)}.appointment-heading h1{font-size:1.65rem}.appointment-heading p{font-size:.85rem}.appointment-booking-layout{gap:1.5rem}.appointment-window h2{font-size:.92rem}.appointment-setup{padding:1rem}.appointment-setup-grid{grid-template-columns:minmax(0,1fr)}.appointment-setup-list article{align-items:flex-start;flex-direction:column}.appointment-setup-list article button{width:100%}}
`
  );
}
