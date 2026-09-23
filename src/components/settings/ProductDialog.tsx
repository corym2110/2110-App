"use client";

import { useState, useTransition } from "react";
import { addProduct, updateProduct, type ProductInput } from "@/server/products";
import { Select } from "@/components/ui/Select";
import { XIcon } from "@/components/ui/icons";
import { PRODUCT_CATEGORIES, type Product } from "@/types";
import type { CoachRow } from "@/server/coaches";

export function ProductDialog({
  editing,
  coaches,
  onClose,
  onSaved,
}: {
  /** Present when editing an existing product; absent when adding a new one. */
  editing?: Product;
  coaches: CoachRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [category, setCategory] = useState<Product["category"]>(editing?.category ?? "Personal Training");
  const [price, setPrice] = useState(editing ? String(editing.price) : "");
  const [meta, setMeta] = useState(editing?.meta ?? "");
  const [recur, setRecur] = useState(editing?.recur ?? "");
  const [variablePrice, setVariablePrice] = useState(editing?.variablePrice ?? false);
  const [coachId, setCoachId] = useState(editing?.coachId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSave = name.trim().length > 0;

  function save() {
    if (!canSave || isPending) return;
    setError(null);
    const input: ProductInput = {
      name,
      category,
      price: Number(price) || 0,
      meta,
      recur: recur || undefined,
      variablePrice,
      coachId: category === "Personal Training" && coachId ? coachId : undefined,
    };
    startTransition(async () => {
      try {
        if (editing) await updateProduct(editing.id, input);
        else await addProduct(input);
        onSaved();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save that product.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="popover-shadow flex w-full max-w-[420px] flex-col gap-3.5 rounded-2xl bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-medium tracking-tight">{editing ? "Edit product" : "Add product"}</div>
            <div className="text-[13px] text-muted">Shows up in POS right away.</div>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 flex-none place-items-center rounded-lg text-muted hover:bg-row hover:text-fg">
            <XIcon size={16} />
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11.5px] tracking-wider text-muted uppercase">Name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Personal Training – Alex"
            className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Category</span>
            <Select
              value={category}
              onChange={(v) => setCategory(v as Product["category"])}
              options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))}
              className="h-10 rounded-lg px-2.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Price</span>
            <input
              type="number"
              min={0}
              step={5}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm tabular-nums"
            />
          </label>
        </div>

        {category === "Personal Training" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Coach</span>
            <Select
              value={coachId}
              onChange={setCoachId}
              options={[{ value: "", label: "No specific coach" }, ...coaches.map((c) => ({ value: c.id, label: c.name }))]}
              className="h-10 rounded-lg px-2.5 text-sm"
            />
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Meta label</span>
            <input
              value={meta}
              onChange={(e) => setMeta(e.target.value)}
              placeholder="e.g. 1 session"
              className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Recurs</span>
            <input
              value={recur}
              onChange={(e) => setRecur(e.target.value)}
              placeholder="e.g. /month"
              className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={variablePrice} onChange={(e) => setVariablePrice(e.target.checked)} className="h-4 w-4" />
          Variable price — amount entered at checkout
        </label>

        {error && <div className="rounded-lg bg-bad/10 px-3 py-2.5 text-[12.5px] text-bad">{error}</div>}

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-full border border-divider px-4 text-[13.5px] hover:bg-row">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave || isPending}
            className="h-10 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-on-accent disabled:opacity-60"
          >
            {isPending ? "Saving…" : editing ? "Save changes" : "Add product"}
          </button>
        </div>
      </div>
    </div>
  );
}
