"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCategory, saveCategory, type ActionState } from "../actions";
import { ADMIN_BUTTON, ADMIN_BUTTON_SECONDARY, ADMIN_INPUT, ADMIN_LABEL, Badge, Card } from "../ui";
import type { Category } from "@/server/db/schema";
import { images } from "@/data/images";

const initial: ActionState = { status: "idle" };

type CategoryRow = Category & { productCount: number };

/**
 * Inline category editor.
 *
 * Editing happens in place rather than on a separate page: there are only ever
 * a handful of categories, and a round trip to a form for a rename would be
 * more friction than the task deserves.
 */
export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {categories.map((category) => (
          <li key={category.id}>
            {editing === category.id ? (
              <CategoryForm
                category={category}
                onDone={() => setEditing(null)}
              />
            ) : (
              <CategoryRowView
                category={category}
                onEdit={() => setEditing(category.id)}
              />
            )}
          </li>
        ))}
      </ul>

      {adding ? (
        <CategoryForm onDone={() => setAdding(false)} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={ADMIN_BUTTON}>
          Add category
        </button>
      )}
    </div>
  );
}

function CategoryRowView({
  category,
  onEdit,
}: {
  category: CategoryRow;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="flex flex-wrap items-center gap-4 p-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-800/8 text-[0.8rem] font-semibold text-forest-800">
        {category.displayOrder}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-forest-800">{category.name}</p>
          {category.active ? (
            <Badge tone="good">Visible</Badge>
          ) : (
            <Badge tone="neutral">Hidden</Badge>
          )}
          <span className="text-[0.78rem] text-ink-faint">
            {category.productCount} product{category.productCount === 1 ? "" : "s"}
          </span>
        </div>
        {category.description ? (
          <p className="mt-1 text-[0.82rem] text-ink-soft">{category.description}</p>
        ) : null}
        {error ? <p className="mt-1 text-[0.8rem] text-red-700">{error}</p> : null}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onEdit} className={ADMIN_BUTTON_SECONDARY}>
          Edit
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Delete "${category.name}"?`)) return;
            setError(null);
            startTransition(async () => {
              const result = await deleteCategory(category.id);
              if (result.status === "error") setError(result.message ?? "Could not delete.");
              else router.refresh();
            });
          }}
          className="rounded-[8px] border border-red-300 px-4 py-2.5 text-[0.82rem] font-semibold text-red-800 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </Card>
  );
}

function CategoryForm({
  category,
  onDone,
}: {
  category?: CategoryRow;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveCategory.bind(null, category?.id ?? null),
    initial,
  );
  const imageKeys = Object.keys(images);

  if (state.status === "success") {
    // Close and refresh once the server confirms.
    queueMicrotask(() => {
      router.refresh();
      onDone();
    });
  }

  return (
    <Card className="p-5">
      <form action={formAction} className="grid gap-4 sm:grid-cols-2">
        {state.status === "error" && state.message ? (
          <p role="alert" className="sm:col-span-2 rounded-[8px] border border-red-300 bg-red-50 px-3 py-2 text-[0.82rem] text-red-900">
            {state.message}
          </p>
        ) : null}

        <div>
          <label className={ADMIN_LABEL} htmlFor={`name-${category?.id ?? "new"}`}>Name</label>
          <input
            id={`name-${category?.id ?? "new"}`}
            name="name"
            required
            defaultValue={category?.name ?? ""}
            className={`mt-1.5 ${ADMIN_INPUT}`}
          />
        </div>

        <div>
          <label className={ADMIN_LABEL} htmlFor={`order-${category?.id ?? "new"}`}>Sort order</label>
          <input
            id={`order-${category?.id ?? "new"}`}
            name="displayOrder"
            inputMode="numeric"
            defaultValue={category?.displayOrder ?? 0}
            className={`mt-1.5 ${ADMIN_INPUT}`}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={ADMIN_LABEL} htmlFor={`desc-${category?.id ?? "new"}`}>Description</label>
          <input
            id={`desc-${category?.id ?? "new"}`}
            name="description"
            defaultValue={category?.description ?? ""}
            className={`mt-1.5 ${ADMIN_INPUT}`}
          />
        </div>

        <div>
          <label className={ADMIN_LABEL} htmlFor={`img-${category?.id ?? "new"}`}>Image</label>
          <select
            id={`img-${category?.id ?? "new"}`}
            name="image"
            defaultValue={category?.image ?? ""}
            className={`mt-1.5 ${ADMIN_INPUT}`}
          >
            <option value="">No image</option>
            {imageKeys.map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2.5 text-[0.85rem] text-ink">
            <input
              type="checkbox"
              name="active"
              defaultChecked={category?.active ?? true}
              className="h-4 w-4 accent-[#123b2a]"
            />
            Show on the menu
          </label>
        </div>

        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" disabled={pending} className={ADMIN_BUTTON}>
            {pending ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onDone} className={ADMIN_BUTTON_SECONDARY}>
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
