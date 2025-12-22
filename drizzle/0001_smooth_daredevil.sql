CREATE TABLE "dininglocationhours" (
	"id" varchar PRIMARY KEY NOT NULL,
	"dining_location_id" varchar NOT NULL,
	"service_date" date NOT NULL,
	"slot" smallint DEFAULT 0 NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"opens_at" time,
	"closes_at" time
);
--> statement-breakpoint
DROP TABLE "dining_location_hours" CASCADE;--> statement-breakpoint
CREATE INDEX "hours_location_date_idx" ON "dininglocationhours" USING btree ("dining_location_id","service_date");--> statement-breakpoint
CREATE UNIQUE INDEX "hours_location_date_slot_uniq" ON "dininglocationhours" USING btree ("dining_location_id","service_date","slot");