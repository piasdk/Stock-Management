"use client";

import React, { useState, useEffect } from 'react';
import { Package, Droplet, Plus, Trash2, AlertCircle, Info, Box, CheckCircle } from 'lucide-react';
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";

interface Category {
  category_id: number;
  name: string;
}

interface Unit {
  unit_id: number;
  name: string;
  short_code: string;
}

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

interface SmartProductRegistrationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const SmartProductRegistrationForm = ({ onSuccess, onCancel }: SmartProductRegistrationFormProps) => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;

  const [step, setStep] = useState(1);
  const [productData, setProductData] = useState({
    productName: '',
    category: '',
    brand: '',
    description: '',
    productType: 'packaged',
    bulkUnit: 'kg',
    bulkPrice: 0,
    variants: [] as Variant[]
  });

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

  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [categoriesRes, unitsRes] = await Promise.all([
        api.get<Category[]>(`/catalog/categories${companyId ? `?companyId=${companyId}` : ''}`),
        api.get<Unit[]>(`/units${companyId ? `?companyId=${companyId}` : ''}`),
      ]);

      if (categoriesRes.data) {
        setCategories(categoriesRes.data);
      }

      if (unitsRes.data) {
        setUnits(unitsRes.data);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load categories and units');
    } finally {
      setLoading(false);
    }
  };

  const addVariant = () => {
    if (!currentVariant.variantName || !currentVariant.sku) {
      setError('Please fill in variant name and SKU');
      return;
    }
    setProductData({
      ...productData,
      variants: [...productData.variants, { ...currentVariant, id: Date.now() }]
    });
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
    setError(null);
  };

  const removeVariant = (variantId: number) => {
    setProductData({
      ...productData,
      variants: productData.variants.filter(v => v.id !== variantId)
    });
  };

  const generateSKU = () => {
    const prefix = productData.productName.substring(0, 3).toUpperCase();
    const size = currentVariant.size;
    const unit = currentVariant.sizeUnit.toUpperCase();
    const sku = `${prefix}-${size}${unit}`;
    setCurrentVariant({...currentVariant, sku});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (productData.productType === 'bulk') {
        // Create bulk product
        const payload = {
          name: productData.productName,
          category_id: productData.category ? parseInt(productData.category) : null,
          product_type: 'finished_good',
          unit_id: units.find(u => u.short_code === productData.bulkUnit)?.unit_id || null,
          selling_price: productData.bulkPrice,
          cost_price: productData.bulkPrice * 0.8, // Estimate cost price
          description: productData.description,
          brand: productData.brand || null,
        };

        const response = await api.post("/catalog/products", payload);

        if (response.error) {
          setError(response.error);
        } else {
          if (onSuccess) {
            onSuccess();
          }
        }
      } else {
        // Create packaged products with variants
        if (productData.variants.length === 0) {
          setError('Please add at least one variant');
          setSubmitting(false);
          return;
        }

        // Create each variant as a separate product
        for (const variant of productData.variants) {
          const payload = {
            name: `${productData.productName} - ${variant.variantName}`,
            sku: variant.sku,
            category_id: productData.category ? parseInt(productData.category) : null,
            product_type: 'finished_good',
            unit_id: units.find(u => u.short_code === variant.baseUnit)?.unit_id || null,
            selling_price: variant.unitPrice,
            cost_price: variant.unitPrice * 0.8, // Estimate cost price
            description: productData.description,
            brand: productData.brand || null,
            weight: variant.weight || null,
            reorder_level: variant.reorderPoint || null,
            reorder_quantity: variant.minStock || null,
          };

          const response = await api.post("/catalog/products", payload);

          if (response.error) {
            setError(`Failed to create variant ${variant.variantName}: ${response.error}`);
            setSubmitting(false);
            return;
          }
        }

        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      console.error('Error creating product:', err);
      setError(err.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            <button 
              type="button"
              onClick={() => setStep(2)} 
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
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
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Category *</label>
              <select
                value={productData.category}
                onChange={(e) => setProductData({...productData, category: e.target.value})}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                required
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
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
                <button 
                  type="button"
                  onClick={() => setStep(1)} 
                  className="ml-auto text-sm text-blue-600 hover:underline"
                >
                  Change
                </button>
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
                    required
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
                    value={productData.bulkPrice}
                    onChange={(e) => setProductData({...productData, bulkPrice: parseFloat(e.target.value) || 0})}
                    placeholder="0"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-6">
            <button 
              type="button"
              onClick={() => setStep(1)} 
              className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Back
            </button>
            <button 
              type="button"
              onClick={() => productData.productType === 'bulk' ? handleSubmit({ preventDefault: () => {} } as React.FormEvent) : setStep(3)} 
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
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

          <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Variant</h3>

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
                <button 
                  type="button"
                  onClick={generateSKU} 
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Auto SKU
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Size *</label>
                <input
                  type="number"
                  value={currentVariant.size}
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
                    value={currentVariant.unitsPerPackage}
                    onChange={(e) => setCurrentVariant({...currentVariant, unitsPerPackage: parseInt(e.target.value) || 0})}
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
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Price per {currentVariant.baseUnit} (RWF) *</label>
                  <input
                    type="number"
                    value={currentVariant.unitPrice}
                    onChange={(e) => setCurrentVariant({...currentVariant, unitPrice: parseFloat(e.target.value) || 0})}
                    placeholder="1000"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Price per {currentVariant.packageUnit} (RWF)</label>
                  <input
                    type="number"
                    value={currentVariant.packagePrice}
                    onChange={(e) => setCurrentVariant({...currentVariant, packagePrice: parseFloat(e.target.value) || 0})}
                    placeholder="11500"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Suggested: RWF {(currentVariant.unitPrice * currentVariant.unitsPerPackage).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <button 
              type="button"
              onClick={addVariant} 
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Add This Variant
            </button>
          </div>

          {productData.variants.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Added Variants ({productData.variants.length})</h3>
              <div className="space-y-3">
                {productData.variants.map(variant => (
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
                            <p className="font-semibold">RWF {variant.unitPrice.toLocaleString()}/{variant.baseUnit}</p>
                          </div>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeVariant(variant.id)} 
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
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
            <button 
              type="button"
              onClick={() => setStep(2)} 
              className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={productData.variants.length === 0 || submitting}
              className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
                productData.variants.length > 0 && !submitting
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Save Product with {productData.variants.length} Variant(s)
                </>
              )}
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
                <p className="font-semibold">{categories.find(c => c.category_id === parseInt(productData.category))?.name || 'N/A'}</p>
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
                <p className="font-semibold">RWF {productData.bulkPrice.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="flex justify-between pt-6 border-t-2">
            <button 
              type="button"
              onClick={() => setStep(2)} 
              className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Save Product
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {onCancel && (
        <div className="flex justify-end pt-6 border-t-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
        </div>
      )}
    </form>
  );
};

export default SmartProductRegistrationForm;

