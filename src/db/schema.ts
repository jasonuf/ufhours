import {
  pgTable,
  varchar,
  date,
  time,
  boolean,
  smallint,
  index,
  uniqueIndex,
  serial,
  primaryKey
} from "drizzle-orm/pg-core";

export const DiningLocationTable = pgTable("dining_location", {
  id: varchar().primaryKey().notNull(),
  name: varchar({ length: 255 }).notNull(),
  is_building: boolean(),
  pay_with_meal_swipe: boolean(),
  pay_with_retail_swipe: boolean(),
  building_id: varchar(),
  building_name: varchar({ length: 255 }),
});

export const DiningLocationHours = pgTable("dining_location_hours",{
    dining_location_id: varchar("dining_location_id").notNull(),
    service_date: date("service_date").notNull(),
    slot: smallint("slot").notNull(),
    is_closed: boolean("is_closed").notNull().default(false),
    opens_at: time("opens_at"),
    closes_at: time("closes_at"),
  },
  (t) => [
    primaryKey({
      name: "hours_pk",
      columns: [t.dining_location_id, t.service_date, t.slot],
    }),
    index("hours_loc_date_idx").on(t.dining_location_id, t.service_date),
  ]
);
