CREATE TABLE "dining_location_hours" (
	"id" varchar PRIMARY KEY NOT NULL,
	"dining_location_id" varchar NOT NULL,
	"service_date" date NOT NULL,
	"slot" smallint DEFAULT 0 NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"opens_at" time,
	"closes_at" time
);
--> statement-breakpoint
CREATE TABLE "dininglocation" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_building" boolean,
	"pay_with_meal_swipe" boolean,
	"pay_with_retail_swipe" boolean,
	"building_id" varchar,
	"building_name" varchar(255)
);
--> statement-breakpoint
CREATE INDEX "hours_location_date_idx" ON "dining_location_hours" USING btree ("dining_location_id","service_date");--> statement-breakpoint
CREATE UNIQUE INDEX "hours_location_date_slot_uniq" ON "dining_location_hours" USING btree ("dining_location_id","service_date","slot");