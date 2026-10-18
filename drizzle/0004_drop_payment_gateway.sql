ALTER TABLE "processed_webhook_events" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "processed_webhook_events" CASCADE;--> statement-breakpoint
DROP INDEX "orders_payment_reference_key";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "payment_reference";