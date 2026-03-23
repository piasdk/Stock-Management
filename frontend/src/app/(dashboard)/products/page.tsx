"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Package, TrendingUp, AlertCircle, Box, Eye, Edit2, Power, PowerOff, Trash2, X, Wrench } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import ProductRegistration from '@/components/products/ProductRegistration';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CheckCircle, Plus, Edit, Trash2 as TrashIcon } from 'lucide-react';

type Product = {
  product_id: number;
  name: string;
  sku: string | null;
  category_id: number | null;
  category_name?: string;
  unit_id: number | null;
  unit?: string | null;
  product_type: "finished_good" | "raw_material" | "semi_finished" | "service" | "consumable" | "packaged" | "bulk";
  material_classification?: "finished_product" | "raw_material" | "semi_finished" | null;
  is_active: number;
  cost_price: number | null;
  selling_price: number | null;
  updated_at: string | null;
  created_at: string | null;
  brand?: string | null;
  bulk_unit?: string | null;
  variants?: Array<{
    variant_id: number;
    variant_name: string;
    variant_sku: string;
    unit_price: number | null;
    package_price: number | null;
    selling_price: number | null;
    [key: string]: any;
  }>;
};

type Category = {
  category_id: number;
  name: string;
};

type Unit = {
  unit_id: number;
  name: string;
  short_code: string;
};

type Tool = {
  tool_id?: number;
  company_id: number;
  branch_id: number;
  category_id: number;
  tool_name: string;
  tool_code?: string | null;
  quantity?: number;
  unit?: string | null;
  condition_status?: string | null;
  location?: string | null;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
};

type ToolCategory = {
  category_id: number;
  name: string;
  description?: string | null;
};

