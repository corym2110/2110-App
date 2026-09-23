import type { Product } from "@/types";

/** Product ids are DB-generated cuids, not stable slugs — name is the one unique, human-chosen
    field, so it's the safe key for "the default product for this session type" lookups. */
function productByName(name: string, products: Product[]): Product | undefined {
  return products.find((p) => p.name === name);
}

const DEFAULT_BY_TYPE: Record<string, string> = {
  "Group Training": "Group Personal Training",
  Class: "Class Drop-In",
  "Remote Consult": "Remote Coaching Consult",
  Bodpod: "BodPod – Single",
  "Blueprint and Baseline": "Blueprint & Baseline Assessment",
};

/** Match a schedule session-type + teaching coach to the POS product it should default to.
    Personal Training resolves to that specific coach's own product via `coachId`; falls back to
    Cory's rate when no coach is given or that coach has no product of their own yet. */
export function matchProduct(type: string, coachId: string | undefined, products: Product[]): Product | undefined {
  if (type === "Personal Training") {
    const own = coachId ? products.find((p) => p.category === "Personal Training" && p.coachId === coachId) : undefined;
    return own ?? productByName("Personal Training – Cory", products);
  }
  const name = DEFAULT_BY_TYPE[type];
  return name ? productByName(name, products) : undefined;
}
