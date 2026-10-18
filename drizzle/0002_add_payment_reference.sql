ALTER TABLE "orders" ADD COLUMN "payment_reference" varchar(255);--> statement-breakpoint
-- Carry across any existing gateway reference before the old column is dropped
-- in the next migration. Both columns were uniquely indexed, so this cannot
-- introduce a duplicate.
UPDATE "orders" SET "payment_reference" = "payment_intent_id" WHERE "payment_intent_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_payment_reference_key" ON "orders" USING btree ("payment_reference") WHERE "orders"."payment_reference" is not null;