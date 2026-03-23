"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Plus, Edit, Ban, Trash2 } from "lucide-react";

import { MetricCard } from "@/components/dashboard/metric-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Product {
  product_id: number;
  company_id: number;
  name: string;
  sku: string | null;
  category_id: number | null;
  unit_id: number;
  product_type: "finished_good" | "raw_material" | "semi_finished" | "service" | "consumable";
  description: string | null;
  cost_price: number | null;
  selling_price: number | null;
  reorder_level: number | null;
  reorder_quantity: number | null;
  is_active: number | boolean;
  created_at: string | null;
  updated_at: string | null;
}

interface Category {
  category_id: number;
  company_id: number;
  name: string;
  description: string | null;
  parent_id: number | null;
  is_active: number | boolean;
}

interface Unit {
  unit_id: number;
  company_id: number;
  name: string;
  symbol: string | null;
  is_active: number | boolean;
}

interface Metric {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ComponentType<React.SVGAttributes<SVGSVGElement>>;
}

const GridIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width={7} height={7} x={3} y={3} />
    <rect width={7} height={7} x={14} y={3} />
    <rect width={7} height={7} x={14} y={14} />
    <rect width={7} height={7} x={3} y={14} />
  </svg>
);

const TagIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 7V3h4" />
    <path d="M21 3v4h-4" />
    <path d="M3 17v4h4" />
    <path d="M21 21v-4h-4" />
    <circle cx={12} cy={12} r={3} />
  </svg>
);

const TrendingIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <polyline points="3 17 9 11 13 15 21 7" />
    <polyline points="14 7 21 7 21 14" />
  </svg>
);

const ArchiveIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2" />
    <path d="m3 8 1.89 11.34A2 2 0 0 0 6.86 21h10.28a2 2 0 0 0 1.97-1.66L21 8" />
    <path d="M7 10h10" />
  </svg>
);

const formatRelativeDate = (input?: string | null) => {
  if (!input) return "No date";
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return "No date";
  const diffMs = Date.now() - parsed.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours <= 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 1 ? "Just now" : `${diffMinutes} mins ago`;
    }
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return "1 week ago";
  if (diffWeeks < 6) return `${diffWeeks} weeks ago`;
  return parsed.toLocaleDateString();
};

