import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { adminGetProduct, getActiveCategories } from "@/server/services/catalog";
import { PageHeader } from "../../ui";
import { ProductForm } from "../ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [product, categories] = await Promise.all([
    adminGetProduct(id),
    getActiveCategories(),
  ]);

  if (!product) notFound();

  return (
    <>
      <PageHeader title={product.name} description={`/menu/${product.slug}`} />
      <ProductForm product={product} categories={categories} />
    </>
  );
}
