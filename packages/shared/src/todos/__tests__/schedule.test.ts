import { describe, it, expect } from "vitest";
import {
  firstDueDate,
  nextDueDate,
  toIsoDate,
  fromIsoDate,
  describeSchedule,
} from "../schedule.js";

/** UTC date helper for tests. */
function utc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

describe("toIsoDate / fromIsoDate", () => {
  it("round-trips", () => {
    const d = utc(2026, 5, 14);
    expect(toIsoDate(d)).toBe("2026-05-14");
    expect(fromIsoDate("2026-05-14").getTime()).toBe(d.getTime());
  });

  it("zero-pads month and day", () => {
    expect(toIsoDate(utc(2026, 1, 3))).toBe("2026-01-03");
  });
});

describe("firstDueDate", () => {
  describe("interval", () => {
    it("returns today as the first occurrence", () => {
      const result = firstDueDate(
        { type: "interval", intervalDays: 5 },
        utc(2026, 5, 14),
      );
      expect(toIsoDate(result)).toBe("2026-05-14");
    });
  });

  describe("day_of_week", () => {
    it("returns today when today already matches", () => {
      // 2026-05-14 is a Thursday (day 4).
      const result = firstDueDate(
        { type: "day_of_week", dayOfWeek: 4 },
        utc(2026, 5, 14),
      );
      expect(toIsoDate(result)).toBe("2026-05-14");
    });

    it("returns the next matching day", () => {
      // 2026-05-14 is Thursday, next Sunday (day 0) is May 17.
      const result = firstDueDate(
        { type: "day_of_week", dayOfWeek: 0 },
        utc(2026, 5, 14),
      );
      expect(toIsoDate(result)).toBe("2026-05-17");
    });
  });

  describe("day_of_month", () => {
    it("returns today when today is the target day", () => {
      const result = firstDueDate(
        { type: "day_of_month", dayOfMonth: 14 },
        utc(2026, 5, 14),
      );
      expect(toIsoDate(result)).toBe("2026-05-14");
    });

    it("returns later this month when possible", () => {
      const result = firstDueDate(
        { type: "day_of_month", dayOfMonth: 25 },
        utc(2026, 5, 14),
      );
      expect(toIsoDate(result)).toBe("2026-05-25");
    });

    it("rolls over to next month past target", () => {
      const result = firstDueDate(
        { type: "day_of_month", dayOfMonth: 5 },
        utc(2026, 5, 14),
      );
      expect(toIsoDate(result)).toBe("2026-06-05");
    });

    it("clamps day 31 in shorter months (Feb non-leap)", () => {
      const result = firstDueDate(
        { type: "day_of_month", dayOfMonth: 31 },
        utc(2026, 2, 1),
      );
      // Feb 2026 has 28 days, so Feb 28 is the clamped match.
      expect(toIsoDate(result)).toBe("2026-02-28");
    });
  });

  describe("day_of_year", () => {
    it("returns this year when the date is still ahead", () => {
      const result = firstDueDate(
        { type: "day_of_year", month: 5, dayOfMonth: 2 },
        utc(2026, 1, 1),
      );
      expect(toIsoDate(result)).toBe("2026-05-02");
    });

    it("rolls over to next year when this year has passed", () => {
      const result = firstDueDate(
        { type: "day_of_year", month: 5, dayOfMonth: 2 },
        utc(2026, 5, 14),
      );
      expect(toIsoDate(result)).toBe("2027-05-02");
    });

    it("clamps Feb 29 in non-leap years", () => {
      const result = firstDueDate(
        { type: "day_of_year", month: 2, dayOfMonth: 29 },
        utc(2026, 1, 1),
      );
      // 2026 is not a leap year, so Feb 28 is the clamped match.
      expect(toIsoDate(result)).toBe("2026-02-28");
    });
  });
});

describe("nextDueDate", () => {
  it("interval adds intervalDays", () => {
    const result = nextDueDate(
      { type: "interval", intervalDays: 5 },
      utc(2026, 5, 14),
    );
    expect(toIsoDate(result)).toBe("2026-05-19");
  });

  it("day_of_week jumps a full week when anchor matches", () => {
    // Anchor 2026-05-14 = Thursday; next Thursday = May 21.
    const result = nextDueDate(
      { type: "day_of_week", dayOfWeek: 4 },
      utc(2026, 5, 14),
    );
    expect(toIsoDate(result)).toBe("2026-05-21");
  });

  it("day_of_month jumps to next month from anchor at target", () => {
    const result = nextDueDate(
      { type: "day_of_month", dayOfMonth: 14 },
      utc(2026, 5, 14),
    );
    expect(toIsoDate(result)).toBe("2026-06-14");
  });

  it("day_of_year jumps to next year from anchor at target", () => {
    const result = nextDueDate(
      { type: "day_of_year", month: 5, dayOfMonth: 14 },
      utc(2026, 5, 14),
    );
    expect(toIsoDate(result)).toBe("2027-05-14");
  });
});

describe("describeSchedule", () => {
  it("formats each schedule type sensibly", () => {
    expect(describeSchedule({ type: "interval", intervalDays: 1 })).toBe(
      "Every day",
    );
    expect(describeSchedule({ type: "interval", intervalDays: 5 })).toBe(
      "Every 5 days",
    );
    expect(describeSchedule({ type: "day_of_week", dayOfWeek: 4 })).toBe(
      "Every Thursday",
    );
    expect(describeSchedule({ type: "day_of_month", dayOfMonth: 12 })).toBe(
      "Every month on the 12th",
    );
    expect(describeSchedule({ type: "day_of_month", dayOfMonth: 1 })).toBe(
      "Every month on the 1st",
    );
    expect(describeSchedule({ type: "day_of_month", dayOfMonth: 22 })).toBe(
      "Every month on the 22nd",
    );
    expect(
      describeSchedule({ type: "day_of_year", month: 5, dayOfMonth: 2 }),
    ).toBe("Every year on May 2");
  });
});
