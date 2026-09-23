"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import type { Product } from "@/types";

function toProduct(row: {
  id: string;
  name: string;
  category: string;
  price: number;
  meta: string;
  recur: string | null;
  variablePrice: boolean;
  sessionType: string | null;
  coachId: string | null;
}): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Product["category"],
    price: row.price,
    meta: row.meta,
    recur: row.recur ?? undefined,
    variablePrice: row.variablePrice,
    sessionType: row.sessionType ?? undefined,
    coachId: row.coachId ?? undefined,
  };
}

export async function getProducts(): Promise<Product[]> {
  const rows = await db.product.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } });
  return rows.map(toProduct);
}

export interface ProductInput {
  name: string;
  category: Product["category"];
  price: number;
  meta: string;
  recur?: string;
  variablePrice?: boolean;
  sessionType?: string;
  coachId?: string;
}

export async function addProduct(input: ProductInput): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");
  const row = await db.product.create({
    data: {
      name,
      category: input.category,
      price: Math.max(0, input.price),
      meta: input.meta.trim(),
      recur: input.recur?.trim() || null,
      variablePrice: input.variablePrice ?? false,
      sessionType: input.sessionType || null,
      coachId: input.coachId || null,
    },
  });
  revalidatePath("/settings");
  revalidatePath("/pos");
  return row.id;
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");
  await db.product.update({
    where: { id },
    data: {
      name,
      category: input.category,
      price: Math.max(0, input.price),
      meta: input.meta.trim(),
      recur: input.recur?.trim() || null,
      variablePrice: input.variablePrice ?? false,
      sessionType: input.sessionType || null,
      coachId: input.coachId || null,
    },
  });
  revalidatePath("/settings");
  revalidatePath("/pos");
}

/** Soft delete — keeps the row (and its price) intact for any historical Sale.lineItems that
    already reference it by name; just drops it out of POS/Settings going forward. */
export async function deactivateProduct(id: string): Promise<void> {
  await db.product.update({ where: { id }, data: { active: false } });
  revalidatePath("/settings");
  revalidatePath("/pos");
}
