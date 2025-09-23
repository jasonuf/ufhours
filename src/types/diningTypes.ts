import * as z from 'zod';

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD');

const HoursSchema = z.object({
    start_hour: z.number(),
    start_minutes: z.number(),
    end_hour: z.number(),
    end_minutes: z.number()
});

const DaySchema = z.object({
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

export const DiningLocationSchema = z.object({
    id: z.string(),
    name: z.string(),
    is_building: z.boolean(),
    pay_with_meal_swipe: z.boolean(),
    pay_with_retail_swipe: z.boolean(),
    week: z.array(DaySchema).nonempty()
});

export type DiningLocation = z.infer<typeof DiningLocationSchema>;





