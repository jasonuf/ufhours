import { assert, describe, expect, it } from "vitest";
import { getDateFormatted } from "../src/utils/utils";
// import { fetchDiningHours } from '../src/services/diningService'

describe("Dining Hours", () => {
  it("bar", () => {
    expect(1 + 1).eq(2);
  });
});

describe("Utils", () => {
  it("getDateFormatted", () => {
    const dateStr = getDateFormatted();
    expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
