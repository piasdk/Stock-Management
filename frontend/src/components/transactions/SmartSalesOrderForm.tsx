"use client";

import React, { useState, useEffect } from 'react';
import { Package, Droplet, Plus, Trash2, Calculator, Info, Box, CheckCircle } from 'lucide-react';
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";

interface Product {
  product_id: number;
  name: string;
  sku: string;
  product_type?: string;
  unit_id?: number;
  unit_name?: string;
  unit_short_code?: string;
  selling_price?: number;
  cost_price?: number;
  weight?: number;
  // For packaged products
  base_unit?: string;
  package_unit?: string;
  units_per_package?: number;
  price_per_package?: number;
  available_stock?: number;
  available_packages?: number;
  variants?: any[];
  bulk_unit?: string;
}

interface Customer {
  customer_id: number;
  name: string;
  phone?: string;
  email?: string;
}

interface OrderItem {
  id: number;
  productId: number | null;
  product: Product | null;
  variantId?: number | null;
  variant?: any;
  // For packaged products
  orderByPackage: boolean;
  packages: number;
  units: number;
  // For bulk products
  quantity: number;
  // Common
  unitPrice: number;
  subtotal: number;
  // Stock availability
  availableStock?: number;
  availablePackages?: number;
  stockWarning?: string;
  isStockSufficient?: boolean;
}

interface SmartSalesOrderFormProps {
  orderId?: number | null; // If provided, form is in edit mode
  onSuccess?: () => void;
  onCancel?: () => void;
}

