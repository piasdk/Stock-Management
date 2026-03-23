"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";

type Category = {
  category_id: number;
  name: string;
};

type Unit = {
  unit_id: number;
  name: string;
  short_code: string;
};

const productTypes = [
  { value: "finished_good", label: "Finished Good" },
  { value: "raw_material", label: "Raw Material" },
  { value: "semi_finished", label: "Semi-Finished" },
  { value: "service", label: "Service" },
  { value: "consumable", label: "Consumable" },
];

const initialForm = {
  name: "",
  sku: "",
  barcode: "",
  category_id: "",
  unit_id: "",
  product_type: "finished_good",
  description: "",
  cost_price: "",
  selling_price: "",
  reorder_level: "",
  reorder_quantity: "",
  is_active: true,
};

export function ProductForm() {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadLookups = async () => {
      setIsLoading(true);
      try {
        const [categoriesRes, unitsRes] = await Promise.all([
          api.get<Category[]>(`/catalog/categories?companyId=${companyId ?? ""}`),
          api.get<Unit[]>(`/units?companyId=${companyId ?? ""}`),
        ]);

        if (isMounted) {
          setCategories(categoriesRes.data ?? []);
          setUnits(unitsRes.data ?? []);
        }
      } catch (err) {
        if (isMounted) {
          setError("Unable to load lookup data.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadLookups();
    return () => {
      isMounted = false;
    };
  }, [companyId]);

  const isFormValid = useMemo(() => {
    return Boolean(form.name.trim() && form.product_type);
  }, [form]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) {
      setError("Product name and type are required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const payload = {
      name: form.name,
      sku: form.sku || null,
      barcode: form.barcode || null,
      category_id: form.category_id ? Number(form.category_id) : null,
      unit_id: form.unit_id ? Number(form.unit_id) : null,
      product_type: form.product_type,
      description: form.description || null,
      cost_price: form.cost_price ? Number(form.cost_price) : null,
      selling_price: form.selling_price ? Number(form.selling_price) : null,
      reorder_level: form.reorder_level ? Number(form.reorder_level) : null,
      reorder_quantity: form.reorder_quantity ? Number(form.reorder_quantity) : null,
      company_id: companyId ?? null,
      is_active: form.is_active ? 1 : 0,
    };

    const response = await api.post("/catalog/products", payload);

    if (response.error) {
      setError(response.error);
      setIsSubmitting(false);
      return;
    }

    setMessage("Product created successfully.");
    setForm(initialForm);
    setIsSubmitting(false);
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Create Product</CardTitle>
        <CardDescription>
          Publish catalog items with pricing, unit, and reorder details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Premium Juice"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU/reference</Label>
                <Input
                  id="sku"
                  value={form.sku}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, sku: event.target.value }))
                  }
                  placeholder="SKU-12345"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product_type">Product Type *</Label>
                <select
                  id="product_type"
                  value={form.product_type}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, product_type: event.target.value }))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  {productTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category_id">Category</Label>
                <select
                  id="category_id"
                  value={form.category_id}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, category_id: event.target.value }))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="unit_id">Unit of Measure</Label>
                <select
                  id="unit_id"
                  value={form.unit_id}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, unit_id: event.target.value }))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select unit</option>
                  {units.map((unit) => (
                    <option key={unit.unit_id} value={unit.unit_id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost_price">Cost Price</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  value={form.cost_price}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, cost_price: event.target.value }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="selling_price">Selling Price</Label>
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  value={form.selling_price}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, selling_price: event.target.value }))
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reorder_level">Reorder Level</Label>
                <Input
                  id="reorder_level"
                  type="number"
                  value={form.reorder_level}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, reorder_level: event.target.value }))
                  }
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorder_quantity">Reorder Quantity</Label>
                <Input
                  id="reorder_quantity"
                  type="number"
                  value={form.reorder_quantity}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, reorder_quantity: event.target.value }))
                  }
                  placeholder="50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={form.barcode}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, barcode: event.target.value }))
                }
                placeholder="EAN / UPC"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Optional notes about packaging, use, or sizing"
              />
            </div>

            <div className="flex items-center gap-2 text-sm">
              <input
                id="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, is_active: event.target.checked }))
                }
                className="h-4 w-4 rounded border border-input"
              />
              <Label htmlFor="is_active" className="text-sm font-normal">
                Mark product as active (visible in catalog)
              </Label>
            </div>

            {error && <ErrorMessage error={error} />}
            {message && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {message}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                variant="ghost"
                className="text-emerald-500 hover:text-emerald-300 border-transparent hover:bg-transparent shadow-none cursor-pointer transition-colors duration-150 ease-in-out"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  "Create Product"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground hover:text-muted-foreground/80 border-transparent hover:bg-transparent shadow-none cursor-pointer"
                onClick={() => setForm(initialForm)}
              >
                Reset
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

