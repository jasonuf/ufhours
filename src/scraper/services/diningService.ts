import * as z from "zod";
import { DiningLocationSchema } from "../../types/diningTypes.js";
import type { DiningLocation } from "../../types/diningTypes.js";
import type { Result, FailedLocation } from "../../types/generalTypes.js";
import { chromium } from "playwright";
import type { Browser, BrowserContext } from "playwright";

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
