import "server-only";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  categories,
  products,
  productVariants,
  type Category,
  type Product,
  type ProductVariant,
} from "@/server/db/schema";

/**
 * Catalogue reads.
 *
 * Public queries only ever return live catalogue: active, non-archived, and
 * (for purchase) available. Admin queries use the `admin*` variants, which see
 * everything. Keeping the two apart means a draft product can't leak onto the
 * menu because someone forgot a `where` clause.
 */

export type VariantView = Pick<
  ProductVariant,
  | "id"
  | "name"
  | "sku"
  | "price"
  | "weightGrams"
  | "active"
  | "inventoryTracked"
  | "stockQuantity"
  | "minQuantity"
  | "maxQuantity"
  | "displayOrder"
>;

export type ProductView = Product & {
  variants: VariantView[];
  categoryName: string | null;
  categorySlug: string | null;
};

export type CategoryView = Category & { products: ProductView[] };

/** True when at least one variant can actually be bought right now. */
export function isPurchasable(product: { available: boolean; active: boolean; variants: VariantView[] }) {
  if (!product.active || !product.available) return false;
  return product.variants.some(
    (v) => v.active && (!v.inventoryTracked || v.stockQuantity > 0),
  );
}

export function cheapestVariant(variants: VariantView[]): VariantView | null {
  const sellable = variants.filter((v) => v.active);
  if (sellable.length === 0) return null;
  return sellable.reduce((min, v) => (v.price < min.price ? v : min));
}

const liveProduct = and(
  eq(products.active, true),
  isNull(products.archivedAt),
);

/** Groups flat join rows into products with their variants, preserving order. */
function groupProducts(
  rows: {
    product: Product;
    variant: ProductVariant | null;
    categoryName: string | null;
    categorySlug: string | null;
  }[],
  opts: { activeVariantsOnly: boolean },
): ProductView[] {
  const map = new Map<string, ProductView>();

  for (const row of rows) {
    let entry = map.get(row.product.id);
    if (!entry) {
      entry = {
        ...row.product,
        variants: [],
        categoryName: row.categoryName,
        categorySlug: row.categorySlug,
      };
      map.set(row.product.id, entry);
    }
    if (row.variant && (!opts.activeVariantsOnly || row.variant.active)) {
      entry.variants.push(row.variant);
    }
  }

  for (const product of map.values()) {
    product.variants.sort(
      (a, b) => a.displayOrder - b.displayOrder || a.price - b.price,
    );
  }

  return [...map.values()];
}

const productSelection = {
  product: products,
  variant: productVariants,
  categoryName: categories.name,
  categorySlug: categories.slug,
};

/** The whole public menu, grouped by category, ready to render. */
export async function getMenu(): Promise<CategoryView[]> {
  const [cats, rows] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(eq(categories.active, true))
      .orderBy(asc(categories.displayOrder), asc(categories.name)),
    db
      .select(productSelection)
      .from(products)
      .leftJoin(productVariants, eq(productVariants.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(liveProduct)
      .orderBy(asc(products.displayOrder), asc(products.name)),
  ]);

  const all = groupProducts(rows, { activeVariantsOnly: true });
  // A product with no sellable size is a configuration mistake, not a menu item.
  const sellable = all.filter((p) => p.variants.length > 0);

  return cats.map((category) => ({
    ...category,
    products: sellable.filter((p) => p.categoryId === category.id),
  }));
}

export async function getFeaturedProducts(limit = 6): Promise<ProductView[]> {
  const rows = await db
    .select(productSelection)
    .from(products)
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(liveProduct, eq(products.featured, true)))
    .orderBy(asc(products.displayOrder), asc(products.name));

  return groupProducts(rows, { activeVariantsOnly: true })
    .filter((p) => p.variants.length > 0)
    .slice(0, limit);
}

