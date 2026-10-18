import { requireAdmin } from "@/server/auth/session";
import { adminListCategories } from "@/server/services/catalog";
import { Card, EmptyState, PageHeader } from "../ui";
import { CategoryManager } from "./CategoryManager";

export const dynamic = "force-dynamic";

/**
 * Category management.
 *
 * Categories drive the menu's section order, so `displayOrder` is editable
 * here rather than hardcoded in a component — the whole point of moving the
 * menu into the database was that the owner controls this without a developer.
 */
export default async function AdminCategoriesPage() {
  await requireAdmin();
  const categories = await adminListCategories();

  return (
    <>
      <PageHeader
        title="Categories"
        description="The sections your menu is grouped into, in the order they appear."
      />

      <div className="px-5 py-6 sm:px-8">
        {categories.length === 0 ? (
          <Card>
            <EmptyState
              title="No categories yet"
              description="Add a category — Signature Favourites, Baklava & Pistachio — and products can be grouped into it."
            />
          </Card>
        ) : null}

        <CategoryManager categories={categories} />
      </div>
    </>
  );
}
