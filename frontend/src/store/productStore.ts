"use client";

import { create } from "zustand";
import type { Product } from "@/hooks/useProducts";

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  setProducts: (products: Product[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  removeProduct: (id: number) => void;
  getProductById: (id: number) => Product | undefined;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  loading: false,
  error: null,

  setProducts: (products) => set({ products }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  addProduct: (product) =>
    set((state) => ({
      products: [...state.products, product],
    })),

  updateProduct: (product) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.product_id === product.product_id ? product : p
      ),
    })),

  removeProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.product_id !== id),
    })),

  getProductById: (id) => {
    return get().products.find((p) => p.product_id === id);
  },
}));

