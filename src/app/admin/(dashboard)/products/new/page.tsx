import { requireAdmin } from "@/server/auth/session";
import { getActiveCategories } from "@/server/services/catalog";
import { PageHeader } from "../../ui";
import { ProductForm } from "../ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await getActiveCategories();

  return (
    <>
      <PageHeader title="Add product" description="It appears on the menu as soon as you publish it." />
      <ProductForm categories={categories} />
    </>
  );
}
