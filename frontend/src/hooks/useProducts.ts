"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export interface Product {
  product_id: number;
  company_id: number;
  name: string;
  sku: string;
  barcode?: string;
  category_id?: number;
  unit_id: number;
  product_type: "finished_good" | "raw_material" | "semi_finished" | "service" | "consumable";
  description?: string;
  cost_price?: number;
  selling_price?: number;
  reorder_level?: number;
  reorder_quantity?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    const response = await api.get<Product[]>("/catalog/products");

    if (response.error) {
      setError(response.error);
      setLoading(false);
      return;
    }

    if (response.data) {
      setProducts(response.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const createProduct = async (productData: Partial<Product>) => {
    setLoading(true);
    setError(null);

    const response = await api.post<Product>("/catalog/products", productData);

    if (response.error) {
      setError(response.error);
      setLoading(false);
      return null;
    }

    if (response.data) {
      setProducts((prev) => [...prev, response.data!]);
      setLoading(false);
      return response.data;
    }

    setLoading(false);
    return null;
  };

  const updateProduct = async (id: number, productData: Partial<Product>) => {
    setLoading(true);
    setError(null);

    const response = await api.put<Product>(
      `/catalog/products/${id}`,
      productData
    );

    if (response.error) {
      setError(response.error);
      setLoading(false);
      return null;
    }

    if (response.data) {
      setProducts((prev) =>
        prev.map((p) => (p.product_id === id ? response.data! : p))
      );
      setLoading(false);
      return response.data;
    }

    setLoading(false);
    return null;
  };

  const deleteProduct = async (id: number) => {
    setLoading(true);
    setError(null);

    const response = await api.delete(`/catalog/products/${id}`);

    if (response.error) {
      setError(response.error);
      setLoading(false);
      return false;
    }

    setProducts((prev) => prev.filter((p) => p.product_id !== id));
    setLoading(false);
    return true;
  };

  return {
    products,
    loading,
    error,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}

