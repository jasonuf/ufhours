import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as z from 'zod';
import { getDiningHours } from  '../src/services/diningService.js';
import { parseDiningResponse } from '../src/services/diningService.js';




// Mock Data

const validLocation = [
    { id: '1', name: 'Main Hall', is_building: false, pay_with_meal_swipe: true, pay_with_retail_swipe: false, week: [
        { date: '2023-10-27', hours: [{ start_hour: 8, start_minutes: 0, end_hour: 20, end_minutes: 0 }], status: "open" },
        { date: '2023-10-28', hours: [], status: "closed" }
    ] },
    { id: '2', name: 'Side Cafe', is_building: false, pay_with_meal_swipe: true, pay_with_retail_swipe: false, week: [
        { date: '2023-10-27', hours: [{ start_hour: 10, start_minutes: 0, end_hour: 18, end_minutes: 0 }], status: "open" },
        { date: '2023-10-28', hours: [], status: "closed" }
    ] },
    { id: '3', name: 'Food Court', is_building: true, pay_with_meal_swipe: false, pay_with_retail_swipe: true, week: [
        { date: '2023-10-27', hours: [{ start_hour: 11, start_minutes: 0, end_hour: 22, end_minutes: 0 }], status: "open" },
        { date: '2023-10-28', hours: [], status: "closed" }
    ] }
  ];

const locationWithoutId = [
    { name: 'Main Hall', is_building: false, pay_with_meal_swipe: true, pay_with_retail_swipe: false, week: [
        { date: '2023-10-27', hours: [{ start_hour: 8, start_minutes: 0, end_hour: 20, end_minutes: 0 }], status: "open" },
        { date: '2023-10-28', hours: [], status: "closed" }
    ] },
    { name: 'Side Cafe', is_building: false, pay_with_meal_swipe: true, pay_with_retail_swipe: false, week: [
        { date: '2023-10-27', hours: [{ start_hour: 10, start_minutes: 0, end_hour: 18, end_minutes: 0 }], status: "open" },
        { date: '2023-10-28', hours: [], status: "closed" }
    ] },
    { name: 'Food Court', is_building: true, pay_with_meal_swipe: false, pay_with_retail_swipe: true, week: [
        { date: '2023-10-27', hours: [{ start_hour: 11, start_minutes: 0, end_hour: 22, end_minutes: 0 }], status: "open" },
        { date: '2023-10-28', hours: [], status: "closed" }
    ] }
  ];
const mockValidResponseExpected = { ok: true, data: locationWithoutId };
const mockValidResponse: object = {
  theLocations: validLocation,
};

const mockEmptyLocationsExpected = { ok: false, error: { kind: 'upstream', message: 'Invalid response structure: missing or malformed theLocations field' } };
const mockEmptyLocations: object = {
    theLocations: [],
};

const emptyHoursWhenOpenExpected = { ok: true, data: [null, null] }; // Expecting null for the invalid location
const emptyHoursWhenOpen: object = {
    theLocations: [
        { id: '1', name: 'Main Hall', is_building: false, pay_with_meal_swipe: true, pay_with_retail_swipe: false, week: [
            { date: '2023-10-27', hours: [], status: "open" }, // Invalid: open but no hours
            { date: '2023-10-28', hours: [], status: "closed" }
        ] },
        { id: '2', name: 'Side Cafe', is_building: false, pay_with_meal_swipe: true, pay_with_retail_swipe: false, week: [
            { date: '2023-10-27', hours: [], status: "open" }, // Invalid: open but no hours
            { date: '2023-10-28', hours: [], status: "closed" }
        ] }
    ],
};



// Testing Parsing Function

describe('parseDiningResponse', () => {
  it('should successfully parse a valid dining response', () => {
    const result = parseDiningResponse(mockValidResponse);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result).toEqual(mockValidResponseExpected);
    }
  });

  it('return success where invalid locations should be null', () => {
    const result = parseDiningResponse(emptyHoursWhenOpen);
    
    expect(result.ok).toBe(true);
    if (result.ok) {
        expect(result).toEqual(emptyHoursWhenOpenExpected);
    }
    
  });

  it('fail due to invalid response', () => {

    const result = parseDiningResponse(mockEmptyLocations);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result).toEqual(mockEmptyLocationsExpected);
    }
  });

});


// Fetch Function Tests

describe('getDiningHours', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should fetch and parse dining hours successfully', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockValidResponse),
    });

    const result = await getDiningHours('2023-10-27');

    expect(fetch).toHaveBeenCalledWith(
        'https://apiv4.dineoncampus.com/locations/weekly_schedule?site_id=62312845a9f13a1011b4dd3a&date=2023-10-27'
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result).toEqual(mockValidResponseExpected);
    }
  });

  it('should handle fetch response not being ok (e.g., a 404 error)', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    });

    const result = await getDiningHours('2023-10-27');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('upstream');
      expect(result.error.message).toBe('Not Found');
    }
  });

  it('should handle a network error during fetch', async () => {

    (fetch as any).mockRejectedValue(new Error('Network request failed'));

    const result = await getDiningHours('2023-10-27');

    expect(result.ok).toBe(false);
    if (!result.ok) {
        expect(result.error.kind).toBe('upstream');
        expect(result.error.message).toBe('Unknown network error occurred');
    }
  });
});

