import * as z from 'zod';
import { DiningResponseSchema } from '../types/diningTypes.js';
import type { DiningResponse } from '../types/diningTypes.js';
import type { Result } from '../types/dailyTypes.js'


// Parser can return upstream or validation errors
export function parseDiningResponse(data: unknown): Result<DiningResponse> {
    try {
        return { ok: true, data: DiningResponseSchema.parse(data) };
    } catch (e) {
        if (e instanceof z.ZodError) {
            return {
                ok: false,
                error: {
                    kind: 'validation' as const,
                    message: e.issues.map(err => err.message).join(', ')
                }
            };
        } else {
            return {
                ok: false,
                error: {
                    kind: 'upstream' as const,
                    message: 'Unknown error occurred during validation'
                }
            };
        }
    }
}


export async function getDiningHours(formattedDate: string): Promise<Result<DiningResponse>> {
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