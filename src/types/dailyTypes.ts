import * as z from 'zod';

export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD');

export const HoursSchema = z.object({
    start_hour: z.number(),
    start_minutes: z.number(),
    end_hour: z.number(),
    end_minutes: z.number()
});

export const DaySchema = z.object({
    date: DateSchema,
    hours: z.array(HoursSchema),
    status: z.enum(["open", "closed"])
}).refine(
  (data) => data.status === "closed" || data.hours.length > 0,
  {
    message: "Hours must be nonempty when status is 'open'",
    path: ["hours"],
  }
);

export type DateString = z.infer<typeof DateSchema>;
export type Hours = z.infer<typeof HoursSchema>;
export type Day = z.infer<typeof DaySchema>;


// For each location, we either have valid data or null (if structure of data is incorrect)
// If endpoint fails, we return an error with kind and message
export type Result<T> = {
    ok: true;
    data: (T | null)[];
} | {
    ok: false;
    error: {
        kind: 'network' | 'upstream' | 'validation';
        message: string;
    }
};
