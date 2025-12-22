import * as z from "zod";
import { DiningLocationSchema } from "../../types/diningTypes.js";
import type { DiningLocation } from "../../types/diningTypes.js";
import type { Result, FailedLocation } from "../../types/generalTypes.js";
import { chromium } from "playwright";
import type { Browser, BrowserContext } from "playwright";
import { db } from "../../index.js";
import { DiningLocationTable, DiningLocationHours } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { integer } from "drizzle-orm/gel-core";


function isDiningLocation(x: unknown): x is DiningLocation {
  return DiningLocationSchema.safeParse(x).success;
}

function isFailedLocation(x: unknown): x is FailedLocation {
  return (
    typeof x === "object" &&
    x !== null &&
    ("id" in x || "name" in x) &&
    !isDiningLocation(x)
  );
}

function validateDate(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(date);
}

function formatTime(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`;
}

type SlotInput = {
  slot: number;
  opens_at: string | null;  // "HH:MM:SS"
  closes_at: string | null; // "HH:MM:SS"
};

async function replaceHoursForDate(
  locationId: string,
  serviceDate: string,      // "YYYY-MM-DD"
  slots: SlotInput[],
) {
  await db.transaction(async (tx) => {
    // 1) delete existing slots for that location+date
    await tx.delete(DiningLocationHours).where(
      and(
        eq(DiningLocationHours.dining_location_id, locationId),
        eq(DiningLocationHours.service_date, serviceDate),
      )
    );

    // 2) insert the new slots
    if (slots.length === 0) {
      // closed day: insert a single "closed" row
      await tx.insert(DiningLocationHours).values({
        dining_location_id: locationId,
        service_date: serviceDate,
        slot: 0,
        is_closed: true,
        opens_at: null,
        closes_at: null,
      });
      return;
    }

    await tx.insert(DiningLocationHours).values(
      slots.map((s) => ({
        dining_location_id: locationId,
        service_date: serviceDate,
        slot: s.slot,
        is_closed: false,
        opens_at: s.opens_at,
        closes_at: s.closes_at,
      }))
    );
  });
}

export async function addDiningHoursDB(result: Result<DiningLocation>): Promise<void> {
  if (result.ok) {
    for (const loc of result.data) { // For each location in the result data
      if (isDiningLocation(loc)){
        await db
          .insert(DiningLocationTable)
          .values({
            id: loc.id,
            name: loc.name,
            is_building: loc.is_building,
            pay_with_meal_swipe: loc.pay_with_meal_swipe,
            pay_with_retail_swipe: loc.pay_with_retail_swipe,
            building_id: loc.building_id,
          })
          .onConflictDoNothing({
            target: DiningLocationTable.id,
          });

        for (const day of loc.week) { // For each day in the location's week

          if (!validateDate(day.date)) {
            continue;
          }

          const slots: SlotInput[] = [];

          let slotIdx = 0;
          for (const hour of day.hours) { // For each hour in the day's hours
            const opens_at = formatTime(hour.start_hour, hour.start_minutes);
            const closes_at = formatTime(hour.end_hour, hour.end_minutes);
            slots.push({ slot: slotIdx, opens_at, closes_at });
            slotIdx += 1;
          }

          await replaceHoursForDate(loc.id, day.date, slots);
        }
      } else if (isFailedLocation(loc)) {
        handleFailedLocation(loc);
      }
  }
}
}

function handleFailedLocation(loc: FailedLocation): void {
  // Handle failed location logic here
  // For example, log the error or take other actions
  console.error(`Failed to add dining location: ${JSON.stringify(loc)}`);
}

// Parser can return upstream or validation errors
export function parseDiningResponse(data: unknown): Result<DiningLocation> {
  if (
    typeof data !== "object" ||
    data === null ||
    !("theLocations" in data) ||
    !Array.isArray(data["theLocations"]) ||
    data["theLocations"].length === 0
  ) {
    return {
      ok: false,
      error: {
        kind: "upstream" as const,
        message:
          "Invalid response structure: missing or malformed theLocations field",
      },
    };
  }

  const locations: (DiningLocation | FailedLocation)[] = [];
  for (const loc of data["theLocations"]) {
    const result = DiningLocationSchema.safeParse(loc);
    if (result.success) {
      locations.push(result.data);
    } else {
      // If a validation error occurs, capture the id and name if possible
      const processedLoc: FailedLocation = {};
      if (typeof loc === "object" && loc !== null) {
        if ("id" in loc && typeof loc["id"] === "string") {
          processedLoc.id = loc["id"];
        }
        if ("name" in loc && typeof loc["name"] === "string") {
          processedLoc.name = loc["name"];
        }
      }
      locations.push(processedLoc);
    }
  }

  return { ok: true, data: locations };
}

let sharedBrowser: Browser | null = null;
async function getBrowser(): Promise<Browser> {
  if (sharedBrowser) return sharedBrowser;
  sharedBrowser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  return sharedBrowser;
}

export async function getDiningHours(
  formattedDate: string,
): Promise<Result<DiningLocation>> {
  const url: string = `https://apiv4.dineoncampus.com/locations/weekly_schedule?site_id=62312845a9f13a1011b4dd3a&date=${formattedDate}`;

  let context: BrowserContext | null = null;

  try {
    const browser = await getBrowser();
    context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "en-US",
      extraHTTPHeaders: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const page = await context.newPage();
    await page.goto("https://new.dineoncampus.com", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await page.waitForTimeout(1500);

    const attempt1 = await page.evaluate(async (endpoint: string) => {
      try {
        const resp = await fetch(endpoint, {
          headers: { Accept: "application/json, text/plain, */*" },
          cache: "no-store",
          mode: "cors",
        });
        const text = await resp.text();
        return {
          ok: resp.ok,
          status: resp.status,
          statusText: resp.statusText,
          text,
        };
      } catch (e: any) {
        return {
          ok: false,
          status: 0,
          statusText: "FetchError",
          text: String(e?.message || e),
        };
      }
    }, url);

    if (attempt1.ok && !/^\s*</.test(attempt1.text)) {
      const json = JSON.parse(attempt1.text);
      await context.close();
      return parseDiningResponse(json);
    }
    const resp = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    if (!resp) {
      await context.close();
      return {
        ok: false,
        error: { kind: "upstream", message: "No response from API navigation" },
      };
    }

    const status = resp.status();
    const bodyText = await resp.text();

    if (status >= 200 && status < 300 && !/^\s*</.test(bodyText)) {
      const json = JSON.parse(bodyText);
      await context.close();
      return parseDiningResponse(json);
    }

    // If we got here, it’s still blocked or returned HTML
    const looksCF = /Attention Required!\s*\|\s*Cloudflare/i.test(bodyText);
    await context.close();
    return {
      ok: false,
      error: {
        kind: "upstream",
        message: looksCF
          ? "Blocked by Cloudflare bot protection"
          : attempt1.ok
            ? `Unexpected non-JSON from API (status ${status})`
            : "Browser fetch failed (CORS/bot protection)",
      },
    };

    /*
        const response: Response = await fetch(url);
        if (!response.ok) {
            return {
                ok: false,
                error: {
                    kind: 'upstream' as const,
                    message: response.statusText || 'Failed to fetch dining hours'
                }
            };
        }
        const data = await response.json();
        
        
        return parseDiningResponse(data);
        */
  } catch (error) {
    console.error("Error fetching dining hours:", error);
    return {
      ok: false,
      error: {
        kind: "upstream" as const,
        message: "Unknown network error occurred",
      },
    };
  } finally {
    if (context) {
      try {
        await context.close();
      } catch {}
    }
  }
}
