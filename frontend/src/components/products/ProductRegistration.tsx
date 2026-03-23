"use client";

import React, { useState, useEffect } from 'react';
import { Package, Droplet, Plus, Trash2, AlertCircle, Info, Box, Barcode, Ruler, Weight, DollarSign, Archive, Edit2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';

interface Variant {
  id: number;
  variantName: string;
  sku: string;
  barcode: string;
  size: string;
  sizeUnit: string;
  baseUnit: string;
  packageUnit: string;
  unitsPerPackage: number;
  unitPrice: number;
  packagePrice: number;
  weight: number;
  minStock: number;
  reorderPoint: number;
}

interface ProductRegistrationProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialProduct?: {
    product_id: number;
    name: string;
    sku: string | null;
    category_id: number | null;
    category_name?: string;
    unit_id: number | null;
    unit?: string | null;
    product_type: string;
    material_classification?: string;
    is_active: number;
    cost_price: number | null;
    selling_price: number | null;
    description?: string;
    brand?: string;
    bulk_unit?: string;
    variants?: Array<any>;
  } | null;
}

const ProductRegistration = ({ onSuccess, onCancel, initialProduct }: ProductRegistrationProps) => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  const isEditing = !!initialProduct;
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ category_id: number; name: string }>>([]);
  const [units, setUnits] = useState<Array<{ unit_id: number; name: string; short_code: string }>>([]);
  const [step, setStep] = useState(1);
  const [productData, setProductData] = useState<{
    productName: string;
    category: string;
    brand: string;
    description: string;
    productType: 'packaged' | 'bulk';
    materialClassification: 'finished_product' | 'raw_material' | 'semi_finished';
    bulkUnit: string;
    bulkPrice: number;
    variants: Variant[];
  }>(() => {
    // Initial state - will be updated by useEffect when units are loaded
    if (initialProduct) {
      const productType = initialProduct.product_type === 'packaged' ? 'packaged' : 'bulk';
      return {
        productName: initialProduct.name || '',
        category: initialProduct.category_id?.toString() || '',
        brand: (initialProduct as any)?.brand || '',
        description: initialProduct.description || '',
        productType: productType,
        materialClassification: (initialProduct as any)?.material_classification || 'finished_product',
        bulkUnit: (initialProduct as any)?.bulk_unit || 'kg', // Will be updated when units load
        bulkPrice: initialProduct.selling_price || 0,
        variants: (initialProduct as any)?.variants || []
      };
    }
    return {
      productName: '',
      category: '',
      brand: '',
      description: '',
      productType: 'packaged',
      materialClassification: 'finished_product',
      bulkUnit: 'kg',
      bulkPrice: 0,
      variants: []
    };
  });

  const [editingVariantId, setEditingVariantId] = useState<number | null>(null);
  const [currentVariant, setCurrentVariant] = useState({
    variantName: '',
    sku: '',
    barcode: '',
    size: '',
    sizeUnit: 'ml',
    baseUnit: 'bottle',
    packageUnit: 'box',
    unitsPerPackage: 12,
    unitPrice: 0,
    packagePrice: 0,
    weight: 0,
    minStock: 0,
    reorderPoint: 0
  });

  // Load categories and units from API
  useEffect(() => {
    loadCategories();
    loadUnits();
  }, []);

  // Load product data when editing: always fetch full product by id so we have variants and all fields
  useEffect(() => {
    const loadProductData = async () => {
      if (!initialProduct?.product_id) return;

      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/catalog/products/${initialProduct.product_id}`);
        if (response.error) {
          setError(response.error);
          console.error('Failed to load product:', response.error);
          setLoading(false);
          return;
        }
        const fullProduct = (response.data || {}) as any;
        const hasVariants = Array.isArray(fullProduct.variants) && fullProduct.variants.length > 0;

        if (hasVariants) {
          // Packaged (or any product with variants): transform and pre-fill variant form
          const transformedVariants: Variant[] = fullProduct.variants.map((v: any, index: number) => {
            const sizeUnit = (v.unit_short_code || v.size_unit || '').toString().toLowerCase() || 'ml';
            const baseUnit = (v.base_unit_short_code || v.base_unit || 'bottle').toString().toLowerCase().replace(/\s+/g, '');
            const packageUnit = (v.package_unit_short_code || v.package_unit || 'box').toString().toLowerCase().replace(/\s+/g, '');
            return {
              id: v.variant_id ?? index + 1,
              variantName: (v.variant_name ?? v.name ?? '').toString().trim(),
              sku: (v.variant_sku ?? v.sku ?? '').toString().trim(),
              barcode: (v.barcode ?? '').toString().trim(),
              size: v.size != null && v.size !== '' ? String(v.size) : '',
              sizeUnit: ['ml', 'l', 'g', 'kg'].includes(sizeUnit) ? sizeUnit : 'ml',
              baseUnit: ['bottle', 'can', 'bag', 'packet'].includes(baseUnit) ? baseUnit : 'bottle',
              packageUnit: ['box', 'carton', 'case', 'pack'].includes(packageUnit) ? packageUnit : 'box',
              unitsPerPackage: v.units_per_package != null && v.units_per_package !== '' ? Number(v.units_per_package) : 12,
              unitPrice: Number(v.unit_price ?? v.price_per_unit ?? 0) || 0,
              packagePrice: Number(v.package_price ?? v.price_per_package ?? 0) || 0,
              weight: v.weight || 0,
              minStock: v.min_stock_level || 0,
              reorderPoint: v.reorder_point || 0,
            };
          });

          setProductData({
            productName: fullProduct.name || '',
            category: fullProduct.category_id != null ? String(fullProduct.category_id) : '',
            brand: fullProduct.brand || '',
            description: fullProduct.description || '',
            productType: 'packaged',
            materialClassification: fullProduct.material_classification || 'finished_product',
            bulkUnit: 'kg',
            bulkPrice: 0,
            variants: transformedVariants,
          });

          const first = transformedVariants[0];
          setCurrentVariant({
            variantName: first.variantName || '',
            sku: first.sku || '',
            barcode: first.barcode || '',
            size: first.size || '',
            sizeUnit: first.sizeUnit || 'ml',
            baseUnit: first.baseUnit || 'bottle',
            packageUnit: first.packageUnit || 'box',
            unitsPerPackage: first.unitsPerPackage ?? 12,
            unitPrice: first.unitPrice ?? 0,
            packagePrice: first.packagePrice ?? 0,
            weight: first.weight || 0,
            minStock: first.minStock || 0,
            reorderPoint: first.reorderPoint || 0,
          });
          setEditingVariantId(null);
        } else {
          // Bulk or no variants: use product-level data from full product response
          let unit = null;
          if (fullProduct.unit_id && units.length > 0) {
            unit = units.find((u: { unit_id: number }) => u.unit_id === fullProduct.unit_id);
          }
          if (!unit && (fullProduct.bulk_unit || (initialProduct as any)?.bulk_unit)) {
            const bulkUnit = ((fullProduct.bulk_unit || (initialProduct as any)?.bulk_unit) || '').toLowerCase().trim();
            unit = units.find((u: { short_code: string; name: string }) =>
              u.short_code.toLowerCase() === bulkUnit || u.name.toLowerCase().includes(bulkUnit)
            );
          }
          const apiUnit = ((fullProduct.unit || (initialProduct as any)?.unit) || '').toLowerCase().trim();
          if (!unit && apiUnit) {
            unit = units.find((u: { short_code: string; name: string }) =>
              u.short_code.toLowerCase() === apiUnit || u.name.toLowerCase().includes(apiUnit)
            );
          }
          const bulkUnitCode = unit?.short_code || fullProduct.bulk_unit || (initialProduct as any)?.bulk_unit || apiUnit || 'kg';
          setProductData({
            productName: fullProduct.name || initialProduct.name || '',
            category: (fullProduct.category_id != null ? String(fullProduct.category_id) : initialProduct.category_id?.toString()) || '',
            brand: fullProduct.brand || (initialProduct as any)?.brand || '',
            description: fullProduct.description || initialProduct.description || '',
            productType: 'bulk',
            materialClassification: fullProduct.material_classification || (initialProduct as any)?.material_classification || 'finished_product',
            bulkUnit: bulkUnitCode,
            bulkPrice: Number(fullProduct.selling_price ?? initialProduct.selling_price ?? 0) || 0,
            variants: [],
          });
        }
      } finally {
        setLoading(false);
      }
    };

    if (initialProduct?.product_id) {
      loadProductData();
    }
  }, [initialProduct]);

  const loadCategories = async () => {
    try {
      const url = `/catalog/categories${companyId ? `?companyId=${companyId}` : ""}`;
      const response = await api.get<any>(url);
      if (response.data && Array.isArray(response.data)) {
        setCategories(response.data);
      } else if (response.error) {
        console.error("Failed to load categories:", response.error);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  const loadUnits = async () => {
    try {
      const url = `/units${companyId ? `?companyId=${companyId}` : ""}`;
      const response = await api.get<any>(url);
      if (response.data) {
        const unitsData = Array.isArray(response.data) ? response.data : (response.data.units || []);
        setUnits(unitsData);
      }
    } catch (err) {
      console.error("Failed to load units:", err);
    }
  };

  const categoryOptions = categories.length > 0 
    ? categories 
    : ['Beverages', 'Dairy Products', 'Bakery', 'Snacks', 'Condiments', 'Household', 'Personal Care', 'Other'].map((name, idx) => ({ category_id: idx + 1, name }));
  const sizeUnits = [
    { value: 'ml', label: 'Milliliters (ml)' },
    { value: 'l', label: 'Liters (L)' },
    { value: 'g', label: 'Grams (g)' },
    { value: 'kg', label: 'Kilograms (kg)' }
  ];
  const baseUnits = [
    { value: 'bottle', label: 'Bottle' },
    { value: 'can', label: 'Can' },
    { value: 'bag', label: 'Bag' },
    { value: 'packet', label: 'Packet' }
  ];
  const packageUnits = [
    { value: 'box', label: 'Box' },
    { value: 'carton', label: 'Carton' },
    { value: 'case', label: 'Case' },
    { value: 'pack', label: 'Pack' }
  ];

  const editVariant = (variant: Variant) => {
    setEditingVariantId(variant.id);
    setCurrentVariant({
      variantName: variant.variantName || '',
      sku: variant.sku || '',
      barcode: variant.barcode || '',
      size: variant.size || '',
      sizeUnit: variant.sizeUnit || 'ml',
      baseUnit: variant.baseUnit || 'bottle',
      packageUnit: variant.packageUnit || 'box',
      unitsPerPackage: variant.unitsPerPackage || 12,
      unitPrice: variant.unitPrice || 0,
      packagePrice: variant.packagePrice || 0,
      weight: variant.weight || 0,
      minStock: variant.minStock || 0,
      reorderPoint: variant.reorderPoint || 0
    });
    // Scroll to variant form
    setTimeout(() => {
      const formElement = document.querySelector('[data-variant-form]');
      formElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const cancelEditVariant = () => {
    setEditingVariantId(null);
    setCurrentVariant({
      variantName: '',
      sku: '',
      barcode: '',
      size: '',
      sizeUnit: 'ml',
      baseUnit: 'bottle',
      packageUnit: 'box',
      unitsPerPackage: 12,
      unitPrice: 0,
      packagePrice: 0,
      weight: 0,
      minStock: 0,
      reorderPoint: 0
    });
  };

  const addVariant = () => {
    if (!currentVariant.variantName || !currentVariant.sku) {
      alert('Please fill in variant name and SKU');
      return;
    }

    if (editingVariantId !== null) {
      // Update existing variant
      setProductData({
        ...productData,
        variants: productData.variants.map(v => 
          v.id === editingVariantId 
            ? { ...currentVariant, id: editingVariantId }
            : v
        )
      });
      setEditingVariantId(null);
    } else {
      // Add new variant
      setProductData({
        ...productData,
        variants: [...productData.variants, { ...currentVariant, id: Date.now() }]
      });
    }

    // Reset form
    setCurrentVariant({
      variantName: '',
      sku: '',
      barcode: '',
      size: '',
      sizeUnit: 'ml',
      baseUnit: 'bottle',
      packageUnit: 'box',
      unitsPerPackage: 12,
      unitPrice: 0,
      packagePrice: 0,
      weight: 0,
      minStock: 0,
      reorderPoint: 0
    });
  };

  const removeVariant = (variantId: number) => {
    if (editingVariantId === variantId) {
      cancelEditVariant();
    }
    setProductData({
      ...productData,
      variants: productData.variants.filter((v) => v.id !== variantId)
    });
  };

  // Helper function to clear zero on focus for numeric inputs
  const handleNumericFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === '0' || e.target.value === '0.0' || e.target.value === '0.00') {
      e.target.value = '';
    }
  };

  const preventNumberWheelChange = (e: React.WheelEvent<HTMLInputElement>) => {
    // Browsers increment/decrement number inputs on mouse wheel when focused.
    // This causes the "auto increase/reduce by 1" behavior while scrolling.
    e.currentTarget.blur();
  };

  const generateSKU = () => {
    const prefix = productData.productName.substring(0, 3).toUpperCase();
    const size = currentVariant.size;
    const unit = currentVariant.sizeUnit.toUpperCase();
    const sku = `${prefix}-${size}${unit}`;
    setCurrentVariant({...currentVariant, sku});
  };

  const handleSavePackagedProduct = async () => {
    if (productData.variants.length === 0) {
      setError('Please add at least one variant');
      return;
    }

    if (!productData.productName || !productData.category) {
      setError('Please fill in product name and category');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Parse category_id - productData.category is the category_id as a string
      // Handle empty string, null, or undefined
      const category_id = productData.category && productData.category.trim() !== '' 
        ? Number(productData.category) 
        : null;
      
      // Find appropriate unit - use first variant's size unit (ml, L, g, kg) to find the measurement unit
      const firstVariant = productData.variants[0];
      if (!firstVariant) {
        setError('Please add at least one variant');
        setSubmitting(false);
        return;
      }

      // Validate that all variants have required fields
      for (const variant of productData.variants) {
        if (!variant.variantName || !variant.sku) {
          setError(`Variant "${variant.variantName || 'unnamed'}" is missing required fields (name or SKU)`);
          setSubmitting(false);
          return;
        }
      }

      // For packaged products, find unit by sizeUnit (ml, L, g, kg)
      // The sizeUnit is the measurement unit (ml, L, g, kg), which should match unit short_code
      // Map common size units to expected short_code values
      const sizeUnitToShortCode: Record<string, string> = {
        'ml': 'ml',
        'milliliter': 'ml',
        'l': 'l',
        'liter': 'l',
        'litre': 'l',
        'g': 'g',
        'gram': 'g',
        'kg': 'kg',
        'kilogram': 'kg'
      };
      
      const normalizedSizeUnit = firstVariant.sizeUnit.toLowerCase().trim();
      const expectedShortCode = sizeUnitToShortCode[normalizedSizeUnit] || normalizedSizeUnit;
      
      // Try to find unit by short_code matching sizeUnit
      let unit = units.find(u => 
        u.short_code.toLowerCase() === expectedShortCode ||
        u.short_code.toLowerCase() === normalizedSizeUnit
      );
      
      // If not found by short_code, try matching by name
      if (!unit) {
        const sizeUnitToName: Record<string, string> = {
          'ml': 'milliliter',
          'l': 'liter',
          'g': 'gram',
          'kg': 'kilogram'
        };
        const unitName = sizeUnitToName[normalizedSizeUnit];
        if (unitName) {
          unit = units.find(u => 
            u.name.toLowerCase().includes(unitName) ||
            u.name.toLowerCase() === unitName
          );
        }
      }
      
      // Final fallback: use first available unit (but log a warning)
      if (!unit && units.length > 0) {
        console.warn(`Could not find matching unit for sizeUnit "${firstVariant.sizeUnit}", using first available unit`);
        unit = units[0];
      }
      
      // Transform variants to backend format (send snake_case so backend saves units_per_package etc.)
      const variantsPayload = productData.variants.map(variant => ({
        variant_name: variant.variantName || '',
        sku: variant.sku || '',
        barcode: variant.barcode || null,
        size: variant.size ? parseFloat(variant.size) : 0,
        sizeUnit: variant.sizeUnit || '',
        baseUnit: variant.baseUnit || 'piece',
        packageUnit: variant.packageUnit || 'box',
        units_per_package: variant.unitsPerPackage || 1,
        unitsPerPackage: variant.unitsPerPackage || 1,
        unit_price: variant.unitPrice || 0,
        unitPrice: variant.unitPrice || 0,
        price_per_package: variant.packagePrice || 0,
        packagePrice: variant.packagePrice || 0,
        weight: variant.weight || 0,
        minStock: variant.minStock || 0,
        reorderPoint: variant.reorderPoint || 0,
      }));

      const payload = {
        name: productData.productName,
        sku: firstVariant.sku, // Use first variant's SKU as base SKU
        category_id: category_id,
        unit_id: unit?.unit_id || null, // Can be null for packaged products
        product_type: 'packaged',
        material_classification: productData.materialClassification,
        company_id: companyId,
        is_active: isEditing && initialProduct ? initialProduct.is_active : 1,
        cost_price: null,
        selling_price: null, // Variants have their own prices
        description: productData.description || null,
        brand: productData.brand || null,
        variants: variantsPayload,
      };

      console.log('Saving packaged product with payload:', payload);
      console.log('Category ID:', category_id, 'from productData.category:', productData.category);
      console.log('Unit ID:', unit?.unit_id, 'Unit name:', unit?.name, 'from sizeUnit:', firstVariant.sizeUnit);

      let response;
      if (isEditing && initialProduct) {
        response = await api.put(`/catalog/products/${initialProduct.product_id}`, payload);
      } else {
        response = await api.post('/catalog/products', payload);
      }

      // Check for API errors
      if (response.error) {
        setError(response.error);
        setSubmitting(false);
        return;
      }

      // Reset form
      if (!isEditing) {
        setStep(1);
        setProductData({
          productName: '',
          category: '',
          brand: '',
          description: '',
          productType: 'packaged',
          materialClassification: 'finished_product',
          bulkUnit: 'kg',
          bulkPrice: 0,
          variants: []
        });
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Error saving product:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to save product';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBulkProduct = async () => {
    if (!productData.productName || !productData.category) {
      setError('Please fill in product name and category');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Parse category_id - productData.category is the category_id as a string
      // Handle empty string, null, or undefined
      const category_id = productData.category && productData.category.trim() !== '' 
        ? Number(productData.category) 
        : null;
      
      // Find appropriate unit for bulk product by matching short_code
      // Map common bulk units to expected short_code values
      const bulkUnitToShortCode: Record<string, string> = {
        'kg': 'kg',
        'kilogram': 'kg',
        'g': 'g',
        'gram': 'g',
        'l': 'l',
        'liter': 'l',
        'litre': 'l',
        'ml': 'ml',
        'milliliter': 'ml'
      };
      
      const normalizedBulkUnit = productData.bulkUnit.toLowerCase().trim();
      const expectedShortCode = bulkUnitToShortCode[normalizedBulkUnit] || normalizedBulkUnit;
      
      // Try to find unit by short_code
      let unit = units.find(u => 
        u.short_code.toLowerCase() === expectedShortCode ||
        u.short_code.toLowerCase() === normalizedBulkUnit
      );
      
      // If not found by short_code, try matching by name
      if (!unit) {
        const bulkUnitToName: Record<string, string> = {
          'kg': 'kilogram',
          'g': 'gram',
          'l': 'liter',
          'ml': 'milliliter'
        };
        const unitName = bulkUnitToName[normalizedBulkUnit];
        if (unitName) {
          unit = units.find(u => 
            u.name.toLowerCase().includes(unitName) ||
            u.name.toLowerCase() === unitName
          );
        }
      }
      
      // Final fallback: use first available unit (but log a warning)
      if (!unit && units.length > 0) {
        console.warn(`Could not find matching unit for bulkUnit "${productData.bulkUnit}", using first available unit`);
        unit = units[0];
      }
      
      const payload = {
        name: productData.productName,
        sku: isEditing && initialProduct?.sku 
          ? initialProduct.sku 
          : `${productData.productName.substring(0, 3).toUpperCase()}-BULK`,
        category_id: category_id,
        unit_id: unit?.unit_id || null,
        product_type: 'bulk' as const,
        material_classification: productData.materialClassification,
        company_id: companyId,
        is_active: isEditing && initialProduct ? initialProduct.is_active : 1,
        cost_price: null, // Bulk products typically don't have cost_price, only selling_price
        selling_price: productData.bulkPrice && productData.bulkPrice > 0 ? productData.bulkPrice : null,
        description: productData.description || null,
        brand: productData.brand || null,
        bulk_unit: productData.bulkUnit || null,
      };

      console.log('Saving bulk product with payload:', payload);
      console.log('Category ID:', category_id, 'from productData.category:', productData.category);
      console.log('Unit ID:', unit?.unit_id, 'Unit name:', unit?.name, 'from bulkUnit:', productData.bulkUnit);
      console.log('Selling price:', productData.bulkPrice);

      let response;
      if (isEditing && initialProduct) {
        response = await api.put(`/catalog/products/${initialProduct.product_id}`, payload);
      } else {
        response = await api.post('/catalog/products', payload);
      }

      if (response.error) {
        setError(response.error);
      } else {
        // Reset form
        if (!isEditing) {
          setStep(1);
          setProductData({
            productName: '',
            category: '',
            brand: '',
            description: '',
            productType: 'packaged',
            materialClassification: 'finished_product',
            bulkUnit: 'kg',
            bulkPrice: 0,
            variants: []
          });
        }

        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      console.error('Error saving product:', err);
      setError(err.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {isEditing ? 'Edit Product' : 'Register New Product'}
              </h1>
              <p className="text-gray-600">
                {isEditing ? 'Update product information and variants' : 'Add products with variants and packaging information'}
              </p>
            </div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            )}
          </div>

          {error && <ErrorMessage error={error} />}

          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>1</div>
              <div className={`w-32 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>2</div>
              <div className={`w-32 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>3</div>
            </div>
          </div>

          <div className="flex justify-center gap-4 mb-8 text-sm">
            <span className={step === 1 ? 'font-bold text-blue-600' : 'text-gray-600'}>Product Type</span>
            <span className={step === 2 ? 'font-bold text-blue-600' : 'text-gray-600'}>Basic Info</span>
            <span className={step === 3 ? 'font-bold text-blue-600' : 'text-gray-600'}>Variants & Packaging</span>
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">What type of product is this?</h2>
                <p className="text-gray-600">This determines how the product will be managed in inventory</p>
              </div>

              <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto">
                <button
                  type="button"
                  onClick={() => setProductData({...productData, productType: 'packaged'})}
                  className={`p-6 rounded-lg border-4 transition-all ${productData.productType === 'packaged' ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-400'}`}
                >
                  <Package className="w-16 h-16 mx-auto mb-4 text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Packaged Product</h3>
                  <p className="text-sm text-gray-600 mb-4">Products sold in bottles, cans, bags, or boxes with specific sizes</p>
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <p className="text-xs font-semibold text-blue-900 mb-2">Examples:</p>
                    <ul className="text-xs text-gray-700 space-y-1">
                      <li>• Juice bottles (500ml, 1L, 2L)</li>
                      <li>• Soft drink cans (330ml, 500ml)</li>
                      <li>• Packaged snacks (50g, 100g, 250g)</li>
                    </ul>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setProductData({...productData, productType: 'bulk'})}
                  className={`p-6 rounded-lg border-4 transition-all ${productData.productType === 'bulk' ? 'border-purple-600 bg-purple-50' : 'border-gray-300 bg-white hover:border-purple-400'}`}
                >
                  <Droplet className="w-16 h-16 mx-auto mb-4 text-purple-600" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Bulk Product</h3>
                  <p className="text-sm text-gray-600 mb-4">Products sold by weight or volume without specific packaging</p>
                  <div className="bg-white rounded-lg p-3 border border-purple-200">
                    <p className="text-xs font-semibold text-purple-900 mb-2">Examples:</p>
                    <ul className="text-xs text-gray-700 space-y-1">
                      <li>• Fresh milk (sold by liters)</li>
                      <li>• Rice (sold by kg)</li>
                      <li>• Cooking oil (sold by liters)</li>
                    </ul>
                  </div>
                </button>
              </div>

              <div className="flex justify-end pt-6">
                <button type="button" onClick={() => setStep(2)} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Continue to Basic Info
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Product Name *</label>
                  <input
                    type="text"
                    value={productData.productName}
                    onChange={(e) => setProductData({...productData, productName: e.target.value})}
                    placeholder="e.g., Orange Juice, Fresh Milk"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Category *</label>
                  <select
                    value={productData.category}
                    onChange={(e) => setProductData({...productData, category: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map(cat => (
                      <option key={typeof cat === 'string' ? cat : cat.category_id} value={typeof cat === 'string' ? cat : cat.category_id.toString()}>
                        {typeof cat === 'string' ? cat : cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Brand (Optional)</label>
                  <input
                    type="text"
                    value={productData.brand}
                    onChange={(e) => setProductData({...productData, brand: e.target.value})}
                    placeholder="e.g., Coca-Cola"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Material Classification *</label>
                  <select
                    value={productData.materialClassification}
                    onChange={(e) => setProductData({...productData, materialClassification: e.target.value as 'finished_product' | 'raw_material' | 'semi_finished'})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                  >
                    <option value="finished_product">Finished Product</option>
                    <option value="raw_material">Raw Material</option>
                    <option value="semi_finished">Semi-Finished</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Determines if product is finished, raw material, or semi-finished</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Product Type</label>
                  <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 rounded-lg">
                    {productData.productType === 'packaged' ? (
                      <>
                        <Package className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-blue-600">Packaged Product</span>
                      </>
                    ) : (
                      <>
                        <Droplet className="w-5 h-5 text-purple-600" />
                        <span className="font-semibold text-purple-600">Bulk Product</span>
                      </>
                    )}
                    <button type="button" onClick={() => setStep(1)} className="ml-auto text-sm text-blue-600 hover:underline">Change</button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Description (Optional)</label>
                <textarea
                  value={productData.description}
                  onChange={(e) => setProductData({...productData, description: e.target.value})}
                  placeholder="Add product description..."
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                  rows={3}
                />
              </div>

              {productData.productType === 'bulk' && (
                <div className="p-6 bg-purple-50 border-2 border-purple-200 rounded-lg">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Bulk Product Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Unit of Measurement *</label>
                      <select
                        value={productData.bulkUnit}
                        onChange={(e) => setProductData({...productData, bulkUnit: e.target.value})}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                      >
                        <option value="kg">Kilograms (kg)</option>
                        <option value="l">Liters (L)</option>
                        <option value="g">Grams (g)</option>
                        <option value="ml">Milliliters (ml)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Price per Unit (RWF) *</label>
                      <input
                        type="number"
                        value={productData.bulkPrice === 0 ? '' : productData.bulkPrice}
                        onFocus={handleNumericFocus}
                        onWheel={preventNumberWheelChange}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          setProductData({...productData, bulkPrice: val});
                        }}
                        placeholder="0"
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-6">
                <button type="button" onClick={() => setStep(1)} className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
                  Back
                </button>
                <button type="button" onClick={() => setStep(3)} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  {productData.productType === 'bulk' ? 'Review & Save' : 'Continue to Variants'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && productData.productType === 'packaged' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">About Variants:</p>
                    <p className="text-blue-800">Add different sizes/versions of this product. Each variant gets its own SKU, price, and stock level.</p>
                  </div>
                </div>
              </div>

              <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50" data-variant-form>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingVariantId !== null ? 'Edit Variant' : 'Add New Variant'}
                  </h3>
                  {isEditing && productData.variants.length > 0 && editingVariantId === null && (
                    <p className="text-sm text-gray-600">
                      Click on a variant below to edit it, or add a new variant
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Variant Name *</label>
                    <input
                      type="text"
                      value={currentVariant.variantName}
                      onChange={(e) => setCurrentVariant({...currentVariant, variantName: e.target.value})}
                      placeholder="e.g., 500ml Bottle"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="flex items-end">
                    <button type="button" onClick={generateSKU} className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                      Auto SKU
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Size *</label>
                    <input
                      type="number"
                      value={currentVariant.size === '' || currentVariant.size === '0' ? '' : currentVariant.size}
                      onFocus={handleNumericFocus}
                      onWheel={preventNumberWheelChange}
                      onChange={(e) => setCurrentVariant({...currentVariant, size: e.target.value})}
                      placeholder="500"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Unit *</label>
                    <select
                      value={currentVariant.sizeUnit}
                      onChange={(e) => setCurrentVariant({...currentVariant, sizeUnit: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                    >
                      {sizeUnits.map(u => (<option key={u.value} value={u.value}>{u.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">SKU *</label>
                    <input
                      type="text"
                      value={currentVariant.sku}
                      onChange={(e) => setCurrentVariant({...currentVariant, sku: e.target.value})}
                      placeholder="OJ-500ML"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border-2 border-blue-200 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Packaging Information</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Base Unit *</label>
                      <select
                        value={currentVariant.baseUnit}
                        onChange={(e) => setCurrentVariant({...currentVariant, baseUnit: e.target.value})}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                      >
                        {baseUnits.map(u => (<option key={u.value} value={u.value}>{u.label}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Units per Package *</label>
                      <input
                        type="number"
                        value={currentVariant.unitsPerPackage === 0 ? '' : currentVariant.unitsPerPackage}
                        onFocus={handleNumericFocus}
                        onWheel={preventNumberWheelChange}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                          const newPkg = (currentVariant.unitPrice || 0) * val;
                          setCurrentVariant({...currentVariant, unitsPerPackage: val, packagePrice: newPkg});
                        }}
                        placeholder="12"
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Package Unit *</label>
                      <select
                        value={currentVariant.packageUnit}
                        onChange={(e) => setCurrentVariant({...currentVariant, packageUnit: e.target.value})}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                      >
                        {packageUnits.map(u => (<option key={u.value} value={u.value}>{u.label}</option>))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 rounded">
                    <p className="text-sm font-medium text-blue-900">
                      Example: 1 {currentVariant.packageUnit} = {currentVariant.unitsPerPackage} {currentVariant.baseUnit}s
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border-2 border-green-200 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Pricing</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Unit price (RWF) *</label>
                      <input
                        type="number"
                        value={currentVariant.unitPrice === 0 ? '' : currentVariant.unitPrice}
                        onFocus={handleNumericFocus}
                        onWheel={preventNumberWheelChange}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          const newPkg = val * (currentVariant.unitsPerPackage || 1);
                          setCurrentVariant({...currentVariant, unitPrice: val, packagePrice: newPkg});
                        }}
                        placeholder="1000"
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">Price per {currentVariant.baseUnit}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Price per {currentVariant.packageUnit} (RWF)</label>
                      <input
                        type="number"
                        value={currentVariant.packagePrice === 0 ? '' : currentVariant.packagePrice}
                        onFocus={handleNumericFocus}
                        onWheel={preventNumberWheelChange}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          setCurrentVariant({...currentVariant, packagePrice: val});
                        }}
                        placeholder="11500"
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">Auto: unit price × {currentVariant.unitsPerPackage || 0} = RWF {((currentVariant.unitPrice || 0) * (currentVariant.unitsPerPackage || 0)).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  {editingVariantId !== null && (
                    <button 
                      type="button" 
                      onClick={cancelEditVariant} 
                      className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={addVariant} 
                    className={`${editingVariantId !== null ? 'flex-1' : 'w-full'} px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium`}
                  >
                    {editingVariantId !== null ? 'Update Variant' : 'Add This Variant'}
                  </button>
                </div>
              </div>

              {productData.variants.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Added Variants ({productData.variants.length})</h3>
                  <div className="space-y-3">
                    {productData.variants.map((variant) => (
                      <div key={variant.id} className="border-2 border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 text-lg">{variant.variantName}</h4>
                            <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                              <div>
                                <p className="text-gray-600">SKU</p>
                                <p className="font-mono font-semibold">{variant.sku}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Size</p>
                                <p className="font-semibold">{variant.size} {variant.sizeUnit}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Packaging</p>
                                <p className="font-semibold">{variant.unitsPerPackage} {variant.baseUnit}s/{variant.packageUnit}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Price</p>
                                <p className="font-semibold">RWF {(variant.unitPrice || 0).toLocaleString()}/{variant.baseUnit}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              type="button" 
                              onClick={() => editVariant(variant)} 
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                              title="Edit variant"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => removeVariant(variant.id)} 
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                              title="Remove variant"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {productData.variants.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No variants added yet. Add at least one variant to continue.</p>
                </div>
              )}

              <div className="flex justify-between pt-6 border-t-2">
                <button type="button" onClick={() => setStep(2)} className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSavePackagedProduct}
                  disabled={productData.variants.length === 0 || submitting}
                  className={`px-6 py-3 rounded-lg font-medium ${productData.variants.length > 0 && !submitting ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  {submitting ? 'Saving...' : `Save Product with ${productData.variants.length} Variant(s)`}
                </button>
              </div>
            </div>
          )}

          {step === 3 && productData.productType === 'bulk' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Review Product Details</h2>
              <div className="border-2 border-purple-200 rounded-lg p-6 bg-purple-50">
                <h3 className="text-xl font-bold text-gray-900 mb-4">{productData.productName}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Category</p>
                    <p className="font-semibold">{productData.category}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Product Type</p>
                    <p className="font-semibold">Bulk Product</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Unit</p>
                    <p className="font-semibold">{productData.bulkUnit}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Price per Unit</p>
                    <p className="font-semibold">RWF {(productData.bulkPrice || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between pt-6 border-t-2">
                <button type="button" onClick={() => setStep(2)} className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
                  Back
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveBulkProduct}
                  disabled={submitting}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductRegistration;

