"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { parseInput } from "@/lib/validate";
import { ProductInputSchema, type ProductInput } from "@/lib/schemas";
import type { Product } from "@/types";

export type { ProductInput };

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

export async function addProduct(input: ProductInput): Promise<string> {
  const data = parseInput(ProductInputSchema, input);
  const row = await db.product.create({
    data: {
      name: data.name,
      category: data.category,
      price: data.price,
      meta: data.meta,
      recur: data.recur || null,
      variablePrice: data.variablePrice ?? false,
      sessionType: data.sessionType || null,
      coachId: data.coachId || null,
    },
  });
  revalidatePath("/settings");
  revalidatePath("/pos");
  return row.id;
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  const data = parseInput(ProductInputSchema, input);
  await db.product.update({
    where: { id },
    data: {
      name: data.name,
      category: data.category,
      price: data.price,
      meta: data.meta,
      recur: data.recur || null,
      variablePrice: data.variablePrice ?? false,
      sessionType: data.sessionType || null,
      coachId: data.coachId || null,
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
