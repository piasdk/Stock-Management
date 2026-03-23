"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Package, Search, Plus, Minus, RotateCcw } from 'lucide-react';
import { api } from "@/lib/api";

interface CountItem {
  product_id: number;
  product_name: string;
  sku: string;
  expected_quantity: number;
  counted_quantity: number;
  variance: number;
  unit_cost?: number;
}

const PhysicalCountPage = () => {
  const params = useParams();
  const router = useRouter();
  const countId = params?.count_id as string;

  const [count, setCount] = useState<any>(null);
  const [items, setItems] = useState<CountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (countId) {
      loadCountData();
    }
  }, [countId]);

  const loadCountData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load count details
      const countsResponse = await api.get("/operations/physical-counts?status=all");
      if (countsResponse.error) {
        setError(countsResponse.error);
        return;
      }

      const counts = Array.isArray(countsResponse.data) ? countsResponse.data : [];
      const foundCount = counts.find((c: any) => c.id === countId);
      
      if (!foundCount) {
        setError("Physical count not found");
        return;
      }

      setCount(foundCount);

      // Load inventory items for this location
      console.log('Loading inventory for count:', foundCount);
      
      if (foundCount.location_id) {
        const inventoryResponse = await api.get(`/operations/inventory/by-location?location_id=${foundCount.location_id}`);
        console.log('Inventory response:', inventoryResponse);
        
        if (inventoryResponse.error) {
          console.error('Error loading inventory:', inventoryResponse.error);
          setError(`Failed to load inventory: ${inventoryResponse.error}`);
        } else if (inventoryResponse.data && Array.isArray(inventoryResponse.data) && inventoryResponse.data.length > 0) {
          const inventoryItems = inventoryResponse.data.map((item: any) => ({
            product_id: item.product_id || item.id,
            product_name: item.product_name || item.name || item.product?.name || 'Unknown Product',
            sku: item.sku || item.product_code || item.product?.sku || item.product?.product_code || 'N/A',
            expected_quantity: item.quantity || item.qty || item.stock_quantity || 0,
            counted_quantity: item.quantity || item.qty || item.stock_quantity || 0, // Start with expected as default
            variance: 0,
            unit_cost: item.unit_cost || item.cost_price || item.product?.cost_price || 0
          }));
          console.log('Mapped inventory items:', inventoryItems);
          setItems(inventoryItems);
        } else {
          console.warn('No inventory items found or empty response');
          setError('No inventory items found for this location. Please ensure products are assigned to this location.');
        }
      } else {
        // If no specific location, load all inventory
        const inventoryResponse = await api.get("/operations/inventory/all");
        console.log('All inventory response:', inventoryResponse);
        
        if (inventoryResponse.error) {
          console.error('Error loading all inventory:', inventoryResponse.error);
          setError(`Failed to load inventory: ${inventoryResponse.error}`);
        } else if (inventoryResponse.data && Array.isArray(inventoryResponse.data) && inventoryResponse.data.length > 0) {
          const inventoryItems = inventoryResponse.data.map((item: any) => ({
            product_id: item.product_id || item.id,
            product_name: item.product_name || item.name || item.product?.name || 'Unknown Product',
            sku: item.sku || item.product_code || item.product?.sku || item.product?.product_code || 'N/A',
            expected_quantity: item.quantity || item.total_quantity || item.stock_quantity || 0,
            counted_quantity: item.quantity || item.total_quantity || item.stock_quantity || 0,
            variance: 0,
            unit_cost: item.unit_cost || item.cost_price || item.product?.cost_price || 0
          }));
          console.log('Mapped all inventory items:', inventoryItems);
          setItems(inventoryItems);
        } else {
          console.warn('No inventory items found');
          setError('No inventory items found. Please add products to inventory first.');
        }
      }
    } catch (err: any) {
      console.error('Error loading count data:', err);
      setError(err.message || 'Failed to load count data');
    } finally {
      setLoading(false);
    }
  };

  const updateCountedQuantity = (productId: number, quantity: number) => {
    setItems(items.map(item => {
      if (item.product_id === productId) {
        const counted = Math.max(0, quantity);
        return {
          ...item,
          counted_quantity: counted,
          variance: counted - item.expected_quantity
        };
      }
      return item;
    }));
  };

  const incrementQuantity = (productId: number) => {
    const item = items.find(i => i.product_id === productId);
    if (item) {
      updateCountedQuantity(productId, item.counted_quantity + 1);
    }
  };

  const decrementQuantity = (productId: number) => {
    const item = items.find(i => i.product_id === productId);
    if (item) {
      updateCountedQuantity(productId, Math.max(0, item.counted_quantity - 1));
    }
  };

  const setAllToZero = () => {
    if (confirm('Set all counted quantities to zero?')) {
      setItems(items.map(item => ({
        ...item,
        counted_quantity: 0,
        variance: -item.expected_quantity
      })));
    }
  };

  const setAllToExpected = () => {
    if (confirm('Set all counted quantities to expected values?')) {
      setItems(items.map(item => ({
        ...item,
        counted_quantity: item.expected_quantity,
        variance: 0
      })));
    }
  };

  const handleBarcodeSearch = (barcode: string) => {
    if (!barcode.trim()) return;
    
    const foundItem = items.find(item => 
      item.sku.toLowerCase() === barcode.toLowerCase() ||
      item.product_id.toString() === barcode
    );
    
    if (foundItem) {
      // Focus on the item and increment its count
      incrementQuantity(foundItem.product_id);
      // Scroll to the item
      const element = document.getElementById(`product-${foundItem.product_id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('bg-yellow-100');
        setTimeout(() => {
          element.classList.remove('bg-yellow-100');
        }, 2000);
      }
      setSearchTerm(''); // Clear search after finding
    } else {
      alert(`Product with SKU/Barcode "${barcode}" not found`);
    }
  };

  const saveCount = async () => {
    setSaving(true);
    setError(null);

    try {
      // Calculate totals
      const totalItems = items.length;
      const countedItems = items.filter(item => item.counted_quantity > 0).length;
      const variances = items.filter(item => item.variance !== 0).length;
      const varianceValue = items.reduce((sum, item) => {
        return sum + (item.variance * (item.unit_cost || 0));
      }, 0);

      // Prepare items array with all necessary fields
      const itemsToSave = items.map(item => ({
        product_id: item.product_id,
        sku: item.sku,
        expected_quantity: item.expected_quantity,
        counted_quantity: item.counted_quantity,
        unit_cost: item.unit_cost || 0,
        location_id: count?.location_id || null
      }));

      // Update the physical count with progress and individual items
      const updateResponse = await api.put(`/operations/physical-counts/${encodeURIComponent(countId)}`, {
        total_items: totalItems,
        counted_items: countedItems,
        variances_count: variances,
        variance_value: varianceValue,
        items: itemsToSave
      });

      if (updateResponse.error) {
        setError(updateResponse.error);
        return;
      }

      alert('Count saved successfully!');
      router.push('/operations');
    } catch (err: any) {
      console.error('Error saving count:', err);
      setError(err.message || 'Failed to save count');
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      item.product_name.toLowerCase().includes(term) ||
      item.sku.toLowerCase().includes(term) ||
      item.product_id.toString().includes(term)
    );
  }, [items, searchTerm]);

  const totalVariance = items.reduce((sum, item) => sum + Math.abs(item.variance), 0);
  const totalVarianceValue = items.reduce((sum, item) => sum + (item.variance * (item.unit_cost || 0)), 0);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading count data...</p>
        </div>
      </div>
    );
  }

  if (error && !count) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/operations')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Physical Counts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/operations')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Physical Count: {count?.id}</h1>
              <p className="text-sm text-gray-600">
                {count?.location} • {count?.type.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={saveCount}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Count'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Items</p>
            <p className="text-2xl font-bold text-blue-600">{items.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Counted</p>
            <p className="text-2xl font-bold text-green-600">
              {items.filter(item => item.counted_quantity > 0).length}
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Variances</p>
            <p className="text-2xl font-bold text-yellow-600">
              {items.filter(item => item.variance !== 0).length}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Variance Value</p>
            <p className="text-2xl font-bold text-red-600">
              RWF {Math.abs(totalVarianceValue).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Quick Actions */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product name, SKU, or scan barcode (press Enter)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim()) {
                  handleBarcodeSearch(searchTerm);
                }
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={setAllToExpected}
              className="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center gap-2"
              title="Set all to expected quantities"
            >
              <RotateCcw className="w-4 h-4" />
              Set to Expected
            </button>
            <button
              onClick={setAllToZero}
              className="px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 flex items-center gap-2"
              title="Set all to zero"
            >
              <Minus className="w-4 h-4" />
              Clear All
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: Type SKU and press Enter to quickly find and count a product
        </p>
      </div>

      {/* Items Table */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Counted</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Variance</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm ? `No items found matching "${searchTerm}"` : 'No items to count. Please ensure products are assigned to this location.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr 
                    key={item.product_id} 
                    id={`product-${item.product_id}`}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{item.product_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-600 font-mono text-sm">{item.sku}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">{item.expected_quantity}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => decrementQuantity(item.product_id)}
                          className="p-1 text-gray-600 hover:bg-gray-200 rounded"
                          title="Decrease by 1"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={item.counted_quantity}
                          onChange={(e) => updateCountedQuantity(item.product_id, parseInt(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                        />
                        <button
                          onClick={() => incrementQuantity(item.product_id)}
                          className="p-1 text-gray-600 hover:bg-gray-200 rounded"
                          title="Increase by 1"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${
                        item.variance === 0 
                          ? 'text-gray-600' 
                          : item.variance > 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {item.variance > 0 ? '+' : ''}{item.variance}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => updateCountedQuantity(item.product_id, item.expected_quantity)}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        title="Set to expected quantity"
                      >
                        Use Expected
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PhysicalCountPage;
