ALTER TABLE "order_items" ADD COLUMN "weight_grams" integer;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "weight_grams" integer;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_weight_check" CHECK ("product_variants"."weight_grams" is null or "product_variants"."weight_grams" > 0);