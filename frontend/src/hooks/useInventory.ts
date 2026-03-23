"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export interface StockLevel {
  stock_level_id: number;
  company_id: number;
  product_id: number;
  variant_id?: number;
  location_id: number;
  quantity: number;
  safety_stock?: number;
}

export interface StockLocation {
  location_id: number;
  company_id: number;
  branch_id?: number;
  name: string;
  code?: string;
  is_default: boolean;
  is_active: boolean;
}

export function useInventory() {
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStockLevels = async () => {
    setLoading(true);
    setError(null);

    const response = await api.get<StockLevel[]>("/inventory/stock-levels");

    if (response.error) {
      setError(response.error);
      setLoading(false);
      return;
    }

    if (response.data) {
      setStockLevels(response.data);
    }

    setLoading(false);
  };

  const fetchLocations = async () => {
    setLoading(true);
    setError(null);

    const response = await api.get<StockLocation[]>("/inventory/locations");

    if (response.error) {
      setError(response.error);
      setLoading(false);
      return;
    }

    if (response.data) {
      setLocations(response.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchStockLevels();
    fetchLocations();
  }, []);

  return {
    stockLevels,
    locations,
    loading,
    error,
    fetchStockLevels,
    fetchLocations,
  };
}

