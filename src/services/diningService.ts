import * as z from 'zod';
import { DiningLocationSchema } from '../types/diningTypes.js';
import type { DiningLocation } from '../types/diningTypes.js';
import type { Result } from '../types/dailyTypes.js'


// Parser can return upstream or validation errors
export function parseDiningResponse(data: unknown): Result<DiningLocation> {
    if (typeof data !== 'object' || data === null || !('theLocations' in data) || !Array.isArray(data['theLocations']) || data['theLocations'].length === 0) {
        return {
            ok: false,
            error: {
                kind: 'upstream' as const,
                message: 'Invalid response structure: missing or malformed theLocations field'
            }
        };
    }

    const locations: (DiningLocation | null)[] = [];
    for (const loc of data['theLocations']) {
        const result = DiningLocationSchema.safeParse(loc);
        if (result.success) {
            locations.push(result.data);
        } else {
            locations.push(null);
        }
    }

    return { ok: true, data: locations };
}


export async function getDiningHours(formattedDate: string): Promise<Result<DiningLocation>> {
    const url: string = `https://apiv4.dineoncampus.com/locations/weekly_schedule?site_id=62312845a9f13a1011b4dd3a&date=${formattedDate}`;

    try {
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

    }
    catch (error) {
        console.error('Error fetching dining hours:', error);
        return {
            ok: false,
            error: {
                kind: 'upstream' as const,
                message: 'Unknown network error occurred'
            }
        }; 
    }
};