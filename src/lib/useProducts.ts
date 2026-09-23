"use client";

import { useCallback, useEffect, useState } from "react";
import { getProducts } from "@/server/products";
import type { Product } from "@/types";

/** The POS catalog — DB-backed, for pickers that just need the current list. */
export function useProducts(): Product[] {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    getProducts().then((rows) => {
      if (!cancelled) setProducts(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return products;
}

export function useProductsWithRefetch(): { products: Product[]; refetch: () => void } {
  const [products, setProducts] = useState<Product[]>([]);

  const refetch = useCallback(() => {
    getProducts().then(setProducts);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { products, refetch };
}