export function Catalog() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedItems, setDismissedItems] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<{ cost_price: string; selling_price: string }>({
    cost_price: '',
    selling_price: ''
  });
  const [processingProductId, setProcessingProductId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [productsRes, categoriesRes, unitsRes] = await Promise.all([
          fetch("/api/catalog/products"),
          fetch("/api/catalog/categories"),
          fetch("/api/units").catch(() => ({ ok: false, json: async () => ({ data: [] }) }))
        ]);

        const productsData = await productsRes.json();
        const categoriesData = await categoriesRes.json();
        const unitsData = await unitsRes.json();

        if (!productsRes.ok) {
          throw new Error(
            productsData?.error || "Failed to fetch products",
          );
        }
        if (!categoriesRes.ok) {
          throw new Error(
            categoriesData?.error || "Failed to fetch categories",
          );
        }

        if (isMounted) {
          setProducts((Array.isArray(productsData) ? productsData : []) as Product[]);
          setCategories((Array.isArray(categoriesData) ? categoriesData : []) as Category[]);
          setUnits((Array.isArray(unitsData?.data || unitsData) ? (unitsData?.data || unitsData) : []) as Unit[]);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unexpected error loading catalog",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const totals = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.is_active === true || p.is_active === 1).length;
    const archived = total - active;
    const services = products.filter((p) => p.product_type === "service").length;
    const rawMaterials = products.filter((p) => p.product_type === "raw_material").length;

    const averageMargin = (() => {
      const margins = products
        .map((product) => {
          if (product.cost_price == null || product.selling_price == null) return null;
          if (product.cost_price === 0) return null;
          const margin = ((product.selling_price - product.cost_price) / product.cost_price) * 100;
          return margin;
        })
        .filter((value): value is number => typeof value === "number");
      if (!margins.length) return 0;
      const totalMargin = margins.reduce((acc, value) => acc + value, 0);
      return Math.round(totalMargin / margins.length);
    })();

    const lowStock = products.filter((product) => {
      if (product.reorder_level == null || product.reorder_quantity == null) return false;
      if (product.reorder_level <= 0) return false;
      return product.reorder_quantity <= product.reorder_level;
    }).length;

    return {
      total,
      active,
      archived,
      services,
      rawMaterials,
      averageMargin,
      lowStock,
    };
  }, [products]);

  const metrics: Metric[] = useMemo(() => {
    return [
      {
        title: "Catalog Size",
        value: totals.total.toString(),
        change: `${totals.services} service items`,
        isPositive: totals.total > 0,
        icon: GridIcon,
      },
      {
        title: "Active SKUs",
        value: totals.active.toString(),
        change: `${totals.archived} archived`,
        isPositive: totals.active >= totals.archived,
        icon: TagIcon,
      },
      {
        title: "Average Margin",
        value: `${totals.averageMargin}%`,
        change: `${totals.rawMaterials} raw materials`,
        isPositive: totals.averageMargin >= 20,
        icon: TrendingIcon,
      },
      {
        title: "Low Stock Items",
        value: totals.lowStock.toString(),
        change: `${totals.total ? Math.round((totals.lowStock / (totals.total || 1)) * 100) : 0}% of catalog`,
        isPositive: totals.lowStock === 0,
        icon: ArchiveIcon,
      },
    ];
  }, [totals]);

  const categoryMix = useMemo(() => {
    if (!products.length) return [] as { name: string; products: number; contribution: string }[];
    const counts = new Map<number | "uncategorized", number>();
    products.forEach((product) => {
      const key = product.category_id ?? "uncategorized";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const total = products.length;
    const results = Array.from(counts.entries()).map(([key, count]) => {
      const categoryName =
        key === "uncategorized"
          ? "Uncategorized"
          : categories.find((category) => category.category_id === key)?.name || "Unknown";

      const contribution = `${Math.round((count / total) * 100)}%`;
      return {
        name: categoryName,
        products: count,
        contribution,
      };
    });

    return results.sort((a, b) => b.products - a.products);
  }, [categories, products]);

  const changeLog = useMemo(() => {
    return [...products]
      .sort((a, b) => {
        const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5)
      .map((product) => ({
        action: product.is_active === true || product.is_active === 1 ? "Updated" : "Archived",
        product: product.name,
        time: formatRelativeDate(product.updated_at || product.created_at),
        owner: product.product_type === "service" ? "Service" : "Catalog",
      }));
  }, [products]);

  const approvals = useMemo(() => {
    const needsPricing = (product: Product) => {
      // If the backend attached variants, pricing is stored in variants (packaged or bulk-default-variant).
      const variants = (product as any).variants;
      if (Array.isArray(variants) && variants.length > 0) {
        return !variants.some((v: any) => {
          const unit = Number(v.unit_price ?? v.price_per_unit ?? 0) || 0;
          const pkg = Number(v.package_price ?? v.price_per_package ?? 0) || 0;
          return unit > 0 || pkg > 0;
        });
      }

      // No variants available: fall back to product.selling_price if present.
      const selling = Number((product as any).selling_price ?? 0) || 0;
      return selling <= 0;
    };

    const pending = products.filter((product) => {
      const missingPricing = needsPricing(product);
      const inactive = !(product.is_active === true || product.is_active === 1);
      const productKey = product.sku || `ID-${product.product_id}`;
      // Filter out dismissed items
      if (dismissedItems.has(productKey)) {
        return false;
      }
      return missingPricing || inactive;
    });

    return pending.slice(0, 5).map((product) => ({
      product_id: product.product_id,
      sku: product.sku || `ID-${product.product_id}`,
      title: product.name,
      submitted: formatRelativeDate(product.created_at),
      owner: product.product_type === "service" ? "Service" : "Operations",
      status:
        needsPricing(product) ? "Pricing required"
          : "Inactive",
      missingPricing: needsPricing(product),
      inactive: !(product.is_active === true || product.is_active === 1),
    }));
  }, [products, dismissedItems]);

  // Handle form submission for editing product pricing
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    setProcessingProductId(editingProduct.product_id);
    try {
      const updatedProduct = {
        ...editingProduct,
        cost_price: formData.cost_price ? Number(formData.cost_price) : null,
        selling_price: formData.selling_price ? Number(formData.selling_price) : null,
      };
      const response = await api.put(`/catalog/products/${editingProduct.product_id}`, updatedProduct);
      
      if (response.error) {
        alert(`Failed to update product: ${response.error}`);
        return;
      }
      
      // Update local state directly for instant feedback
      setProducts(products.map(p => 
        p.product_id === editingProduct.product_id 
          ? { ...p, cost_price: updatedProduct.cost_price, selling_price: updatedProduct.selling_price }
          : p
      ));
      
      // Remove from dismissed items if it was there
      setDismissedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(editingProduct.sku || `ID-${editingProduct.product_id}`);
        return newSet;
      });
      
      // Close form
      setShowForm(false);
      setEditingProduct(null);
      setFormData({ cost_price: '', selling_price: '' });
    } catch (err) {
      console.error('Error updating product:', err);
      alert('Failed to update product. Please try again.');
    } finally {
      setProcessingProductId(null);
    }
  };

  // Handle resolve action - navigate to edit product or open edit form
  const handleResolve = async (item: { product_id: number; sku: string; missingPricing?: boolean; inactive?: boolean }) => {
    // If missing pricing, we should navigate to edit the product
    // If inactive, we might want to activate it
    try {
      // Find the product
      const product = products.find(p => p.product_id === item.product_id);
      if (!product) {
        console.error('Product not found');
        alert('Product not found. Please refresh the page.');
        return;
      }

      // If the issue is missing pricing, navigate to full edit form
      if (item.missingPricing) {
        // Navigate to products page with edit param for full form
        const isManagerDashboard = typeof window !== 'undefined' && window.location.pathname.includes('/dashboard/manager');
        if (isManagerDashboard) {
          router.push(`/dashboard/manager?section=products&edit=${product.product_id}`);
        } else {
          router.push(`/products?edit=${product.product_id}`);
        }
      } else if (item.inactive) {
        // If inactive, we can activate it directly via API
        const response = await api.put(`/catalog/products/${item.product_id}`, {
          ...product,
          is_active: 1,
        });

        if (response.error) {
          alert(`Failed to activate product: ${response.error}`);
          return;
        }

        // Reload products to reflect changes
        const productsRes = await fetch("/api/catalog/products");
        const productsData = await productsRes.json();
        if (productsRes.ok && Array.isArray(productsData)) {
          setProducts(productsData);
        }
        
        // Remove from dismissed if it was there
        setDismissedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(item.sku);
          return newSet;
        });
      }
    } catch (err) {
      console.error('Error resolving item:', err);
      alert('Failed to resolve item. Please try again.');
    }
  };

  // Handle dismiss action - hide item from exceptions list
  const handleDismiss = (sku: string) => {
    setDismissedItems(prev => new Set(prev).add(sku));
  };

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Catalog</h1>
        <p className="mt-2 text-foreground/60">
          Manage product data, lifecycle changes, and merchandising health.
        </p>
      </div>
        <Button
          onClick={() => {
            // Navigate to ProductsPage for adding new products
            const isManagerDashboard = typeof window !== 'undefined' && window.location.pathname.includes('/dashboard/manager');
            if (isManagerDashboard) {
              router.push('/dashboard/manager?section=products&add=true');
            } else {
              router.push('/products?add=true');
            }
          }}
          className="inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Edit Form Modal */}
      {showForm && editingProduct && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Edit Product: {editingProduct.name}</CardTitle>
            <CardDescription>Update pricing information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cost Price</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    placeholder={editingProduct.cost_price?.toString() || "0.00"}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Selling Price</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    placeholder={editingProduct.selling_price?.toString() || "0.00"}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingProduct(null);
                    setFormData({ cost_price: '', selling_price: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {error ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Unable to load catalog</CardTitle>
            <CardDescription className="text-destructive">
              {error}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Category Mix</CardTitle>
            <CardDescription>
              Distribution of items across catalog categories.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoryMix.map((category) => (
              <div
                key={category.name}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {category.name}
                  </p>
                  <p className="text-xs text-foreground/50 mt-1">
                    {category.products} products
                  </p>
                </div>
                <Badge variant="outline">{category.contribution}</Badge>
              </div>
            ))}
            {!categoryMix.length && !isLoading ? (
              <p className="text-sm text-foreground/50">No category data available.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* All Products - Left Side */}
        <Card className="border-border bg-card flex-1">
          <CardHeader>
            <CardTitle>All Products</CardTitle>
            <CardDescription>
              Total: {products.length} products
            </CardDescription>
          </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-sm text-foreground/50 text-center py-6">No products found.</p>
          ) : (
            <div className="space-y-3">
              {products.map((product) => {
                const category = categories.find(c => c.category_id === product.category_id);
                const categoryName = category?.name || 'Uncategorized';
                const productType = product.product_type?.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) || 'Unknown';
                const isActive = product.is_active === true || product.is_active === 1;
                
                return (
                  <div
                    key={product.product_id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    {/* Product Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-foreground">{product.name}</h3>
                        <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                          {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="text-xs text-foreground/60">({productType})</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-foreground/60">
                        <span>SKU: {product.sku || 'N/A'}</span>
                        <span>Category: {categoryName}</span>
                        <span>Unit: {(() => {
                          const unit = units.find(u => u.unit_id === product.unit_id);
                          return unit ? `${unit.name}${unit.symbol ? ` (${unit.symbol})` : ''}` : 'N/A';
                        })()}</span>
                      </div>
                    </div>

                    {/* Action Icons - Right Side */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-10 w-10 p-0"
                        disabled={processingProductId !== null}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Navigate to products page with edit param for full form
                          const isManagerDashboard = typeof window !== 'undefined' && window.location.pathname.includes('/dashboard/manager');
                          if (isManagerDashboard) {
                            router.push(`/dashboard/manager?section=products&edit=${product.product_id}`);
                          } else {
                            router.push(`/products?edit=${product.product_id}`);
                          }
                        }}
                        title="Edit"
                      >
                        <Edit className="h-5 w-5 text-blue-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-10 w-10 p-0"
                        disabled={processingProductId !== null}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to ${isActive ? 'deactivate' : 'activate'} ${product.name}?`)) {
                            setProcessingProductId(product.product_id);
                            try {
                              const response = await api.put(`/catalog/products/${product.product_id}`, {
                                ...product,
                                is_active: isActive ? 0 : 1,
                              });
                              if (!response.error && response.data) {
                                // Update local state directly for instant feedback
                                setProducts(products.map(p => 
                                  p.product_id === product.product_id 
                                    ? { ...p, is_active: isActive ? 0 : 1 }
                                    : p
                                ));
                              } else {
                                alert(`Failed to ${isActive ? 'deactivate' : 'activate'} product: ${response.error || 'Unknown error'}`);
                              }
                            } catch (err) {
                              console.error('Error updating product:', err);
                              alert(`Failed to ${isActive ? 'deactivate' : 'activate'} product`);
                            } finally {
                              setProcessingProductId(null);
                            }
                          }
                        }}
                        title={isActive ? "Deactivate" : "Activate"}
                      >
                        {processingProductId === product.product_id ? (
                          <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Ban className={`h-5 w-5 ${isActive ? 'text-orange-600' : 'text-green-600'}`} />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-10 w-10 p-0"
                        disabled={processingProductId !== null}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete ${product.name}? This action cannot be undone.`)) {
                            setProcessingProductId(product.product_id);
                            try {
                              const response = await api.delete(`/catalog/products/${product.product_id}`);
                              if (!response.error) {
                                // Remove from products list immediately
                                setProducts(products.filter(p => p.product_id !== product.product_id));
                                // Also remove from dismissed items if present
                                setDismissedItems(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(product.sku || `ID-${product.product_id}`);
                                  return newSet;
                                });
                              } else {
                                alert(`Failed to delete product: ${response.error || 'Unknown error'}`);
                              }
                            } catch (err) {
                              console.error('Error deleting product:', err);
                              alert('Failed to delete product');
                            } finally {
                              setProcessingProductId(null);
                            }
                          }
                        }}
                        title="Delete"
                      >
                        {processingProductId === product.product_id ? (
                          <div className="h-5 w-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="h-5 w-5 text-red-600" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
        </Card>

        {/* Catalog Exceptions - Right Side */}
        <Card className="border-border bg-card flex-1">
          <CardHeader>
            <CardTitle>Catalog Exceptions</CardTitle>
            <CardDescription>
              Items needing pricing, activation, or further action.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {approvals.map((item) => (
              <div
                key={item.sku}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {item.title}
                  </p>
                  <Badge variant="outline">{item.sku}</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-foreground/60">
                  <span>{item.status}</span>
                  <span>{item.owner}</span>
                  <span>{item.submitted}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleResolve(item);
                    }}
                  >
                    Resolve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDismiss(item.sku);
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
            {!approvals.length && !isLoading ? (
              <p className="text-sm text-foreground/50">
                No catalog exceptions at this time.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

