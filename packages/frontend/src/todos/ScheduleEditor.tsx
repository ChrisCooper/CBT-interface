import { DAY_OF_WEEK_LABELS, type Schedule } from "shared";

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export type ScheduleKind = "none" | Schedule["type"];

export interface ScheduleFormState {
  kind: ScheduleKind;
  intervalDays: number;
  dayOfWeek: number;
  dayOfMonth: number;
  yearMonth: number;
  yearDay: number;
}

export function fromSchedule(s: Schedule | null): ScheduleFormState {
  const defaults: ScheduleFormState = {
    kind: "none",
    intervalDays: 5,
    dayOfWeek: 4,
    dayOfMonth: 1,
    yearMonth: 1,
    yearDay: 1,
  };
  if (!s) return defaults;
  switch (s.type) {
    case "interval":
      return { ...defaults, kind: "interval", intervalDays: s.intervalDays };
    case "day_of_week":
      return { ...defaults, kind: "day_of_week", dayOfWeek: s.dayOfWeek };
    case "day_of_month":
      return { ...defaults, kind: "day_of_month", dayOfMonth: s.dayOfMonth };
    case "day_of_year":
      return {
        ...defaults,
        kind: "day_of_year",
        yearMonth: s.month,
        yearDay: s.dayOfMonth,
      };
  }
}

export function toSchedule(state: ScheduleFormState): Schedule | null {
  switch (state.kind) {
    case "none":
      return null;
    case "interval":
      return { type: "interval", intervalDays: state.intervalDays };
    case "day_of_week":
      return { type: "day_of_week", dayOfWeek: state.dayOfWeek };
    case "day_of_month":
      return { type: "day_of_month", dayOfMonth: state.dayOfMonth };
    case "day_of_year":
      return {
        type: "day_of_year",
        month: state.yearMonth,
        dayOfMonth: state.yearDay,
      };
  }
}

export function schedulesEqual(a: Schedule | null, b: Schedule | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const KINDS: { kind: ScheduleKind; label: string }[] = [
  { kind: "none", label: "One-off (no recurrence)" },
  { kind: "interval", label: "Every N days" },
  { kind: "day_of_week", label: "Day of week" },
  { kind: "day_of_month", label: "Day of month" },
  { kind: "day_of_year", label: "Day of year" },
];

interface ScheduleEditorProps {
  state: ScheduleFormState;
  onChange: (next: ScheduleFormState) => void;
}

export function ScheduleEditor({ state, onChange }: ScheduleEditorProps) {
  return (
    <div className="space-y-2">
      <select
        value={state.kind}
        onChange={(e) =>
          onChange({ ...state, kind: e.target.value as ScheduleKind })
        }
        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {KINDS.map((k) => (
          <option key={k.kind} value={k.kind}>
            {k.label}
          </option>
        ))}
      </select>

      {state.kind === "interval" && (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span>Every</span>
          <input
            type="number"
            min={1}
            max={3650}
            value={state.intervalDays}
            onChange={(e) =>
              onChange({
                ...state,
                intervalDays: Math.max(
                  1,
                  Math.min(3650, Number(e.target.value) || 1),
                ),
              })
            }
            className="w-20 rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span>days after the last completion</span>
        </div>
      )}

      {state.kind === "day_of_week" && (
        <select
          value={state.dayOfWeek}
          onChange={(e) =>
            onChange({ ...state, dayOfWeek: Number(e.target.value) })
          }
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {DAY_OF_WEEK_LABELS.map((label, idx) => (
            <option key={idx} value={idx}>
              Every {label}
            </option>
          ))}
        </select>
      )}

      {state.kind === "day_of_month" && (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span>Day</span>
          <input
            type="number"
            min={1}
            max={31}
            value={state.dayOfMonth}
            onChange={(e) =>
              onChange({
                ...state,
                dayOfMonth: Math.max(
                  1,
                  Math.min(31, Number(e.target.value) || 1),
                ),
              })
            }
            className="w-20 rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span>of every month</span>
        </div>
      )}

      {state.kind === "day_of_year" && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
          <select
            value={state.yearMonth}
            onChange={(e) =>
              onChange({ ...state, yearMonth: Number(e.target.value) })
            }
            className="rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTH_LABELS.map((m, idx) => (
              <option key={idx} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={31}
            value={state.yearDay}
            onChange={(e) =>
              onChange({
                ...state,
                yearDay: Math.max(
                  1,
                  Math.min(31, Number(e.target.value) || 1),
                ),
              })
            }
            className="w-20 rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span>every year</span>
        </div>
      )}
    </div>
  );
}

interface LeadTimeEditorProps {
  leadTimeDays: number;
  onChange: (value: number) => void;
}

export function LeadTimeEditor({ leadTimeDays, onChange }: LeadTimeEditorProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-700">
      <input
        type="number"
        min={0}
        max={365}
        value={leadTimeDays}
        onChange={(e) =>
          onChange(Math.max(0, Math.min(365, Number(e.target.value) || 0)))
        }
        className="w-20 rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span>days</span>
    </div>
  );
}