const CatalogDashboard = () => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  
  // Tab state - Tools moved to Production Supervisor Dashboard
  const [activeTab] = useState<'products'>('products');
  
  // Products state (existing)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState<'all' | 'a-z' | 'z-a'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterMaterialClassification, setFilterMaterialClassification] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedItems, setDismissedItems] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLDivElement>(null);
  
  // Tools state
  const [tools, setTools] = useState<Tool[]>([]);
  const [toolCategories, setToolCategories] = useState<ToolCategory[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [showToolForm, setShowToolForm] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [toolFormData, setToolFormData] = useState({
    tool_name: "",
    tool_code: "",
    category_id: "",
    quantity: 1,
    unit: "",
    condition_status: "good",
    location: "",
    is_active: true,
  });
  const [toolSubmitting, setToolSubmitting] = useState(false);
  const [toolFormError, setToolFormError] = useState<string | null>(null);
  const [toolFormSuccess, setToolFormSuccess] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category_id: '',
    product_type: 'finished_good',
    unit_id: '',
    is_active: true,
    cost_price: '',
    selling_price: '',
    description: '',
    reorder_level: '',
    reorder_quantity: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, categoriesRes, unitsRes] = await Promise.all([
        api.get<Product[]>('/catalog/products'),
        api.get<Category[]>(`/catalog/categories${companyId ? `?companyId=${companyId}` : ''}`),
        api.get<Unit[]>(`/units${companyId ? `?companyId=${companyId}` : ''}`),
      ]);

      if (productsRes.error) {
        setError(productsRes.error);
      } else {
        setProducts(productsRes.data || []);
      }

      if (categoriesRes.data) {
        setCategories(categoriesRes.data);
      }

      if (unitsRes.data) {
        setUnits(unitsRes.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Load tools and tool categories
  const loadTools = async () => {
    setToolsLoading(true);
    setToolsError(null);
    try {
      const [toolsRes, categoriesRes] = await Promise.all([
        api.get<Tool[]>(`/catalog/tools${companyId ? `?companyId=${companyId}` : ''}`),
        api.get<ToolCategory[]>(`/catalog/tool-categories${companyId ? `?companyId=${companyId}` : ''}`),
      ]);
      
      if (toolsRes.error) {
        // If endpoint doesn't exist yet, use empty array
        setTools([]);
      } else {
        setTools(toolsRes.data || []);
      }

      if (categoriesRes.data) {
        setToolCategories(categoriesRes.data);
      } else {
        // If categories endpoint doesn't exist, use empty array
        setToolCategories([]);
      }
    } catch (err) {
      // If tools endpoint doesn't exist, just use empty array
      setTools([]);
      setToolCategories([]);
    } finally {
      setToolsLoading(false);
    }
  };

  // Handle tool form submission
  const handleToolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToolSubmitting(true);
    setToolFormError(null);
    setToolFormSuccess(null);

    try {
      if (!toolFormData.category_id) {
        setToolFormError("Category is required");
        setToolSubmitting(false);
        return;
      }

      const branchId = user?.branch_id || null;
      if (!branchId) {
        setToolFormError("Branch ID is required. Please ensure you are assigned to a branch.");
        setToolSubmitting(false);
        return;
      }

      const payload = {
        company_id: companyId,
        branch_id: branchId,
        category_id: Number(toolFormData.category_id),
        tool_name: toolFormData.tool_name,
        tool_code: toolFormData.tool_code || null,
        quantity: Number(toolFormData.quantity) || 1,
        unit: toolFormData.unit || null,
        condition_status: toolFormData.condition_status || null,
        location: toolFormData.location || null,
        is_active: toolFormData.is_active ? 1 : 0,
      };

      let response;
      if (editingTool?.tool_id) {
        response = await api.put(`/catalog/tools/${editingTool.tool_id}`, payload);
      } else {
        response = await api.post('/catalog/tools', payload);
      }

      if (response.error) {
        setToolFormError(response.error);
        setToolSubmitting(false);
        return;
      }

      setToolFormSuccess(editingTool ? "Tool updated successfully!" : "Tool created successfully!");
      setToolFormData({
        tool_name: "",
        tool_code: "",
        category_id: "",
        quantity: 1,
        unit: "",
        condition_status: "good",
        location: "",
        is_active: true,
      });
      setShowToolForm(false);
      setEditingTool(null);
      
      await loadTools();
      
      // Clear success message after 3 seconds
      setTimeout(() => setToolFormSuccess(null), 3000);
    } catch (err) {
      setToolFormError(err instanceof Error ? err.message : 'Failed to save tool');
    } finally {
      setToolSubmitting(false);
    }
  };

  // Handle tool edit
  const handleToolEdit = (tool: Tool) => {
    setEditingTool(tool);
    setToolFormData({
      tool_name: tool.tool_name || "",
      tool_code: tool.tool_code || "",
      category_id: tool.category_id ? String(tool.category_id) : "",
      quantity: tool.quantity || 1,
      unit: tool.unit || "",
      condition_status: tool.condition_status || "good",
      location: tool.location || "",
      is_active: tool.is_active === 1,
    });
    setShowToolForm(true);
    setToolFormError(null);
    setToolFormSuccess(null);
  };

  // Handle tool delete
  const handleToolDelete = async (toolId: number) => {
    if (!confirm(`Are you sure you want to delete this tool? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await api.delete(`/catalog/tools/${toolId}`);
      if (response.error) {
        setToolsError(response.error);
        return;
      }

      await loadTools();
    } catch (err) {
      setToolsError(err instanceof Error ? err.message : 'Failed to delete tool');
    }
  };

  // Transform products for display
  const transformedProducts = useMemo(() => {
    return products.map(p => {
      const category = categories.find(c => c.category_id === p.category_id);
      const unitById = units.find(u => u.unit_id === p.unit_id);
      const unitByName = units.find(u => u.name === (p as any).unit || u.short_code === (p as any).unit);
      const unit = unitById ?? unitByName;
      const unitDisplay = (p as any).unit || unit?.name || unit?.short_code || 'N/A';

      const variants = (p as any).variants;
      const derivedSellingPrice = (() => {
        if (Array.isArray(variants) && variants.length > 0) {
          const firstPriced = variants.find((v: any) =>
            (v.unit_price != null && Number(v.unit_price) > 0) ||
            (v.price_per_unit != null && Number(v.price_per_unit) > 0) ||
            (v.package_price != null && Number(v.package_price) > 0) ||
            (v.price_per_package != null && Number(v.price_per_package) > 0)
          ) || variants[0];
          const unitPrice = Number(firstPriced?.unit_price ?? firstPriced?.price_per_unit ?? 0) || 0;
          const packagePrice = Number(firstPriced?.package_price ?? firstPriced?.price_per_package ?? 0) || 0;
          return unitPrice > 0 ? unitPrice : (packagePrice > 0 ? packagePrice : null);
        }
        return p.selling_price ?? null;
      })();

      const daysAgo = p.updated_at 
        ? Math.floor((Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        product_id: p.product_id,
        name: p.name,
        sku: p.sku || 'N/A',
        category: category?.name || 'Uncategorized',
        category_id: p.category_id,
        type: (p.product_type && String(p.product_type).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())) || 'N/A',
        unit: unitDisplay,
        unit_id: p.unit_id ?? unit?.unit_id ?? null,
        status: p.is_active === 1 ? 'Active' : 'Inactive',
        variantCount: (p.variants && Array.isArray(p.variants)) ? p.variants.length : 0,
        needsPricing: (() => {
          // If variants are present, pricing comes from variants (packaged or bulk-default-variant).
          if (p.variants && Array.isArray(p.variants) && p.variants.length > 0) {
            return !p.variants.some((v: any) =>
              (v.unit_price != null && Number(v.unit_price) > 0) ||
              (v.price_per_unit != null && Number(v.price_per_unit) > 0) ||
              (v.package_price != null && Number(v.package_price) > 0) ||
              (v.price_per_package != null && Number(v.price_per_package) > 0)
            );
          }
          // No variants: fall back to product-level selling_price if present.
          return !p.selling_price || p.selling_price === 0;
        })(),
        updatedBy: 'Catalog',
        daysAgo,
        updated_at: p.updated_at,
        created_at: p.created_at,
        cost_price: p.cost_price,
        selling_price: derivedSellingPrice,
        product_type: p.product_type,
        material_classification: p.material_classification,
        is_active: p.is_active,
        variants: (Array.isArray(variants)) ? variants : [],
      };
    });
  }, [products, categories, units]);

  const filteredProducts = transformedProducts.filter(p => {
    // Search filter
    const matchesSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Category filter
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    
    // Sort order will be applied after filtering
    
    // Date filter (created_at)
    const matchesDate = (() => {
      if (!filterDateFrom && !filterDateTo) return true;
      if (!p.created_at) return false;
      
      const productDate = new Date(p.created_at);
      const fromDate = filterDateFrom ? new Date(filterDateFrom) : null;
      const toDate = filterDateTo ? new Date(filterDateTo) : null;
      
      if (fromDate && toDate) {
        // Set to end of day for toDate
        toDate.setHours(23, 59, 59, 999);
        return productDate >= fromDate && productDate <= toDate;
      } else if (fromDate) {
        return productDate >= fromDate;
      } else if (toDate) {
        toDate.setHours(23, 59, 59, 999);
        return productDate <= toDate;
      }
      return true;
    })();
    
    // Material classification filter
    const matchesMaterialClassification = filterMaterialClassification === 'all' ||
      (filterMaterialClassification === 'finished_product' && p.material_classification === 'finished_product') ||
      (filterMaterialClassification === 'raw_material' && p.material_classification === 'raw_material');
    
    // Type filter (packaged or bulk)
    const matchesType = filterType === 'all' ||
      (filterType === 'packaged' && p.product_type === 'packaged') ||
      (filterType === 'bulk' && p.product_type === 'bulk');
    
    return matchesSearch && matchesCategory && matchesDate && 
           matchesMaterialClassification && matchesType;
  });
  
  // Apply sorting after filtering
  const sortedAndFilteredProducts = useMemo(() => {
    let sorted = [...filteredProducts];
    
    if (sortOrder === 'a-z') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === 'z-a') {
      sorted.sort((a, b) => b.name.localeCompare(a.name));
    }
    
    return sorted;
  }, [filteredProducts, sortOrder]);

  const exceptions = transformedProducts.filter(p =>
    p.needsPricing && !dismissedItems.has(String(p.product_id))
  );

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = products.length;
    const active = products.filter(p => p.is_active === 1).length;
    const archived = total - active;
    const services = products.filter(p => p.product_type === 'service').length;
    const rawMaterials = products.filter(p => p.product_type === 'raw_material').length;
    
    const averageMargin = (() => {
      const margins = products
        .map(p => {
          if (!p.cost_price || !p.selling_price || p.cost_price === 0) return null;
          return ((p.selling_price - p.cost_price) / p.cost_price) * 100;
        })
        .filter((m): m is number => m !== null);
      if (!margins.length) return 0;
      return Math.round(margins.reduce((a, b) => a + b, 0) / margins.length);
    })();

    const lowStock = products.filter(p => {
      // This would need reorder_level and reorder_quantity from backend
      return false; // Placeholder
    }).length;

    return { total, active, archived, services, rawMaterials, averageMargin, lowStock };
  }, [products]);

  // Category mix
  const categoryMix = useMemo(() => {
    const counts = new Map<string, number>();
    transformedProducts.forEach(p => {
      const cat = p.category;
      counts.set(cat, (counts.get(cat) || 0) + 1);
    });
    
    const total = transformedProducts.length;
    return Array.from(counts.entries()).map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  }, [transformedProducts]);

  // Product type distribution
  const typeDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    transformedProducts.forEach(p => {
      const type = p.type;
      counts.set(type, (counts.get(type) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
  }, [transformedProducts]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const selectedUnit = formData.unit_id ? units.find(u => u.unit_id === Number(formData.unit_id)) : null;
      const unitString = selectedUnit ? (selectedUnit.name || selectedUnit.short_code) : null;
      const payload = {
        name: formData.name,
        sku: formData.sku || null,
        category_id: formData.category_id ? Number(formData.category_id) : null,
        unit: unitString,
        unit_id: formData.unit_id ? Number(formData.unit_id) : null,
        product_type: formData.product_type,
        company_id: companyId,
        is_active: formData.is_active ? 1 : 0,
        cost_price: formData.cost_price ? Number(formData.cost_price) : null,
        selling_price: formData.selling_price ? Number(formData.selling_price) : null,
        description: formData.description || null,
        reorder_level: formData.reorder_level ? Number(formData.reorder_level) : null,
        reorder_quantity: formData.reorder_quantity ? Number(formData.reorder_quantity) : null,
      };

      let response;
      if (editingProduct) {
        response = await api.put(`/catalog/products/${editingProduct.product_id}`, payload);
      } else {
        response = await api.post('/catalog/products', payload);
      }

      if (response.error) {
        setError(response.error);
        setIsSubmitting(false);
        return;
      }

      // Reset form and reload data
      setFormData({
        name: '',
        sku: '',
        category_id: '',
        product_type: 'finished_good',
        unit_id: '',
        is_active: true,
        cost_price: '',
        selling_price: '',
        description: '',
        reorder_level: '',
        reorder_quantity: '',
      });
      setShowAddProduct(false);
      setEditingProduct(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle view (read-only)
  const handleView = (product: typeof transformedProducts[0]) => {
    const originalProduct = products.find(p => p.product_id === product.product_id);
    if (!originalProduct) return;
    setViewingProduct(originalProduct);
  };

  // Handle edit
  const handleEdit = (product: typeof transformedProducts[0]) => {
    const originalProduct = products.find(p => p.product_id === product.product_id);
    if (!originalProduct) return;
    const productUnit = (originalProduct as any).unit;
    const resolvedUnitId = originalProduct.unit_id ?? units.find(u => u.name === productUnit || u.short_code === productUnit)?.unit_id;

    setEditingProduct(originalProduct);
    setFormData({
      name: originalProduct.name,
      sku: originalProduct.sku || '',
      category_id: originalProduct.category_id ? String(originalProduct.category_id) : '',
      product_type: originalProduct.product_type,
      unit_id: resolvedUnitId != null ? String(resolvedUnitId) : '',
      is_active: originalProduct.is_active === 1,
      cost_price: originalProduct.cost_price ? String(originalProduct.cost_price) : '',
      selling_price: originalProduct.selling_price ? String(originalProduct.selling_price) : '',
      description: '',
      reorder_level: '',
      reorder_quantity: '',
    });
    setShowAddProduct(true);
    
    // Scroll to form after a brief delay to ensure it's rendered
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Handle delete - permanently removes product from database
  const handleDelete = async (productId: number) => {
    if (!confirm('Are you sure you want to permanently delete this product? This action cannot be undone. The product and all its variants will be removed from the database.')) return;

    try {
      const response = await api.delete(`/catalog/products/${productId}`);
      if (response.error) {
        // Check if it's a 409 conflict (foreign key constraint)
        if (response.error.includes('referenced') || response.error.includes('Cannot delete')) {
          alert(`Cannot delete this product: ${response.error}\n\nPlease use the deactivate button instead if you want to hide it without removing it permanently.`);
        } else {
          setError(response.error);
        }
        return;
      }

      // Clear dismissed items and reload data
      setDismissedItems(new Set());
      await loadData();
    } catch (err: any) {
      console.error('Error deleting product:', err);
      setError(err.message || 'Failed to delete product');
    }
  };

  // Handle toggle active
  const handleToggleActive = async (product: Product) => {
    const newActiveStatus = product.is_active === 1 ? 0 : 1;
    
    const response = await api.put(`/catalog/products/${product.product_id}`, {
      ...product,
      is_active: newActiveStatus,
    });

    if (response.error) {
      setError(response.error);
      return;
    }

    await loadData();
  };

  // Handle resolve (for exceptions)
  const handleResolve = (product: typeof transformedProducts[0]) => {
    handleEdit(product);
  };

  // Handle dismiss
  const handleDismiss = (productId: number) => {
    setDismissedItems(prev => new Set(prev).add(String(productId)));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      category_id: '',
      product_type: 'finished_good',
      unit_id: '',
      is_active: true,
      cost_price: '',
      selling_price: '',
      description: '',
      reorder_level: '',
      reorder_quantity: '',
    });
    setEditingProduct(null);
    setShowAddProduct(false);
  };

  if (loading && activeTab === 'products') {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products & Tools</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage products and tools for your operations
            </p>
          </div>
        </div>

        {/* Products Section */}
        <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Products</h2>
              <button 
                onClick={() => {
                  resetForm();
                  setShowAddProduct(true);
                  setTimeout(() => {
                    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
              >
                {showAddProduct ? 'Cancel' : 'Add Product'}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="mt-2 text-xs text-red-600 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* View Product Details Modal */}
        {viewingProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Product Details</h2>
                <button
                  onClick={() => setViewingProduct(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{viewingProduct.name}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{viewingProduct.sku || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        viewingProduct.is_active === 1 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {viewingProduct.is_active === 1 ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {categories.find(c => c.category_id === viewingProduct.category_id)?.name || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {(viewingProduct as any).unit || units.find(u => u.unit_id === viewingProduct.unit_id)?.name || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {(() => {
                        const variants = (viewingProduct as any).variants;
                        if (Array.isArray(variants) && variants.length > 0) {
                          const firstPriced = variants.find((v: any) =>
                            (v.unit_price != null && Number(v.unit_price) > 0) ||
                            (v.price_per_unit != null && Number(v.price_per_unit) > 0) ||
                            (v.package_price != null && Number(v.package_price) > 0) ||
                            (v.price_per_package != null && Number(v.price_per_package) > 0)
                          ) || variants[0];
                          const unit = Number(firstPriced?.unit_price ?? firstPriced?.price_per_unit ?? 0) || 0;
                          const pkg = Number(firstPriced?.package_price ?? firstPriced?.price_per_package ?? 0) || 0;
                          const display = unit > 0 ? unit : (pkg > 0 ? pkg : 0);
                          return display > 0 ? `RWF ${display.toLocaleString()}` : 'N/A';
                        }
                        const selling = Number((viewingProduct as any).selling_price ?? 0) || 0;
                        return selling > 0 ? `RWF ${selling.toLocaleString()}` : 'N/A';
                      })()}
                    </p>
                  </div>
                </div>
                
                {/* Additional Information */}
                {(viewingProduct.brand || viewingProduct.material_classification) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {viewingProduct.brand && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                        <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{viewingProduct.brand}</p>
                      </div>
                    )}
                    
                    {viewingProduct.material_classification && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Material Classification</label>
                        <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg capitalize">
                          {viewingProduct.material_classification ? String(viewingProduct.material_classification).replace(/_/g, ' ') : 'N/A'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Variants */}
                {viewingProduct.variants && viewingProduct.variants.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product Variants</label>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      {viewingProduct.variants.map((variant: any, idx: number) => (
                        <div key={variant.variant_id || idx} className="border-b border-gray-200 pb-3 last:border-b-0 last:pb-0">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Name:</span>
                              <p className="font-medium text-gray-900">{variant.variant_name || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">SKU:</span>
                              <p className="font-medium text-gray-900">{variant.variant_sku || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Unit Price:</span>
                              <p className="font-medium text-gray-900">
                                {variant.unit_price ? `RWF ${Number(variant.unit_price).toLocaleString()}` : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600">Package Price:</span>
                              <p className="font-medium text-gray-900">
                                {variant.package_price ? `RWF ${Number(variant.package_price).toLocaleString()}` : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Timestamps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {viewingProduct.created_at 
                        ? new Date(viewingProduct.created_at).toLocaleString() 
                        : 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {viewingProduct.updated_at 
                        ? new Date(viewingProduct.updated_at).toLocaleString() 
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    const productToEdit = transformedProducts.find(p => p.product_id === viewingProduct.product_id);
                    if (productToEdit) {
                      setViewingProduct(null);
                      handleEdit(productToEdit);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Product
                </button>
                <button
                  onClick={() => setViewingProduct(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Product Form */}
        {showAddProduct && (
          <div ref={formRef}>
            <ProductRegistration 
              initialProduct={editingProduct ? {
                ...editingProduct,
                material_classification: editingProduct.material_classification ? String(editingProduct.material_classification) : undefined,
                brand: editingProduct.brand ?? undefined,
                description: editingProduct.description ?? undefined
              } as any : undefined}
              onSuccess={async () => {
                setShowAddProduct(false);
                setEditingProduct(null);
                // Clear dismissed items to refresh exceptions list after update
                setDismissedItems(new Set());
                await loadData();
              }}
              onCancel={() => {
                setShowAddProduct(false);
                setEditingProduct(null);
              }}
            />
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Catalog Size</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.total}</p>
                <p className="text-xs text-gray-500 mt-2">{metrics.services} service items<span className="text-gray-400"> vs last month</span></p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Active SKUs</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.active}</p>
                <p className="text-xs text-gray-500 mt-2">{metrics.archived} archived<span className="text-gray-400"> vs last month</span></p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                <Box className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Average Margin</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.averageMargin}%</p>
                <p className="text-xs text-gray-500 mt-2">{metrics.rawMaterials} raw materials<span className="text-gray-400"> vs last month</span></p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Low Stock Items</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.lowStock}</p>
                <p className="text-xs text-gray-500 mt-2">{metrics.total > 0 ? Math.round((metrics.lowStock / metrics.total) * 100) : 0}% of catalog<span className="text-gray-400"> vs last month</span></p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Exceptions Alert */}
        {exceptions.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Catalog Exceptions</h3>
              <p className="text-xs text-gray-600 mt-0.5">Items needing pricing, activation, or further action.</p>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                {exceptions.map((item) => (
                  <div key={item.product_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-3">
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <span className="text-xs text-gray-500">{item.sku}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-orange-600 font-medium">Pricing required</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">Operations</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{item.daysAgo} {item.daysAgo === 1 ? 'day' : 'days'} ago</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button 
                        onClick={() => handleResolve(item)}
                        className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition"
                      >
                        Resolve
                      </button>
                      <button 
                        onClick={() => handleDismiss(item.product_id)}
                        className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Category Mix */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Category Mix</h3>
              <p className="text-xs text-gray-600 mt-0.5">Distribution of items across catalog categories.</p>
            </div>
            <div className="p-5 space-y-4">
              {categoryMix.length > 0 ? (
                categoryMix.map((cat, idx) => (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-900">{cat.name}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-gray-900">{cat.count} {cat.count === 1 ? 'product' : 'products'}</span>
                        <span className="text-xs text-gray-500 ml-2">{cat.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded h-2">
                      <div 
                        className={`h-2 rounded ${idx % 2 === 0 ? 'bg-blue-500' : 'bg-green-500'}`} 
                        style={{width: `${cat.percentage}%`}}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No categories yet</p>
              )}
            </div>
          </div>

          {/* Recent Updates */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Recent Updates</h3>
              <p className="text-xs text-gray-600 mt-0.5">Latest catalog activity and product lifecycle changes.</p>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                {transformedProducts
                  .sort((a, b) => {
                    const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                    const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                    return bTime - aTime;
                  })
                  .slice(0, 5)
                  .map((item) => (
                  <div key={item.product_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.daysAgo === 0 ? 'Today' : `${item.daysAgo} ${item.daysAgo === 1 ? 'day' : 'days'} ago`} 
                        <span className="text-gray-400"> •</span> By {item.updatedBy}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button 
                        onClick={() => handleEdit(item)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Inspect
                      </button>
                      <button 
                        onClick={() => handleToggleActive(products.find(p => p.product_id === item.product_id)!)}
                        className="text-xs text-gray-600 hover:underline"
                      >
                        {item.status === 'Active' ? 'Archive' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
                {transformedProducts.length === 0 && (
                  <p className="text-sm text-gray-500">No recent updates</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Product List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Product Type Distribution</h3>
                <p className="text-xs text-gray-600 mt-0.5">Breakdown of products by type across the catalog.</p>
              </div>
            </div>
            <div className="flex gap-4 mb-4 flex-wrap">
              {typeDistribution.map((type, idx) => (
                <div 
                  key={type.type}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded ${idx % 2 === 0 ? 'bg-blue-50' : 'bg-purple-50'}`}
                >
                  <span className={`text-xs font-medium ${idx % 2 === 0 ? 'text-blue-700' : 'text-purple-700'}`}>
                    {type.type}
                  </span>
                  <span className={`text-xs font-semibold ${idx % 2 === 0 ? 'text-blue-900' : 'text-purple-900'}`}>
                    {type.count} {type.count === 1 ? 'product' : 'products'}
                  </span>
                </div>
              ))}
              {typeDistribution.length === 0 && (
                <p className="text-xs text-gray-500">No product types yet</p>
              )}
            </div>
          </div>

          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">All Products</h3>
              <span className="text-xs text-gray-600">Total: {sortedAndFilteredProducts.length} products</span>
            </div>
            
            {/* Filter Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {/* Search */}
              <div className="xl:col-span-2">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Category Filter */}
              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.category_id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Sort Order */}
              <div>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'all' | 'a-z' | 'z-a')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Sort: Default</option>
                  <option value="a-z">Sort: A-Z</option>
                  <option value="z-a">Sort: Z-A</option>
                </select>
              </div>
              
              {/* Material Classification Filter */}
              <div>
                <select
                  value={filterMaterialClassification}
                  onChange={(e) => setFilterMaterialClassification(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Materials</option>
                  <option value="finished_product">Finished Product</option>
                  <option value="raw_material">Raw Material</option>
                </select>
              </div>
              
              {/* Type Filter */}
              <div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="packaged">Packaged</option>
                  <option value="bulk">Bulk</option>
                </select>
              </div>
            </div>
            
            {/* Date Range Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">From Date</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">To Date</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Clear Filters Button */}
            {(filterCategory !== 'all' || sortOrder !== 'all' || filterDateFrom || filterDateTo || 
              filterMaterialClassification !== 'all' || filterType !== 'all' || searchTerm) && (
              <div className="mt-3">
                <button
                  onClick={() => {
                    setFilterCategory('all');
                    setSortOrder('all');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                    setFilterMaterialClassification('all');
                    setFilterType('all');
                    setSearchTerm('');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          <div className="divide-y divide-gray-100">
            {sortedAndFilteredProducts.length > 0 ? (
              sortedAndFilteredProducts.map((product) => {
                const originalProduct = products.find(p => p.product_id === product.product_id);
                if (!originalProduct) return null;

                return (
                  <div key={product.product_id} className="px-5 py-4 hover:bg-gray-50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-baseline gap-3 mb-1">
                          <p className="text-sm font-medium text-gray-900">{product.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            product.status === 'Active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {product.status}
                          </span>
                          <span className="text-xs text-gray-500">({product.type})</span>
                          {product.product_type === 'packaged' && product.variantCount > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                              {product.variantCount} {product.variantCount === 1 ? 'variant' : 'variants'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>SKU: <span className="font-mono text-gray-900">{product.sku}</span></span>
                          <span className="text-gray-400">•</span>
                          <span>Category: {product.category}</span>
                          <span className="text-gray-400">•</span>
                          <span>Unit: {product.unit}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-4">
                        <button 
                          onClick={() => handleView(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEdit(product)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleToggleActive(originalProduct)}
                          className={`p-2 rounded transition ${
                            product.status === 'Active' 
                              ? 'text-orange-600 hover:bg-orange-50' 
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={product.status === 'Active' ? 'Deactivate' : 'Activate'}
                        >
                          {product.status === 'Active' ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </button>
                        <button 
                          onClick={() => handleDelete(product.product_id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-5 py-8 text-center text-gray-500">
                <p className="text-sm">No products found</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default CatalogDashboard;
