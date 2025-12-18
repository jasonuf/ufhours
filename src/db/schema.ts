import { integer, pgTable, varchar } from "drizzle-orm/pg-core";
import { boolean } from "drizzle-orm/pg-core";

export const DiningLocationTable = pgTable("DiningLocation", {
  id: varchar().primaryKey().notNull(),
  name: varchar({ length: 255 }).notNull(),
  is_building: boolean(),
  pay_with_meal_swipe: boolean(),
  pay_with_retail_swipe: boolean(),
  building_id: varchar(),
  building_name: varchar({ length: 255 }),
});
