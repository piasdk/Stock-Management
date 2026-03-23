"use client";

import { create } from "zustand";
import type { StockLevel, StockLocation } from "@/hooks/useInventory";

interface InventoryState {
  stockLevels: StockLevel[];
  locations: StockLocation[];
  loading: boolean;
  error: string | null;
  setStockLevels: (levels: StockLevel[]) => void;
  setLocations: (locations: StockLocation[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateStockLevel: (level: StockLevel) => void;
  addStockLevel: (level: StockLevel) => void;
  removeStockLevel: (id: number) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  stockLevels: [],
  locations: [],
  loading: false,
  error: null,

  setStockLevels: (levels) => set({ stockLevels: levels }),
  setLocations: (locations) => set({ locations }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  updateStockLevel: (level) =>
    set((state) => ({
      stockLevels: state.stockLevels.map((l) =>
        l.stock_level_id === level.stock_level_id ? level : l
      ),
    })),

  addStockLevel: (level) =>
    set((state) => ({
      stockLevels: [...state.stockLevels, level],
    })),

  removeStockLevel: (id) =>
    set((state) => ({
      stockLevels: state.stockLevels.filter((l) => l.stock_level_id !== id),
    })),
}));