export async function getProductBySlug(slug: string): Promise<ProductView | null> {
  const rows = await db
    .select(productSelection)
    .from(products)
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.slug, slug), isNull(products.archivedAt)))
    .orderBy(asc(productVariants.displayOrder));

  // Unavailable products keep their page (with the purchase controls hidden)
  // so the URL doesn't 404 while something is temporarily sold out.
  const [product] = groupProducts(rows, { activeVariantsOnly: true });
  if (!product || !product.active) return null;
  return product;
}

/** Products in the same category, for the "you might also like" rail. */
export async function getRelatedProducts(
  product: ProductView,
  limit = 3,
): Promise<ProductView[]> {
  if (!product.categoryId) return [];

  const rows = await db
    .select(productSelection)
    .from(products)
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(liveProduct, eq(products.categoryId, product.categoryId)))
    .orderBy(asc(products.displayOrder));

  return groupProducts(rows, { activeVariantsOnly: true })
    .filter((p) => p.id !== product.id && p.variants.length > 0)
    .slice(0, limit);
}

/** Every live product slug — used by the sitemap and static params. */
export async function getAllProductSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return db
    .select({ slug: products.slug, updatedAt: products.updatedAt })
    .from(products)
    .where(liveProduct);
}

export async function getActiveCategories(): Promise<Category[]> {
  return db
    .select()
    .from(categories)
    .where(eq(categories.active, true))
    .orderBy(asc(categories.displayOrder), asc(categories.name));
}

/**
 * Lightweight menu search over product and category names.
 *
 * Deliberately a SQL `ILIKE` rather than a search service: the menu is a few
 * dozen items, and standing up Algolia/Meilisearch for that would be
 * infrastructure the shop has to pay for and maintain for no gain.
 */
export async function searchProducts(query: string): Promise<ProductView[]> {
  const term = query.trim();
  if (term.length < 2) return [];
  const pattern = `%${term.replace(/[%_]/g, (m) => `\\${m}`)}%`;

  const rows = await db
    .select(productSelection)
    .from(products)
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        liveProduct,
        or(
          sql`${products.name} ILIKE ${pattern}`,
          sql`${products.alsoKnownAs} ILIKE ${pattern}`,
          sql`${categories.name} ILIKE ${pattern}`,
        ),
      ),
    )
    .orderBy(asc(products.displayOrder), asc(products.name));

  return groupProducts(rows, { activeVariantsOnly: true }).filter(
    (p) => p.variants.length > 0,
  );
}

/* ── Admin reads (see archived and inactive rows) ───────────────────────── */

export async function adminListProducts(): Promise<ProductView[]> {
  const rows = await db
    .select(productSelection)
    .from(products)
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(asc(products.displayOrder), asc(products.name));

  return groupProducts(rows, { activeVariantsOnly: false });
}

export async function adminGetProduct(id: string): Promise<ProductView | null> {
  const rows = await db
    .select(productSelection)
    .from(products)
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, id));

  return groupProducts(rows, { activeVariantsOnly: false })[0] ?? null;
}

export async function adminListCategories(): Promise<(Category & { productCount: number })[]> {
  const rows = await db
    .select({
      category: categories,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(
      products,
      and(eq(products.categoryId, categories.id), isNull(products.archivedAt)),
    )
    .groupBy(categories.id)
    .orderBy(asc(categories.displayOrder), asc(categories.name));

  return rows.map((r) => ({ ...r.category, productCount: r.productCount }));
}

/**
 * Ensures a slug is unique by appending -2, -3, … as needed.
 * `excludeId` lets an edit keep its own slug.
 */
export async function uniqueSlug(
  table: "products" | "categories",
  base: string,
  excludeId?: string,
): Promise<string> {
  const target = table === "products" ? products : categories;
  const existing = await db.select({ slug: target.slug, id: target.id }).from(target);
  const taken = new Set(
    existing.filter((r) => r.id !== excludeId).map((r) => r.slug),
  );

  if (!taken.has(base)) return base;
  for (let i = 2; i < 500; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}
