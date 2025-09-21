import * as z from 'zod';
import { DaySchema } from './dailyTypes.js';

export const DiningLocationSchema = z.object({
    name: z.string(),
    is_building: z.boolean(),
    pay_with_meal_swipe: z.boolean(),
    pay_with_retail_swipe: z.boolean(),
    week: z.array(DaySchema).nonempty()
});

export type DiningLocation = z.infer<typeof DiningLocationSchema>;