const SmartSalesOrderForm = ({ orderId, onSuccess, onCancel }: SmartSalesOrderFormProps) => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  const isEditMode = !!orderId;

  const [customer, setCustomer] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [currency, setCurrency] = useState('RWF');
  const [status, setStatus] = useState('draft');
  const [notes, setNotes] = useState('');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load products and customers
  useEffect(() => {
    loadData();
  }, []);

  // Auto-set status to 'draft' if stock becomes insufficient
  useEffect(() => {
    const insufficientStock = items.some(item => 
      item.product && item.productId && !item.isStockSufficient
    );
    
    if (insufficientStock && status !== 'draft') {
      setStatus('draft');
      setError('Order status automatically set to "Draft" due to insufficient stock. Please adjust stock levels first.');
    }
  }, [items, status]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load products
      const productsResponse = await api.get<Product[]>("/catalog/products");
      if (productsResponse.data && Array.isArray(productsResponse.data)) {
        // Transform products to match form structure
        const transformedProducts = productsResponse.data.map((p: any) => {
          const isPackaged = p.product_type === 'packaged';
          const baseProduct = {
            product_id: p.product_id,
            name: p.name || p.product_name,
            sku: p.sku,
            product_type: p.product_type || 'bulk',
            unit_id: p.unit_id,
            unit_name: p.unit_name || p.unit?.name,
            unit_short_code: p.unit_short_code || p.unit?.short_code,
            selling_price: p.selling_price || p.price || 0,
            cost_price: p.cost_price || 0,
            weight: p.weight || 0,
            bulk_unit: p.bulk_unit || p.unit_short_code || p.unit?.short_code || '',
            available_stock: p.total_quantity || p.available_stock || 0,
            variants: p.variants || [],
          };
          
          // Only add packaged product fields if it's actually a packaged product
          if (isPackaged) {
            return {
              ...baseProduct,
              base_unit: p.unit_short_code || p.unit?.short_code || 'unit',
              package_unit: 'box',
              units_per_package: 12, // Will be overridden by variant data if available
              price_per_package: (p.selling_price || p.price || 0) * 12,
              available_packages: Math.floor((p.total_quantity || p.available_stock || 0) / 12),
            };
          } else {
            // Bulk product - no packaged fields
            return baseProduct;
          }
        });
        setProducts(transformedProducts);
      }

      // Load customers
      const customersResponse = await api.get<Customer[]>("/customers");
      if (customersResponse.data && Array.isArray(customersResponse.data)) {
        setCustomers(customersResponse.data);
      } else {
        // Try alternative endpoint
        const altResponse = await fetch("/api/customers");
        if (altResponse.ok) {
          const data = await altResponse.json();
          if (Array.isArray(data)) {
            setCustomers(data);
          }
        }
      }

      // Load company currency
      if (companyId) {
        const companyResponse = await api.get<any>(`/companies/${companyId}`);
        if (companyResponse.data?.currency) {
          setCurrency(companyResponse.data.currency);
        }
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load products and customers');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, {
      id: Date.now(),
      productId: null,
      product: null,
      orderByPackage: true,
      packages: 0,
      units: 0,
      quantity: 0,
      unitPrice: 0,
      subtotal: 0
    }]);
  };

  const removeItem = (itemId: number) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const fetchProductDetails = async (productId: number) => {
    try {
      const response = await api.get<any>(`/catalog/products/${productId}`);
      if (response.data) {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Error fetching product details:', err);
      return null;
    }
  };

  const fetchStockLevels = async (productId: number, variantId?: number | null) => {
    try {
      const response = await api.get<any[]>(`/inventory/stock-levels?productId=${productId}`);
      if (response.data && Array.isArray(response.data)) {
        // Filter by variant if provided
        let stockLevels = response.data;
        if (variantId !== null && variantId !== undefined) {
          stockLevels = stockLevels.filter((sl: any) => 
            (sl.variant_id === variantId) || (variantId === 0 && !sl.variant_id)
          );
        } else if (variantId === null) {
          // For bulk products, filter out variant-specific stock
          stockLevels = stockLevels.filter((sl: any) => !sl.variant_id || sl.variant_id === 0);
        }
        
        // Sum up available quantities across all locations
        const totalAvailable = stockLevels.reduce((sum: number, sl: any) => 
          sum + (sl.quantity_available || sl.quantity || 0), 0
        );
        const totalPackages = stockLevels.reduce((sum: number, sl: any) => 
          sum + (sl.packages_in_stock || 0), 0
        );
        const totalQuantity = stockLevels.reduce((sum: number, sl: any) => 
          sum + (sl.quantity_in_stock || sl.quantity || 0), 0
        );
        
        return {
          availableStock: totalAvailable,
          availablePackages: totalPackages,
          totalQuantity: totalQuantity,
          stockLevels: stockLevels
        };
      }
      return { availableStock: 0, availablePackages: 0, totalQuantity: 0, stockLevels: [] };
    } catch (err) {
      console.error('Error fetching stock levels:', err);
      return { availableStock: 0, availablePackages: 0, totalQuantity: 0, stockLevels: [] };
    }
  };

  const handleProductSelect = async (itemId: number, productId: string) => {
    const productIdNum = parseInt(productId);
    const product = products.find(p => p.product_id === productIdNum);
    
    if (!product) return;

    // Fetch full product details including variants
    const fullProduct = await fetchProductDetails(productIdNum);
    let enrichedProduct = product;
    
    if (fullProduct) {
      enrichedProduct = {
        ...product,
        ...fullProduct,
        variants: fullProduct.variants || []
      };
    }

    // Determine if packaged or bulk - explicitly check product_type
    // Only treat as packaged if product_type is explicitly 'packaged'
    const isPackaged = enrichedProduct.product_type === 'packaged';
    const isBulk = !isPackaged; // If not packaged, it's bulk (or other types treated as bulk)
    let variantId: number | null = null;
    let stockInfo: any = { availableStock: 0, availablePackages: 0, totalQuantity: 0 };
    
    if (isBulk) {
      // Bulk product - clear any packaged fields that might have been set
      enrichedProduct.base_unit = undefined;
      enrichedProduct.package_unit = undefined;
      enrichedProduct.units_per_package = undefined;
      enrichedProduct.price_per_package = undefined;
      enrichedProduct.available_packages = undefined;
      
      // Fetch stock levels
      stockInfo = await fetchStockLevels(productIdNum, null);
    } else if (isPackaged) {
      // For packaged products, check if there are variants
      if (enrichedProduct.variants && enrichedProduct.variants.length > 0) {
        // Use first variant's pricing if available
        const firstVariant = enrichedProduct.variants[0];
        const unitsPerPackage = firstVariant.units_per_package || 12;
        const variantSellingPrice = firstVariant.selling_price || firstVariant.unit_price || enrichedProduct.selling_price || 0;
        const variantPackagePrice = firstVariant.package_price || (variantSellingPrice * unitsPerPackage);
        
        enrichedProduct.units_per_package = unitsPerPackage;
        enrichedProduct.base_unit = firstVariant.base_unit || 'unit';
        enrichedProduct.package_unit = firstVariant.package_unit || 'box';
        enrichedProduct.selling_price = variantSellingPrice;
        enrichedProduct.price_per_package = variantPackagePrice;
        
        variantId = firstVariant.variant_id;
        
        // Fetch stock levels for this variant
        stockInfo = await fetchStockLevels(productIdNum, variantId);
      } else {
        // No variants, use product-level pricing
        const unitsPerPackage = enrichedProduct.units_per_package || 12;
        const sellingPrice = enrichedProduct.selling_price || 0;
        enrichedProduct.price_per_package = sellingPrice * unitsPerPackage;
        
        // Fetch stock levels
        stockInfo = await fetchStockLevels(productIdNum, null);
      }
    } else {
      // Bulk product - fetch stock levels
      stockInfo = await fetchStockLevels(productIdNum, null);
    }

    // Update the item with product details
    setItems(items.map(item => {
      if (item.id !== itemId) return item;

      const updated = { ...item, productId: productIdNum, product: enrichedProduct };
      
      if (isPackaged) {
        if (enrichedProduct.variants && enrichedProduct.variants.length > 0) {
          updated.variantId = variantId;
          updated.variant = enrichedProduct.variants[0];
        }
        
        // Set initial unit price based on order method
        if (updated.orderByPackage) {
          const packagePrice = enrichedProduct.price_per_package || 
                              (Number(enrichedProduct.selling_price) || 0) * (enrichedProduct.units_per_package || 12);
          updated.unitPrice = packagePrice > 0 ? packagePrice : 0;
        } else {
          const unitPrice = Number(enrichedProduct.selling_price) || 0;
          updated.unitPrice = unitPrice > 0 ? unitPrice : 0;
        }
        
        updated.availableStock = stockInfo.availableStock;
        updated.availablePackages = stockInfo.availablePackages;
      } else {
        // Bulk product - use selling_price or cost_price, ensure it's a number
        const sellingPrice = Number(enrichedProduct.selling_price) || 0;
        const costPrice = Number(enrichedProduct.cost_price) || 0;
        updated.unitPrice = sellingPrice > 0 ? sellingPrice : (costPrice > 0 ? costPrice : 0);
        updated.availableStock = stockInfo.availableStock;
        // Ensure bulk products don't have packaged fields
        updated.orderByPackage = false;
        updated.packages = 0;
        updated.units = 0;
      }

      // Recalculate subtotal and check stock
      if (isPackaged) {
        const unitsPerPackage = enrichedProduct.units_per_package || 12;
        if (updated.orderByPackage) {
          updated.units = (updated.packages || 0) * unitsPerPackage;
          updated.subtotal = (updated.packages || 0) * Number(updated.unitPrice || 0);
          // Check if enough packages available
          updated.isStockSufficient = (updated.availablePackages || 0) >= (updated.packages || 0);
          updated.stockWarning = updated.isStockSufficient ? undefined : 
            `Only ${updated.availablePackages || 0} ${enrichedProduct.package_unit || 'box'}es available`;
        } else {
          updated.packages = Math.floor((updated.units || 0) / unitsPerPackage);
          updated.subtotal = (updated.units || 0) * Number(updated.unitPrice || 0);
          // Check if enough units available
          updated.isStockSufficient = (updated.availableStock || 0) >= (updated.units || 0);
          updated.stockWarning = updated.isStockSufficient ? undefined : 
            `Only ${updated.availableStock || 0} ${enrichedProduct.base_unit || 'unit'}s available`;
        }
      } else {
        // Bulk product
        updated.subtotal = (updated.quantity || 0) * Number(updated.unitPrice || 0);
        // Check if enough quantity available
        updated.isStockSufficient = (updated.availableStock || 0) >= (updated.quantity || 0);
        updated.stockWarning = updated.isStockSufficient ? undefined : 
          `Only ${updated.availableStock || 0} ${enrichedProduct.unit_name || enrichedProduct.bulk_unit || 'unit'}s available`;
      }

      return updated;
    }));
  };

  const updateItem = (itemId: number, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id !== itemId) return item;

      const updated = { ...item, [field]: value };

      // Calculate for packaged products (not bulk)
      if (updated.product && updated.product.product_type === 'packaged') {
        const unitsPerPackage = updated.product.units_per_package || 12;
        
        if (updated.orderByPackage) {
          updated.units = (updated.packages || 0) * unitsPerPackage;
          const packagePrice = updated.product.price_per_package || 
                              ((Number(updated.product.selling_price) || 0) * unitsPerPackage);
          updated.unitPrice = packagePrice > 0 ? packagePrice : 0;
          updated.subtotal = (updated.packages || 0) * Number(updated.unitPrice || 0);
          // Check stock
          updated.isStockSufficient = (updated.availablePackages || 0) >= (updated.packages || 0);
          updated.stockWarning = updated.isStockSufficient ? undefined : 
            `Only ${updated.availablePackages || 0} ${updated.product.package_unit || 'box'}es available`;
        } else {
          updated.packages = Math.floor((updated.units || 0) / unitsPerPackage);
          const unitPrice = Number(updated.product.selling_price) || 0;
          updated.unitPrice = unitPrice > 0 ? unitPrice : 0;
          updated.subtotal = (updated.units || 0) * Number(updated.unitPrice || 0);
          // Check stock
          updated.isStockSufficient = (updated.availableStock || 0) >= (updated.units || 0);
          updated.stockWarning = updated.isStockSufficient ? undefined : 
            `Only ${updated.availableStock || 0} ${updated.product.base_unit || 'unit'}s available`;
        }
      }

      // Calculate for bulk products
      if (updated.product && (updated.product.product_type === 'bulk' || (!updated.product.product_type || updated.product.product_type !== 'packaged'))) {
        const sellingPrice = Number(updated.product.selling_price) || 0;
        const costPrice = Number(updated.product.cost_price) || 0;
        updated.unitPrice = sellingPrice > 0 ? sellingPrice : (costPrice > 0 ? costPrice : 0);
        updated.subtotal = (updated.quantity || 0) * updated.unitPrice;
        // Check stock
        updated.isStockSufficient = (updated.availableStock || 0) >= (updated.quantity || 0);
        updated.stockWarning = updated.isStockSufficient ? undefined : 
          `Only ${updated.availableStock || 0} ${updated.product.unit_name || updated.product.bulk_unit || 'unit'}s available`;
      }

      return updated;
    }));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  };

  const calculateTotalBoxes = () => {
    return items.reduce((sum, item) => {
      if (item.product && (item.product.product_type === 'packaged' || item.product.units_per_package)) {
        return sum + (item.packages || 0);
      }
      return sum;
    }, 0);
  };

  const calculateTotalWeight = () => {
    return items.reduce((sum, item) => {
      if (item.product) {
        if (item.product.product_type === 'packaged' || item.product.units_per_package) {
          return sum + ((item.units || 0) * (item.product.weight || 0));
        } else {
          // For bulk products, weight might be per unit or total
          return sum + ((item.quantity || 0) * (item.product.weight || 0));
        }
      }
      return sum;
    }, 0);
  };

  // Check if any items have insufficient stock
  const hasInsufficientStock = () => {
    return items.some(item => 
      item.product && item.productId && !item.isStockSufficient
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!customer) {
      setError('Please select a customer');
      setSubmitting(false);
      return;
    }

    // Check stock availability before submitting
    const insufficientStockItems = items.filter(item => 
      item.product && item.productId && !item.isStockSufficient
    );
    
    // If stock is insufficient, only allow draft status
    if (insufficientStockItems.length > 0 && status !== 'draft') {
      setError('Orders with insufficient stock can only be saved as "Draft". Please adjust stock levels first, then update the order status.');
      setStatus('draft'); // Force to draft
      setSubmitting(false);
      return;
    }
    
    if (insufficientStockItems.length > 0 && status === 'draft') {
      // Allow draft orders even with insufficient stock
      // Just show a warning but allow submission
      console.log('Creating draft order with insufficient stock items');
    }

    if (items.length === 0) {
      setError('Please add at least one product');
      setSubmitting(false);
      return;
    }

    // Validate all items have products and quantities
    const invalidItems = items.filter(item => !item.product || 
      (item.product.product_type === 'packaged' && item.packages === 0 && item.units === 0) ||
      (item.product.product_type === 'bulk' && item.quantity === 0)
    );

    if (invalidItems.length > 0) {
      setError('Please fill in all product quantities');
      setSubmitting(false);
      return;
    }

    try {
      const totalAmount = calculateTotal();
      const totalBoxes = calculateTotalBoxes();
      const totalWeight = calculateTotalWeight();

      // Build notes with boxes and weight
      let finalNotes = notes || '';
      if (totalBoxes > 0) {
        finalNotes += (finalNotes ? '\n' : '') + `Boxes: ${totalBoxes}`;
      }
      if (totalWeight > 0) {
        finalNotes += (finalNotes ? '\n' : '') + `Weight: ${totalWeight.toFixed(1)} kg`;
      }

      // Create sales order
      const payload = {
        customer_id: parseInt(customer),
        order_date: orderDate,
        status: status,
        total_amount: totalAmount,
        currency: currency,
        notes: finalNotes,
        boxes: totalBoxes,
        weight: totalWeight,
        items: items.map(item => ({
          product_id: item.product!.product_id,
          variant_id: item.variantId || null,
          quantity: item.product!.product_type === 'packaged' 
            ? (item.orderByPackage ? item.packages * (item.product!.units_per_package || 12) : item.units)
            : item.quantity,
          unit_price: item.unitPrice,
          subtotal: item.subtotal,
        }))
      };

      let response;
      if (isEditMode && orderId) {
        // Update existing order
        response = await api.put(`/sales/${orderId}`, payload);
      } else {
        // Create new order
        response = await api.post("/sales", payload);
      }

      if (response.error) {
        setError(response.error);
      } else {
        // Reset form
        setCustomer('');
        setItems([]);
        setNotes('');
        // Call success callback
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      console.error('Error creating sales order:', err);
      setError(err.message || 'Failed to create sales order');
    } finally {
      setSubmitting(false);
    }
  };

  const PackagedProductItem = ({ item, index }: { item: OrderItem; index: number }) => {
    const product = item.product;

    if (!product) return null;

    // Only show for explicitly packaged products, not bulk
    const isPackaged = product.product_type === 'packaged';

    if (!isPackaged) return null;

    return (
      <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{product.name}</h4>
            <p className="text-sm text-gray-600">SKU: {product.sku}</p>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              <span>📦 {product.units_per_package || 12} {product.base_unit || 'unit'}s per {product.package_unit || 'box'}</span>
              <span>💰 {currency} {product.selling_price?.toLocaleString() || '0'}/{product.base_unit || 'unit'}</span>
              {product.price_per_package && (
                <span>📦 {currency} {product.price_per_package.toLocaleString()}/{product.package_unit || 'box'}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => removeItem(item.id)}
            className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Order Type Selection */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => updateItem(item.id, 'orderByPackage', true)}
            className={`p-4 rounded-lg border-2 transition-all ${
              item.orderByPackage
                ? 'border-blue-600 bg-blue-100'
                : 'border-gray-300 bg-white hover:border-blue-400'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Box className="w-5 h-5" />
              <span className="font-semibold">Order by {product.package_unit || 'box'}s</span>
            </div>
            <p className="text-xs text-gray-600">Best for bulk orders</p>
            {product.price_per_package && (
              <p className="text-sm font-semibold text-blue-600 mt-1">
                {currency} {product.price_per_package.toLocaleString()} per {product.package_unit || 'box'}
              </p>
            )}
          </button>
          <button
            type="button"
            onClick={() => updateItem(item.id, 'orderByPackage', false)}
            className={`p-4 rounded-lg border-2 transition-all ${
              !item.orderByPackage
                ? 'border-blue-600 bg-blue-100'
                : 'border-gray-300 bg-white hover:border-blue-400'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Package className="w-5 h-5" />
              <span className="font-semibold">Order by {product.base_unit || 'unit'}s</span>
            </div>
            <p className="text-xs text-gray-600">For precise quantities</p>
            <p className="text-sm font-semibold text-blue-600 mt-1">
              {currency} {product.selling_price?.toLocaleString() || '0'} per {product.base_unit || 'unit'}
            </p>
          </button>
        </div>

        {/* Quantity Input */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {item.orderByPackage ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Number of {product.package_unit || 'box'}s *
                </label>
                <input
                  type="number"
                  min="0"
                  value={item.packages || ''}
                  onChange={(e) => updateItem(item.id, 'packages', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="0"
                />
                <p className={`text-xs mt-1 ${item.isStockSufficient ? 'text-gray-500' : 'text-red-600 font-semibold'}`}>
                  Available: {item.availablePackages || 0} {product.package_unit || 'box'}s
                  {item.stockWarning && (
                    <span className="block text-red-600 mt-1">⚠️ {item.stockWarning}</span>
                  )}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  This equals {product.base_unit || 'unit'}s
                </label>
                <div className="text-3xl font-bold text-blue-600">
                  {item.units || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {item.packages || 0} {product.package_unit || 'box'}s × {product.units_per_package || 12} {product.base_unit || 'unit'}s
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Number of {product.base_unit || 'unit'}s *
                </label>
                <input
                  type="number"
                  min="0"
                  value={item.units || ''}
                  onChange={(e) => updateItem(item.id, 'units', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="0"
                />
                <p className={`text-xs mt-1 ${item.isStockSufficient ? 'text-gray-500' : 'text-red-600 font-semibold'}`}>
                  Available: {item.availableStock || 0} {product.base_unit || 'unit'}s
                  {item.stockWarning && (
                    <span className="block text-red-600 mt-1">⚠️ {item.stockWarning}</span>
                  )}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Requires {product.package_unit || 'box'}s
                </label>
                <div className="text-3xl font-bold text-orange-600">
                  {item.packages || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {item.units || 0} {product.base_unit || 'unit'}s ÷ {product.units_per_package || 12} per {product.package_unit || 'box'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Calculation Summary */}
        <div className="bg-white rounded-lg p-4 border-2 border-green-200">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Quantity</p>
              <p className="font-semibold text-gray-900">
                {item.orderByPackage 
                  ? `${item.packages} ${product.package_unit || 'box'}s`
                  : `${item.units} ${product.base_unit || 'unit'}s`
                }
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Unit Price</p>
              <p className="font-semibold text-gray-900">
                {currency} {item.unitPrice.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Subtotal</p>
              <p className="text-xl font-bold text-green-600">
                {currency} {item.subtotal.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Weight Info */}
        {product.weight && product.weight > 0 && (
          <div className="mt-3 p-2 bg-gray-100 rounded text-sm text-gray-700">
            <Calculator className="w-4 h-4 inline mr-1" />
            Total Weight: <strong>{((item.units || 0) * product.weight).toFixed(2)} kg</strong>
            {item.packages > 0 && (
              <span className="ml-3">
                ({item.packages} {product.package_unit || 'box'}s × {(product.weight * (product.units_per_package || 12)).toFixed(2)} kg)
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const BulkProductItem = ({ item, index }: { item: OrderItem; index: number }) => {
    const product = item.product;

    if (!product) return null;

    // Show for bulk products or products that are not explicitly packaged
    const isBulk = product.product_type === 'bulk' || 
                   (product.product_type !== 'packaged' && !product.units_per_package);

    if (!isBulk) return null;

    return (
      <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center shrink-0">
            <Droplet className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{product.name}</h4>
            <p className="text-sm text-gray-600">SKU: {product.sku}</p>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              <span>📏 Sold by {product.unit_name || product.unit_short_code || 'unit'}</span>
              <span>💰 {currency} {product.selling_price?.toLocaleString() || '0'}/{product.unit_name || product.unit_short_code || 'unit'}</span>
              <span>📦 No packaging required</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => removeItem(item.id)}
            className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Quantity ({product.unit_name || product.unit_short_code || 'unit'}s) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={item.quantity || ''}
              onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              placeholder="0"
            />
            <p className={`text-xs mt-1 ${item.isStockSufficient ? 'text-gray-500' : 'text-red-600 font-semibold'}`}>
              Available: {item.availableStock || 0} {product.unit_name || product.unit_short_code || 'unit'}s
              {item.stockWarning && (
                <span className="block text-red-600 mt-1">⚠️ {item.stockWarning}</span>
              )}
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Unit Price ({currency})
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={item.unitPrice || ''}
              readOnly
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-semibold bg-gray-100 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              Auto-calculated: {currency} {product.selling_price?.toLocaleString() || '0'}/{product.unit_name || product.unit_short_code || 'unit'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border-2 border-green-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600 mb-1">Subtotal Calculation</p>
              <p className="text-gray-700">
                {item.quantity || 0} {product.unit_name || product.unit_short_code || 'unit'}s × {currency} {item.unitPrice.toLocaleString()} = 
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600 mb-1">Subtotal</p>
              <p className="text-2xl font-bold text-green-600">
                {currency} {item.subtotal.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
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

      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Customer *</label>
          <select
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            required
          >
            <option value="">Select a customer</option>
            {customers.map(c => (
              <option key={c.customer_id} value={c.customer_id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Order Date *</label>
          <input
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            required
          />
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">📦 How This Form Works:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li><strong>Packaged Products</strong> (bottles, cans): Choose to order by packages (boxes/cartons) OR individual units</li>
              <li><strong>Bulk Products</strong> (liquids, powders): Simple quantity entry by weight/volume</li>
              <li>System automatically calculates total units, packages needed, and costs</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Product Items */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Product Details</h2>
          <button
            type="button"
            onClick={addItem}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>

        {items.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No products added yet</p>
            <button
              type="button"
              onClick={addItem}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Your First Product
            </button>
          </div>
        )}

        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id}>
              {!item.productId ? (
                <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Select Product *
                  </label>
                  <select
                    value={item.productId || ''}
                    onChange={(e) => handleProductSelect(item.id, e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Choose a product...</option>
                    {products.map(p => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.name} ({p.sku}) - {p.product_type === 'packaged' || p.units_per_package ? '📦 Packaged' : '📏 Bulk'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (item.product?.product_type === 'packaged') ? (
                <PackagedProductItem item={item} index={index} />
              ) : (
                <BulkProductItem item={item} index={index} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      {items.length > 0 && (
        <div className="p-6 bg-linear-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{items.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Boxes</p>
              <p className="text-2xl font-bold text-blue-900">{calculateTotalBoxes()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Currency</p>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg font-semibold"
              >
                <option>RWF</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Total Amount</p>
              <p className="text-3xl font-bold text-green-600">
                {currency} {calculateTotal().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Additional Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Status
            {hasInsufficientStock() && (
              <span className="ml-2 text-xs text-orange-600 font-normal">
                (Restricted to Draft - Insufficient Stock)
              </span>
            )}
          </label>
          <select
            value={status}
            onChange={(e) => {
              // If stock is insufficient, only allow draft
              if (hasInsufficientStock() && e.target.value !== 'draft') {
                setError('Orders with insufficient stock can only be saved as "Draft". Please adjust stock levels first, then update the order status.');
                return;
              }
              setStatus(e.target.value);
              setError(null); // Clear error when valid status is selected
            }}
            disabled={hasInsufficientStock()}
            className={`w-full px-4 py-2 border-2 rounded-lg focus:border-blue-500 ${
              hasInsufficientStock() 
                ? 'border-orange-300 bg-orange-50 cursor-not-allowed' 
                : 'border-gray-300'
            }`}
          >
            <option value="draft">Draft</option>
            {!hasInsufficientStock() && (
              <>
                <option value="confirmed">Confirmed</option>
                <option value="shipped">Shipped</option>
                <option value="completed">Completed</option>
              </>
            )}
          </select>
          {hasInsufficientStock() && (
            <p className="mt-1 text-xs text-orange-600">
              ⚠️ Save as draft, adjust stock levels, then update order status
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500"
            rows={3}
            placeholder="Add any special instructions..."
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-6 border-t-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || (hasInsufficientStock() && status !== 'draft')}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <LoadingSpinner size="sm" />
              {isEditMode ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              {isEditMode ? 'Update Sales Order' : 'Create Sales Order'}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default SmartSalesOrderForm;

