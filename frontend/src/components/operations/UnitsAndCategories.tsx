"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { useAuthStore } from "@/store/authStore";
import { Tag, Plus, Edit, Trash2, CheckCircle, XCircle, Package, Ruler } from "lucide-react";

type Unit = {
  unit_id: number;
  company_id: number | null;
  name: string;
  symbol: string;
  unit_type: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

type Category = {
  category_id: number;
  company_id: number | null;
  name: string;
  description: string | null;
  parent_category_id: number | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export function UnitsAndCategories() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'units' | 'categories'>('units');
  
  // Units state
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitFormData, setUnitFormData] = useState({
    name: "",
    symbol: "",
    unit_type: "weight",
    is_active: true,
  });
  const [unitSubmitting, setUnitSubmitting] = useState(false);
  const [unitFormError, setUnitFormError] = useState<string | null>(null);
  const [unitFormSuccess, setUnitFormSuccess] = useState<string | null>(null);

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
    parent_category_id: "",
    is_active: true,
  });
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);
  const [categoryFormSuccess, setCategoryFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'units') {
      loadUnits();
    } else {
      loadCategories();
    }
  }, [activeTab]);

  const loadUnits = async () => {
    setUnitsLoading(true);
    setUnitsError(null);

    const response = await api.get<Unit[]>("/units");

    if (response.error) {
      // Handle 404 as endpoint not implemented yet
      if (response.error.includes("404") || response.error.includes("Not Found")) {
        setUnitsError(null); // Don't show error for missing endpoint
        setUnits([]); // Set empty array
      } else {
        setUnitsError(response.error);
      }
      setUnitsLoading(false);
      return;
    }

    // Handle different response formats
    let unitsData: Unit[] = [];
    if (Array.isArray(response.data)) {
      unitsData = response.data;
    } else if (response.data && typeof response.data === 'object') {
      if (Array.isArray(response.data.data)) {
        unitsData = response.data.data;
      } else if (Array.isArray(response.data.units)) {
        unitsData = response.data.units;
      } else if (Array.isArray(response.data.items)) {
        unitsData = response.data.items;
      }
    }

    setUnits(unitsData);
    setUnitsLoading(false);
  };

  const loadCategories = async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);

    const response = await api.get<Category[]>("/catalog/categories");

    if (response.error) {
      // Handle 404 as endpoint not implemented yet
      if (response.error.includes("404") || response.error.includes("Not Found")) {
        setCategoriesError(null); // Don't show error for missing endpoint
        setCategories([]); // Set empty array
      } else {
        setCategoriesError(response.error);
      }
      setCategoriesLoading(false);
      return;
    }

    // Handle different response formats
    // If response.data is an array, use it directly
    // If response.data has a data property, use that
    // If response.data has a categories property, use that
    let categoriesData: Category[] = [];
    if (Array.isArray(response.data)) {
      categoriesData = response.data;
    } else if (response.data && typeof response.data === 'object') {
      if (Array.isArray(response.data.data)) {
        categoriesData = response.data.data;
      } else if (Array.isArray(response.data.categories)) {
        categoriesData = response.data.categories;
      } else if (Array.isArray(response.data.items)) {
        categoriesData = response.data.items;
      }
    }

    setCategories(categoriesData);
    setCategoriesLoading(false);
  };

  const handleUnitSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUnitFormError(null);
    setUnitFormSuccess(null);

    if (!unitFormData.name.trim()) {
      setUnitFormError("Unit name is required");
      return;
    }

    if (!unitFormData.symbol.trim()) {
      setUnitFormError("Unit symbol is required");
      return;
    }

    setUnitSubmitting(true);

    if (editingUnit) {
      const response = await api.put<Unit>(`/units/${editingUnit.unit_id}`, {
        name: unitFormData.name,
        symbol: unitFormData.symbol,
        unit_type: unitFormData.unit_type,
        is_active: unitFormData.is_active,
      });

      if (response.error) {
        if (response.error.includes("404") || response.error.includes("Not Found")) {
          setUnitFormError("This endpoint is not yet implemented on the backend. Please contact your administrator.");
        } else {
          setUnitFormError(response.error);
        }
        setUnitSubmitting(false);
        return;
      }

      setUnitFormSuccess("Unit updated successfully!");
      setUnitSubmitting(false);
      setShowUnitForm(false);
      setEditingUnit(null);
      setUnitFormData({ name: "", symbol: "", unit_type: "weight", is_active: true });
      loadUnits();
      setTimeout(() => setUnitFormSuccess(null), 3000);
    } else {
      const response = await api.post<Unit>("/units", {
        name: unitFormData.name,
        symbol: unitFormData.symbol,
        unit_type: unitFormData.unit_type,
        is_active: unitFormData.is_active,
        company_id: user?.company_id || null,
      });

      if (response.error) {
        if (response.error.includes("404") || response.error.includes("Not Found")) {
          setUnitFormError("This endpoint is not yet implemented on the backend. Please contact your administrator.");
        } else {
          setUnitFormError(response.error);
        }
        setUnitSubmitting(false);
        return;
      }

      setUnitFormSuccess("Unit created successfully!");
      setUnitSubmitting(false);
      setShowUnitForm(false);
      setUnitFormData({ name: "", symbol: "", unit_type: "weight", is_active: true });
      loadUnits();
      setTimeout(() => setUnitFormSuccess(null), 3000);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCategoryFormError(null);
    setCategoryFormSuccess(null);

    if (!categoryFormData.name.trim()) {
      setCategoryFormError("Category name is required");
      return;
    }

    setCategorySubmitting(true);

    if (editingCategory) {
      const response = await api.put<Category>(`/catalog/categories/${editingCategory.category_id}`, {
        name: categoryFormData.name,
        description: categoryFormData.description || null,
        parent_category_id: categoryFormData.parent_category_id ? parseInt(categoryFormData.parent_category_id) : null,
        is_active: categoryFormData.is_active,
      });

      if (response.error) {
        if (response.error.includes("404") || response.error.includes("Not Found")) {
          setCategoryFormError("This endpoint is not yet implemented on the backend. Please contact your administrator.");
        } else {
          setCategoryFormError(response.error);
        }
        setCategorySubmitting(false);
        return;
      }

      setCategoryFormSuccess("Category updated successfully!");
      setCategorySubmitting(false);
      setShowCategoryForm(false);
      setEditingCategory(null);
      setCategoryFormData({ name: "", description: "", parent_category_id: "", is_active: true });
      loadCategories();
      setTimeout(() => setCategoryFormSuccess(null), 3000);
    } else {
      const response = await api.post<Category>("/catalog/categories", {
        name: categoryFormData.name,
        description: categoryFormData.description || null,
        parent_category_id: categoryFormData.parent_category_id ? parseInt(categoryFormData.parent_category_id) : null,
        is_active: categoryFormData.is_active,
        company_id: user?.company_id || null,
      });

      if (response.error) {
        if (response.error.includes("404") || response.error.includes("Not Found")) {
          setCategoryFormError("This endpoint is not yet implemented on the backend. Please contact your administrator.");
        } else {
          setCategoryFormError(response.error);
        }
        setCategorySubmitting(false);
        return;
      }

      setCategoryFormSuccess("Category created successfully!");
      setCategorySubmitting(false);
      setShowCategoryForm(false);
      setCategoryFormData({ name: "", description: "", parent_category_id: "", is_active: true });
      loadCategories();
      setTimeout(() => setCategoryFormSuccess(null), 3000);
    }
  };

  const handleEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitFormData({
      name: unit.name,
      symbol: unit.symbol,
      unit_type: unit.unit_type,
      is_active: unit.is_active === 1,
    });
    setShowUnitForm(true);
    setUnitFormError(null);
    setUnitFormSuccess(null);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || "",
      parent_category_id: category.parent_category_id?.toString() || "",
      is_active: category.is_active === 1,
    });
    setShowCategoryForm(true);
    setCategoryFormError(null);
    setCategoryFormSuccess(null);
  };

  const handleDeleteUnit = async (unitId: number) => {
    if (!confirm("Are you sure you want to delete this unit? This action cannot be undone.")) {
      return;
    }

    setUnitsError(null);
    const response = await api.delete(`/units/${unitId}`);

    if (response.error) {
      setUnitsError(response.error);
      return;
    }

    loadUnits();
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm("Are you sure you want to delete this category? This action cannot be undone.")) {
      return;
    }

    setCategoriesError(null);
    const response = await api.delete(`/catalog/categories/${categoryId}`);

    if (response.error) {
      setCategoriesError(response.error);
      return;
    }

    loadCategories();
  };

  const handleCancelUnit = () => {
    setShowUnitForm(false);
    setEditingUnit(null);
    setUnitFormData({ name: "", symbol: "", unit_type: "weight", is_active: true });
    setUnitFormError(null);
    setUnitFormSuccess(null);
  };

  const handleCancelCategory = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
    setCategoryFormData({ name: "", description: "", parent_category_id: "", is_active: true });
    setCategoryFormError(null);
    setCategoryFormSuccess(null);
  };

  const getUnitTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      weight: "Weight",
      volume: "Volume",
      length: "Length",
      area: "Area",
      count: "Count",
      other: "Other"
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Units & Categories</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage units of measurement and product categories
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('units')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'units'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Ruler className="w-4 h-4 inline mr-2" />
          Units
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'categories'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Tag className="w-4 h-4 inline mr-2" />
          Categories
        </button>
      </div>

      {/* Units Tab */}
      {activeTab === 'units' && (
        <>
          {unitsError && <ErrorMessage error={unitsError} />}
          {unitFormSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {unitFormSuccess}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Units of Measurement</h2>
            <Button
              type="button"
              variant="ghost"
              className="text-emerald-500 hover:text-emerald-200 border-transparent hover:bg-transparent shadow-none cursor-pointer transition-colors duration-150 ease-in-out"
              onClick={() => {
                setShowUnitForm(true);
                setEditingUnit(null);
                setUnitFormData({ name: "", symbol: "", unit_type: "weight", is_active: true });
                setUnitFormError(null);
                setUnitFormSuccess(null);
              }}
              disabled={showUnitForm}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Unit
            </Button>
          </div>

          {showUnitForm && (
            <Card className="border border-gray-200 bg-white">
              <CardHeader>
                <CardTitle>{editingUnit ? "Edit Unit" : "Create New Unit"}</CardTitle>
                <CardDescription>
                  {editingUnit
                    ? "Update the unit details below"
                    : "Fill in the details to create a new unit of measurement"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUnitSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit_name">Unit Name *</Label>
                    <Input
                      id="unit_name"
                      type="text"
                      placeholder="e.g., Kilogram, Liter, Meter"
                      value={unitFormData.name}
                      onChange={(e) =>
                        setUnitFormData({ ...unitFormData, name: e.target.value })
                      }
                      disabled={unitSubmitting}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Display name for the unit
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit_symbol">Symbol *</Label>
                    <Input
                      id="unit_symbol"
                      type="text"
                      placeholder="e.g., kg, L, m"
                      value={unitFormData.symbol}
                      onChange={(e) =>
                        setUnitFormData({ ...unitFormData, symbol: e.target.value })
                      }
                      disabled={unitSubmitting}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Abbreviation or symbol for the unit
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit_type">Unit Type *</Label>
                    <select
                      id="unit_type"
                      value={unitFormData.unit_type}
                      onChange={(e) =>
                        setUnitFormData({ ...unitFormData, unit_type: e.target.value })
                      }
                      disabled={unitSubmitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="weight">Weight</option>
                      <option value="volume">Volume</option>
                      <option value="length">Length</option>
                      <option value="area">Area</option>
                      <option value="count">Count</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {editingUnit && (
                    <div className="space-y-2">
                      <Label htmlFor="unit_is_active">Active</Label>
                      <div className="flex items-center gap-2">
                        <input
                          id="unit_is_active"
                          type="checkbox"
                          checked={unitFormData.is_active}
                          onChange={(e) =>
                            setUnitFormData({ ...unitFormData, is_active: e.target.checked })
                          }
                          disabled={unitSubmitting}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor="unit_is_active" className="text-sm font-normal">
                          Unit is active and can be used
                        </Label>
                      </div>
                    </div>
                  )}

                  {unitFormError && <ErrorMessage error={unitFormError} />}

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={unitSubmitting}
                      variant="ghost"
                      className="text-emerald-500 font-semibold hover:text-emerald-200 border-transparent hover:bg-transparent shadow-none cursor-pointer transition-colors duration-150 ease-in-out"
                    >
                      {unitSubmitting ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          {editingUnit ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        <>
                          {editingUnit ? (
                            <>
                              <Edit className="mr-2 h-4 w-4" />
                              Update Unit
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Create Unit
                            </>
                          )}
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-red-600 hover:text-red-300 border-transparent hover:bg-transparent shadow-none cursor-pointer transition-colors duration-150 ease-in-out"
                      onClick={handleCancelUnit}
                      disabled={unitSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="border border-gray-200 bg-white">
            <CardHeader>
              <CardTitle>Available Units</CardTitle>
              <CardDescription>
                {unitsLoading ? "Loading..." : units.length === 0
                  ? "No units found. Create your first unit to get started."
                  : `Total: ${units.length} unit${units.length !== 1 ? "s" : ""}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unitsLoading ? (
                <div className="flex min-h-[40vh] items-center justify-center">
                  <LoadingSpinner size="lg" />
                </div>
              ) : units.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center text-gray-500">
                  <Ruler className="h-10 w-10 text-blue-600" />
                  <p className="text-lg font-semibold text-gray-900">No units yet</p>
                  <p className="text-sm">
                    Create your first unit to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {units.map((unit) => (
                    <div
                      key={unit.unit_id}
                      className="flex items-start justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-gray-900">{unit.name}</p>
                          <span className="text-sm text-gray-600">({unit.symbol})</span>
                          {unit.is_active === 0 && (
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                              Inactive
                            </span>
                          )}
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            {getUnitTypeLabel(unit.unit_type)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUnit(unit)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUnit(unit.unit_id)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <>
          {categoriesError && <ErrorMessage error={categoriesError} />}
          {categoryFormSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {categoryFormSuccess}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Product Categories</h2>
            <Button
              type="button"
              variant="ghost"
              className="text-emerald-500 hover:text-emerald-200 border-transparent hover:bg-transparent shadow-none cursor-pointer transition-colors duration-150 ease-in-out"
              onClick={() => {
                setShowCategoryForm(true);
                setEditingCategory(null);
                setCategoryFormData({ name: "", description: "", parent_category_id: "", is_active: true });
                setCategoryFormError(null);
                setCategoryFormSuccess(null);
              }}
              disabled={showCategoryForm}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>

          {showCategoryForm && (
            <Card className="border border-gray-200 bg-white">
              <CardHeader>
                <CardTitle>{editingCategory ? "Edit Category" : "Create New Category"}</CardTitle>
                <CardDescription>
                  {editingCategory
                    ? "Update the category details below"
                    : "Fill in the details to create a new product category"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category_name">Category Name *</Label>
                    <Input
                      id="category_name"
                      type="text"
                      placeholder="e.g., Electronics, Food & Beverages"
                      value={categoryFormData.name}
                      onChange={(e) =>
                        setCategoryFormData({ ...categoryFormData, name: e.target.value })
                      }
                      disabled={categorySubmitting}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Display name for the category
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category_description">Description</Label>
                    <Input
                      id="category_description"
                      type="text"
                      placeholder="Brief description of the category"
                      value={categoryFormData.description}
                      onChange={(e) =>
                        setCategoryFormData({ ...categoryFormData, description: e.target.value })
                      }
                      disabled={categorySubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parent_category">Parent Category</Label>
                    <select
                      id="parent_category"
                      value={categoryFormData.parent_category_id}
                      onChange={(e) =>
                        setCategoryFormData({ ...categoryFormData, parent_category_id: e.target.value })
                      }
                      disabled={categorySubmitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">None (Top-level category)</option>
                      {categories
                        .filter(cat => cat.category_id !== editingCategory?.category_id)
                        .map((category) => (
                          <option key={category.category_id} value={category.category_id}>
                            {category.name}
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500">
                      Optional: Select a parent category to create a subcategory
                    </p>
                  </div>

                  {editingCategory && (
                    <div className="space-y-2">
                      <Label htmlFor="category_is_active">Active</Label>
                      <div className="flex items-center gap-2">
                        <input
                          id="category_is_active"
                          type="checkbox"
                          checked={categoryFormData.is_active}
                          onChange={(e) =>
                            setCategoryFormData({ ...categoryFormData, is_active: e.target.checked })
                          }
                          disabled={categorySubmitting}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor="category_is_active" className="text-sm font-normal">
                          Category is active and can be used
                        </Label>
                      </div>
                    </div>
                  )}

                  {categoryFormError && <ErrorMessage error={categoryFormError} />}

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={categorySubmitting}
                      variant="ghost"
                      className="text-emerald-500 font-semibold hover:text-emerald-200 border-transparent hover:bg-transparent shadow-none cursor-pointer transition-colors duration-150 ease-in-out"
                    >
                      {categorySubmitting ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          {editingCategory ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        <>
                          {editingCategory ? (
                            <>
                              <Edit className="mr-2 h-4 w-4" />
                              Update Category
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Create Category
                            </>
                          )}
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-red-600 hover:text-red-300 border-transparent hover:bg-transparent shadow-none cursor-pointer transition-colors duration-150 ease-in-out"
                      onClick={handleCancelCategory}
                      disabled={categorySubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="border border-gray-200 bg-white">
            <CardHeader>
              <CardTitle>Available Categories</CardTitle>
              <CardDescription>
                {categoriesLoading ? "Loading..." : categories.length === 0
                  ? "No categories found. Create your first category to get started."
                  : `Total: ${categories.length} categor${categories.length !== 1 ? "ies" : "y"}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="flex min-h-[40vh] items-center justify-center">
                  <LoadingSpinner size="lg" />
                </div>
              ) : categories.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center text-gray-500">
                  <Tag className="h-10 w-10 text-blue-600" />
                  <p className="text-lg font-semibold text-gray-900">No categories yet</p>
                  <p className="text-sm">
                    Create your first category to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div
                      key={category.category_id}
                      className="flex items-start justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-gray-900">{category.name}</p>
                          {category.is_active === 0 && (
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                              Inactive
                            </span>
                          )}
                          {category.parent_category_id && (
                            <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                              Subcategory
                            </span>
                          )}
                        </div>
                        {category.description && (
                          <p className="text-sm text-gray-600">
                            {category.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.category_id)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

