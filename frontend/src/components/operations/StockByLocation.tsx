"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { 
  Warehouse, TrendingUp, TrendingDown, AlertTriangle, Package, Box, 
  ArrowRightLeft, Calendar, Filter, Search, Download, Plus, MapPin, 
  DollarSign, BarChart3, Clock, CheckCircle, XCircle, ChevronDown, 
  FileText, FileSpreadsheet, Eye, X, Minus, Trash2, Calculator
} from 'lucide-react';

import { api } from "@/lib/api";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";

const StockByLocation = () => {
  const router = useRouter();
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [locations, setLocations] = useState<any[]>([]);
  const [stockByLocation, setStockByLocation] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState<any>(null);
  const [transferForm, setTransferForm] = useState({
    reference_number: '',
    notes: ''
  });
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productVariants, setProductVariants] = useState<Map<number, any[]>>(new Map());
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedLocation]);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  // Filter products based on search term
  useEffect(() => {
    if (productSearchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const searchLower = productSearchTerm.toLowerCase();
      const filtered = products.filter(p => 
        p.name?.toLowerCase().includes(searchLower) ||
        p.sku?.toLowerCase().includes(searchLower)
      );
      setFilteredProducts(filtered);
    }
  }, [productSearchTerm, products]);

  const loadCategories = async () => {
    try {
      const categoriesResponse = await api.get<any[]>("/catalog/categories");
      if (!categoriesResponse.error && categoriesResponse.data) {
        setCategories(categoriesResponse.data);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadProducts = async () => {
    try {
      const productsResponse = await api.get<any[]>("/catalog/products");
      if (!productsResponse.error && productsResponse.data) {
        setProducts(productsResponse.data);
        setFilteredProducts(productsResponse.data);
      }
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load locations
      const locationsResponse = await api.get<any[]>("/inventory/locations");
      if (locationsResponse.error) {
        if (locationsResponse.details?.status === 500) {
          setLocations([]);
          setStockByLocation([]);
          setLoading(false);
          return;
        }
        setError(locationsResponse.error);
        setLoading(false);
        return;
      }
      setLocations(locationsResponse.data || []);

      // Load stock by location
      const params: any = {};
      if (selectedLocation !== 'all') {
        params.locationId = selectedLocation;
      }
      const stockResponse = await api.get<any[]>("/operations/inventory/by-location", params);
      if (stockResponse.error) {
        if (stockResponse.details?.status === 500) {
          setStockByLocation([]);
          setLoading(false);
          return;
        }
        setError(stockResponse.error);
        setLoading(false);
        return;
      }
      setStockByLocation(stockResponse.data || []);
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format currency
  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'RWF 0';
    }
    return `RWF ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  // Calculate location stats from stock data
  const locationStats = useMemo(() => {
    const stats: Record<string, { items: Set<number>; value: number; quantity: number }> = {};
    // Track which product-location combinations we've already processed to avoid double counting
    const processed = new Set<string>();
    
    stockByLocation.forEach((item: any) => {
      // Process location data using loc_${location_id} keys (most reliable - from database)
      locations.forEach((loc: any) => {
        const locKey = `loc_${loc.location_id}`;
        const locationData = item[locKey];
        
        if (locationData && typeof locationData === 'object' && 'qty' in locationData) {
          const qty = Number(locationData.qty || locationData.quantity) || 0;
          
          if (qty > 0) {
            const locName = loc.name || loc.location_name || '';
            const productLocationKey = `${item.product_id}_${loc.location_id}`;
            
            // Skip if we've already processed this product-location combination
            if (processed.has(productLocationKey)) {
              return;
            }
            processed.add(productLocationKey);
            
            // Get value from locationData - use total_value from database (stock_levels.total_value)
            // This is the actual stored value in the database
            let value = Number(locationData.value) || 0;
            
            // If value is 0, null, undefined, or NaN, calculate it from quantity * cost
            if (value === 0 || isNaN(value) || !locationData.value) {
              // Try avgCost first (from stock_levels.average_cost - actual cost per unit)
              const avgCost = Number(locationData.avgCost || locationData.average_cost) || 0;
              
              // Then try product cost_price
              const productCost = Number(item.cost_price) || 0;
              
              // Then try product selling_price as last resort
              const productSelling = Number(item.selling_price) || 0;
              
              // Use the first available cost
              const costToUse = avgCost > 0 ? avgCost : (productCost > 0 ? productCost : productSelling);
              
              if (costToUse > 0 && qty > 0) {
                value = Number(qty) * Number(costToUse);
              }
            }
            
            // Ensure value is a valid number
            value = Number(value) || 0;
            
            // Use exact location name from database (case-sensitive)
            if (!stats[locName]) {
              stats[locName] = { items: new Set(), value: 0, quantity: 0 };
            }
            
            // Add product_id to set to count unique products
            stats[locName].items.add(item.product_id);
            // Accumulate values properly - ensure both are numbers
            const currentValue = Number(stats[locName].value) || 0;
            const valueToAdd = Number(value) || 0;
            stats[locName].value = currentValue + valueToAdd;
            stats[locName].quantity = (Number(stats[locName].quantity) || 0) + qty;
          }
        }
      });
    });
    
    // Convert Sets to counts and ensure all values are numbers
    const result: Record<string, { items: number; value: number; quantity: number }> = {};
    Object.keys(stats).forEach(locName => {
      const stat = stats[locName];
      // Force conversion to number - handle string values
      let finalValue = 0;
      const statValue: any = stat.value;
      if (typeof statValue === 'number') {
        finalValue = statValue;
      } else if (typeof statValue === 'string') {
        // Remove any formatting (commas, currency symbols, etc.)
        const cleaned = String(statValue).replace(/[^\d.-]/g, '');
        finalValue = parseFloat(cleaned) || 0;
      } else {
        finalValue = Number(statValue) || 0;
      }
      
      result[locName] = {
        items: stat.items.size,
        value: finalValue,
        quantity: Number(stat.quantity) || 0
      };
    });
    
    // Debug: Log all location stats
    console.log('[LocationStats] Final stats:', result);
    console.log('[LocationStats] Locations from API:', locations.map(l => ({ 
      id: l.location_id, 
      name: l.name || l.location_name,
      nameLower: (l.name || l.location_name || '').toLowerCase()
    })));
    
    // Debug: Check Masaka specifically
    const masakaLoc = locations.find(l => (l.name || l.location_name || '').toLowerCase().includes('masaka'));
    if (masakaLoc) {
      const masakaName = masakaLoc.name || masakaLoc.location_name || '';
      console.log('[LocationStats] Masaka location check:', {
        locationName: masakaName,
        statsForMasaka: result[masakaName],
        allStatsKeys: Object.keys(result),
        matchingKeys: Object.keys(result).filter(k => k.toLowerCase().includes('masaka')),
        rawStatsValue: stats[masakaName]?.value
      });
    }
    
    return result;
  }, [stockByLocation, locations]);

  // Transform API data for locations display
  const transformedLocations = useMemo(() => {
    return locations.map((loc: any) => {
      const locName = loc.name || loc.location_name || '';
      // Try exact match first, then case-insensitive match
      let stats = locationStats[locName];
      if (!stats) {
        // Try case-insensitive match
        const matchingKey = Object.keys(locationStats).find(key => 
          key.toLowerCase().trim() === locName.toLowerCase().trim()
        );
        if (matchingKey) {
          stats = locationStats[matchingKey];
        }
      }
      stats = stats || { items: 0, value: 0, quantity: 0 };
      
      // Debug for Masaka
      if (locName.toLowerCase().includes('masaka')) {
        console.log('[TransformedLocations] Masaka:', {
          locName,
          locationStatsKeys: Object.keys(locationStats),
          stats,
          matchingStats: locationStats[locName]
        });
      }
      
      return {
        id: String(loc.location_id),
        name: locName,
        address: loc.address_line1 || '',
        type: loc.location_type || 'Warehouse',
        capacity: 0,
        utilized: stats.quantity || 0,
        totalItems: stats.items || 0,
        totalValue: stats.value || 0,
        lastCount: 'N/A',
        status: loc.is_active ? 'active' : 'inactive'
      };
    });
  }, [locations, locationStats]);

  // Filter stock data
  const filteredStock = useMemo(() => {
    let filtered = stockByLocation;

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter((item: any) => 
        (item.sku || '').toLowerCase().includes(searchLower) ||
        (item.product_name || '').toLowerCase().includes(searchLower)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((item: any) => 
        String(item.category_id || item.category) === String(selectedCategory)
      );
    }

    if (selectedLocation !== 'all') {
      const selectedLocId = Number(selectedLocation);
      filtered = filtered.filter((item: any) => {
        // Check if this item has stock at the selected location
        const locIdKey = `loc_${selectedLocId}`;
        if (item[locIdKey] && item[locIdKey].qty > 0) return true;
        
        // Also check location name matching
        const selectedLoc = locations.find(l => l.location_id === selectedLocId);
        if (selectedLoc) {
          const locName = (selectedLoc.name || selectedLoc.location_name || '').toLowerCase();
          if (locName.includes('warehouse') || locName.includes('main')) {
            return item.mainWarehouse?.qty > 0;
          } else if (locName.includes('store') || locName.includes('downtown')) {
            return item.downtownStore?.qty > 0;
          } else if (locName.includes('factory') || locName.includes('storage')) {
            return item.factoryStorage?.qty > 0;
          }
        }
        return false;
      });
    }

    return filtered;
  }, [stockByLocation, searchQuery, selectedCategory, selectedLocation, locations]);

  // Calculate total stats from actual location data (not aggregated product totals)
  const totalStats = useMemo(() => {
    // Sum up values from all locations (this gives us the real total value across all locations)
    let totalValue = 0;
    let totalUnits = 0;
    
    Object.values(locationStats).forEach((stat: any) => {
      totalValue += Number(stat.value) || 0;
      totalUnits += Number(stat.quantity) || 0;
    });
    
    // Calculate potential revenue from filtered stock items
    let totalRevenue = 0;
    filteredStock.forEach((item: any) => {
      // For each product, sum up quantities and values from all its locations
      locations.forEach((loc: any) => {
        const locKey = `loc_${loc.location_id}`;
        const locationData = item[locKey];
        if (locationData && typeof locationData === 'object' && 'qty' in locationData) {
          const qty = Number(locationData.qty || locationData.quantity) || 0;
          const sellingPrice = Number(item.selling_price) || Number(item.cost_price) || 0;
          if (qty > 0 && sellingPrice > 0) {
            totalRevenue += qty * sellingPrice;
          }
        }
      });
    });
    
    return { 
      totalValue: Number(totalValue) || 0, 
      totalUnits: Number(totalUnits) || 0, 
      totalRevenue: Number(totalRevenue) || 0 
    };
  }, [filteredStock, locationStats, locations]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      low_stock: 'bg-orange-100 text-orange-800 border-orange-300',
      optimal: 'bg-green-100 text-green-800 border-green-300',
      overstocked: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactElement> = {
      critical: <XCircle className="w-4 h-4" />,
      low_stock: <AlertTriangle className="w-4 h-4" />,
      optimal: <CheckCircle className="w-4 h-4" />,
      overstocked: <TrendingUp className="w-4 h-4" />
    };
    return icons[status] || <AlertTriangle className="w-4 h-4" />;
  };

  const getStockStatus = (item: any, locationData: any): string => {
    if (!locationData || locationData.qty === 0) return 'critical';
    const available = locationData.available || locationData.quantity_available || (locationData.qty - (locationData.reserved || 0));
    const minStock = locationData.safety_stock || 50;
    const reorderPoint = Math.max(minStock * 1.5, 100);
    const maxStock = Math.max(minStock * 5, 500);
    
    if (available <= minStock) return 'critical';
    if (available <= reorderPoint) return 'low_stock';
    if (available >= maxStock) return 'overstocked';
    return 'optimal';
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <ErrorMessage error={error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Stock by Location</h1>
              <p className="text-gray-600 mt-1">View and manage inventory across all locations</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setTransferForm({
                    reference_number: '',
                    notes: ''
                  });
                  setSelectedProducts([]);
                  setProductSearchTerm('');
                  setShowProductDropdown(false);
                  setProductVariants(new Map());
                  setTransferError(null);
                  setShowTransferModal(true);
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <ArrowRightLeft className="w-4 h-4" />
                Transfer Stock
              </button>
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.hash = 'inventory';
                    window.dispatchEvent(new CustomEvent('navigateToSection', { detail: 'inventory' }));
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Stock
              </button>
              <div className="relative">
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showExportMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                      <button
                        onClick={() => {
                          const csvContent = [
                            ['SKU', 'Product', 'Category', 'Total Quantity', 'Total Value'].join(','),
                            ...filteredStock.map((item: any) => [
                              item.sku || 'N/A',
                              `"${(item.product_name || 'Unknown').replace(/"/g, '""')}"`,
                              item.category_name || 'Uncategorized',
                              item.total_quantity || 0,
                              item.total_value || 0
                            ].join(','))
                          ].join('\n');
                          
                          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `stock-by-location-${new Date().toISOString().split('T')[0]}.csv`;
                          a.click();
                          window.URL.revokeObjectURL(url);
                          setShowExportMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                        Export to Excel (CSV)
                      </button>
                      <button
                        onClick={() => {
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            const htmlContent = `
                              <html>
                                <head>
                                  <title>Stock by Location Report</title>
                                  <style>
                                    body { font-family: Arial, sans-serif; padding: 20px; }
                                    h1 { color: #333; }
                                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                                    th { background-color: #f2f2f2; }
                                  </style>
                                </head>
                                <body>
                                  <h1>Stock by Location Report</h1>
                                  <p>Generated: ${new Date().toLocaleString()}</p>
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>SKU</th>
                                        <th>Product</th>
                                        <th>Category</th>
                                        <th>Total Quantity</th>
                                        <th>Total Value</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      ${filteredStock.map((item: any) => {
                                        const value = item.total_value || 0;
                                        const formattedValue = `RWF ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
                                        return `
                                      <tr>
                                        <td>${item.sku || 'N/A'}</td>
                                        <td>${item.product_name || 'Unknown'}</td>
                                        <td>${item.category_name || 'Uncategorized'}</td>
                                        <td>${item.total_quantity || 0}</td>
                                        <td>${formattedValue}</td>
                                      </tr>
                                    `;
                                      }).join('')}
                                    </tbody>
                                  </table>
                                </body>
                              </html>
                            `;
                            printWindow.document.write(htmlContent);
                            printWindow.document.close();
                            printWindow.print();
                          }
                          setShowExportMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50"
                      >
                        <FileText className="w-4 h-4 text-red-600" />
                        Export to PDF
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Location Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {transformedLocations.map(loc => {
              const utilization = loc.capacity > 0 ? ((loc.utilized / loc.capacity) * 100).toFixed(1) : '0';
              return (
                <div
                  key={loc.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedLocation === 'all' || selectedLocation === loc.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedLocation(selectedLocation === loc.id ? 'all' : loc.id)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{loc.name}</h3>
                      <p className="text-sm text-gray-600">{loc.type}</p>
                    </div>
                    <Warehouse className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <p className="text-gray-600">Items</p>
                      <p className="text-xl font-bold text-gray-900">{loc.totalItems}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Value</p>
                      <p className="text-lg font-semibold text-green-600">{formatCurrency(loc.totalValue)}</p>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Utilization</span>
                      <span className="font-semibold">{utilization}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          parseFloat(utilization) > 80 ? 'bg-red-500' : parseFloat(utilization) > 60 ? 'bg-orange-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 pt-2 border-t">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Last count: {loc.lastCount}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by product name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Categories</option>
              {categories.map((cat: any) => (
                <option key={cat.category_id || cat.id} value={cat.category_id || cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Items</p>
            <p className="text-2xl font-bold text-gray-900">{filteredStock.length}</p>
            <p className="text-xs text-gray-500 mt-1">{totalStats.totalUnits.toLocaleString()} units</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Value</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalStats.totalValue)}</p>
            <p className="text-xs text-green-600 mt-1">Cost value</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Potential Revenue</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalStats.totalRevenue)}</p>
            <p className="text-xs text-blue-600 mt-1">At selling price</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Profit Margin</p>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(totalStats.totalRevenue - totalStats.totalValue)}
            </p>
            <p className="text-xs text-purple-600 mt-1">
              {totalStats.totalRevenue > 0 
                ? `${(((totalStats.totalRevenue - totalStats.totalValue) / totalStats.totalRevenue) * 100).toFixed(1)}% margin`
                : '0% margin'}
            </p>
          </div>
        </div>

        {/* Stock Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Stock Details</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase w-[20%]">Product</th>
                  {selectedLocation === 'all' && (
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase w-[10%] hidden md:table-cell">Location</th>
                  )}
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase w-[12%]">Stock</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase w-[15%] hidden lg:table-cell">Valuation</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase w-[15%] hidden xl:table-cell">Health</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase w-[10%] hidden sm:table-cell">Status</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-600 uppercase w-[18%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={selectedLocation === 'all' ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>{stockByLocation.length === 0 ? 'No stock data available.' : 'No products match your filters.'}</p>
                    </td>
                  </tr>
                ) : (
                  (() => {
                    // When "all locations" is selected, create one row per product-location combination
                    if (selectedLocation === 'all') {
                      const rows: any[] = [];
                      filteredStock.forEach((item: any, itemIndex: number) => {
                        locations.forEach((loc: any) => {
                          const locIdKey = `loc_${loc.location_id}`;
                          const locationData = item[locIdKey];
                          
                          // Only create row if there's stock at this location
                          if (locationData && locationData.qty > 0) {
                            rows.push({
                              item,
                              locationData,
                              locationName: loc.name || loc.location_name || '',
                              locationId: loc.location_id,
                              key: `${item.product_id}-${loc.location_id}-${itemIndex}`
                            });
                          }
                        });
                      });
                      return rows;
                    } else {
                      // Single location selected - one row per product
                      return filteredStock.map((item: any, index: number) => {
                        const selectedLocId = Number(selectedLocation);
                        const locIdKey = `loc_${selectedLocId}`;
                        const locationData = item[locIdKey];
                        const selectedLoc = locations.find(l => l.location_id === selectedLocId);
                        const locationName = selectedLoc?.name || selectedLoc?.location_name || '';
                        
                        return {
                          item,
                          locationData,
                          locationName,
                          locationId: selectedLocId,
                          key: `${item.product_id}-${selectedLocId}-${index}`
                        };
                      });
                    }
                  })().map(({ item, locationData, locationName, locationId, key }: any) => {

                    // Use database fields
                    const quantity = locationData?.qty || locationData?.quantity || 0;
                    const reserved = locationData?.reserved || locationData?.quantity_reserved || 0;
                    const available = locationData?.available || locationData?.quantity_available || (quantity - reserved);
                    const packages = locationData?.packages_in_stock || 0;
                    const looseUnits = locationData?.loose_units || 0;
                    const value = locationData?.value || 0;
                    const status = getStockStatus(item, locationData);
                    const avgCost = locationData?.avgCost || item.cost_price || 0;
                    const sellingPrice = item.selling_price || item.cost_price || 0;
                    const potentialRevenue = available * sellingPrice;
                    
                    // Variant information from database
                    const variantName = locationData?.variant_name || item.variant_name || '';
                    const variantSku = locationData?.variant_sku || item.variant_sku || '';
                    const size = locationData?.size || item.size || '';
                    
                    // Product unit information from database
                    // For packaged products, get from variant (locationData), otherwise from product
                    const baseUnit = locationData?.base_unit || item.base_unit || item.unit_name || 'unit';
                    const packageUnit = locationData?.package_unit || item.package_unit || 'box';
                    const unitsPerPackage = locationData?.units_per_package || locationData?.variant_units_per_package || item.units_per_package || 1;
                    const productType = item.product_type || 'bulk';
                    
                    // Stock health metrics (using safety_stock as min, calculate others)
                    const minStock = locationData?.safety_stock || item.safety_stock || 50;
                    const reorderPoint = Math.max(minStock * 1.5, 100);
                    const maxStock = Math.max(minStock * 5, 500);

                    return [
                      <tr key={key} className="hover:bg-gray-50">
                        {/* Product */}
                        <td className="px-2 py-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{item.product_name || 'Unknown Product'}</p>
                            <p className="text-xs text-gray-600 truncate">
                              {variantName || variantSku || size || (productType === 'packaged' ? `${unitsPerPackage} per ${packageUnit}` : '')}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                {variantSku || item.sku || 'N/A'}
                              </span>
                              <span className="text-xs text-gray-500 truncate">{item.category_name || 'Uncategorized'}</span>
                            </div>
                            {selectedLocation === 'all' && (
                              <div className="flex items-center gap-1 mt-1 md:hidden">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                <span className="text-xs font-medium text-gray-700">{locationName || 'Unknown'}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Location - Desktop only */}
                        {selectedLocation === 'all' && (
                          <td className="px-2 py-3 hidden md:table-cell">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900 truncate">{locationName || 'Unknown'}</span>
                            </div>
                          </td>
                        )}

                        {/* Stock */}
                        <td className="px-2 py-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="font-bold text-sm text-gray-900">{Number(quantity).toLocaleString()}</span>
                              <span className="text-xs text-gray-600">{baseUnit}s</span>
                            </div>
                            {packages > 0 && productType === 'packaged' && (
                              <div className="flex items-center gap-1 text-xs">
                                <Box className="w-3 h-3 text-purple-500 shrink-0" />
                                <span className="text-gray-600">
                                  {packages} {packageUnit}s
                                </span>
                              </div>
                            )}
                            <p className="text-xs font-semibold text-green-600">Avail: {Number(available).toFixed(0)}</p>
                            {reserved > 0 && (
                              <p className="text-xs text-orange-600">Res: {reserved}</p>
                            )}
                          </div>
                        </td>

                        {/* Valuation - Desktop only */}
                        <td className="px-2 py-3 hidden lg:table-cell">
                          <div className="space-y-0.5">
                            <div>
                              <p className="text-xs text-gray-600">Cost</p>
                              <p className="font-semibold text-sm text-gray-900">{formatCurrency(value)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Avg</p>
                              <p className="text-xs text-gray-700">{formatCurrency(avgCost)}/{baseUnit}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Potential</p>
                              <p className="text-xs font-semibold text-green-600">{formatCurrency(potentialRevenue)}</p>
                            </div>
                          </div>
                        </td>

                        {/* Health - Large screens only */}
                        <td className="px-2 py-3 hidden xl:table-cell">
                          <div className="space-y-1">
                            <div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    available <= minStock ? 'bg-red-500' :
                                    available <= reorderPoint ? 'bg-orange-500' :
                                    available >= maxStock ? 'bg-blue-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min((available / maxStock) * 100, 100)}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{available} / {maxStock}</p>
                            </div>
                            <div className="text-xs">
                              <p><span className="text-gray-600">Min:</span> <span className="font-semibold">{minStock}</span></p>
                              <p><span className="text-gray-600">Reorder:</span> <span className="font-semibold">{reorderPoint}</span></p>
                            </div>
                          </div>
                        </td>

                        {/* Status - Small screens and up */}
                        <td className="px-2 py-3 hidden sm:table-cell">
                          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(status)}`}>
                            {getStatusIcon(status)}
                            <span className="hidden md:inline">{status.replace('_', ' ').toUpperCase()}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-2 py-3">
                          <div className="flex justify-end gap-1 flex-wrap">
                            <button 
                              onClick={() => {
                                // Navigate to stock adjustments with product pre-selected
                                if (typeof window !== 'undefined') {
                                  const adjustInfo = {
                                    product_id: item.product_id,
                                    product_name: item.product_name,
                                    sku: item.sku || variantSku,
                                    variant_id: locationData?.variant_id || null,
                                    location_id: locationId,
                                    location_name: locationName,
                                    current_quantity: quantity,
                                    available: available,
                                    stock_level_id: locationData?.stock_level_id || null
                                  };
                                  sessionStorage.setItem('adjust-stock-data', JSON.stringify(adjustInfo));
                                  sessionStorage.setItem('adjust-stock-skus', JSON.stringify([item.sku || variantSku]));
                                  const url = new URL(window.location.href);
                                  url.searchParams.set('section', 'stock-adjustments');
                                  url.searchParams.set('create', 'true');
                                  window.history.pushState({}, '', url);
                                  window.dispatchEvent(new CustomEvent('navigateToSection', { detail: 'stock-adjustments' }));
                                }
                              }}
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap"
                              title="Adjust Stock"
                            >
                              <TrendingUp className="w-3 h-3 inline md:hidden" />
                              <span className="hidden md:inline">Adjust</span>
                            </button>
                            <button 
                              onClick={async () => {
                                // Calculate packages and loose units from available if not set
                                let calculatedPackages = packages;
                                let calculatedLooseUnits = looseUnits;
                                
                                // For packaged products, try to get variant information if missing
                                let finalSize = locationData?.size || size;
                                let finalSizeUnit = locationData?.size_unit || '';
                                let finalBaseUnit = baseUnit;
                                let finalPackageUnit = packageUnit;
                                let finalUnitsPerPackage = unitsPerPackage;
                                
                                // If product is packaged but missing variant info, try to fetch it
                                if (productType === 'packaged' && (!finalSize || finalSize === 0 || finalSize === '')) {
                                  try {
                                    // Try to get variant from locationData first
                                    if (locationData?.variant_id) {
                                      const variantResponse = await api.get<any>(`/catalog/products/${item.product_id}/variants/${locationData.variant_id}`);
                                      if (variantResponse.data) {
                                        finalSize = (variantResponse.data as any).size || finalSize;
                                        finalSizeUnit = (variantResponse.data as any).size_unit || finalSizeUnit;
                                        finalBaseUnit = (variantResponse.data as any).base_unit || finalBaseUnit;
                                        finalPackageUnit = (variantResponse.data as any).package_unit || finalPackageUnit;
                                        finalUnitsPerPackage = (variantResponse.data as any).units_per_package || finalUnitsPerPackage;
                                      }
                                    } else {
                                      // Try to get all variants and use the first one
                                      const productResponse = await api.get<any>(`/catalog/products/${item.product_id}`);
                                      if (productResponse.data && (productResponse.data as any).variants && (productResponse.data as any).variants.length > 0) {
                                        const firstVariant = (productResponse.data as any).variants[0];
                                        finalSize = firstVariant.size || finalSize;
                                        finalSizeUnit = firstVariant.size_unit || finalSizeUnit;
                                        finalBaseUnit = firstVariant.base_unit || finalBaseUnit;
                                        finalPackageUnit = firstVariant.package_unit || finalPackageUnit;
                                        finalUnitsPerPackage = firstVariant.units_per_package || finalUnitsPerPackage;
                                      }
                                    }
                                  } catch (err) {
                                    console.warn('Could not fetch variant details:', err);
                                  }
                                }
                                
                                if (productType === 'packaged' && finalUnitsPerPackage > 0) {
                                  // If packages_in_stock is 0 or not set, calculate from available quantity
                                  if ((packages === 0 || !packages) && available > 0) {
                                    calculatedPackages = Math.floor(available / finalUnitsPerPackage);
                                    calculatedLooseUnits = available % finalUnitsPerPackage;
                                  } else if (packages === 0 && looseUnits === 0 && available > 0) {
                                    // Fallback: calculate from available
                                    calculatedPackages = Math.floor(available / finalUnitsPerPackage);
                                    calculatedLooseUnits = available % finalUnitsPerPackage;
                                  }
                                }
                                
                                // Show product details in modal
                                setSelectedProductDetails({
                                  product: item,
                                  locationData,
                                  locationName,
                                  locationId,
                                  quantity,
                                  reserved,
                                  available,
                                  packages: calculatedPackages,
                                  looseUnits: calculatedLooseUnits,
                                  value,
                                  avgCost,
                                  potentialRevenue,
                                  status,
                                  variantName,
                                  variantSku,
                                  size: finalSize,
                                  sizeUnit: finalSizeUnit,
                                  baseUnit: finalBaseUnit,
                                  packageUnit: finalPackageUnit,
                                  unitsPerPackage: finalUnitsPerPackage,
                                  productType,
                                  minStock,
                                  reorderPoint,
                                  maxStock,
                                  sellingPrice
                                });
                                setShowDetailsModal(true);
                              }}
                              className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 whitespace-nowrap"
                              title="View Details"
                            >
                              <Eye className="w-3 h-3 inline md:hidden" />
                              <span className="hidden md:inline">Details</span>
                            </button>
                          </div>
                        </td>
                      </tr>,
                      // Mobile: Show additional info in a separate row
                      <tr key={`${key}-mobile`} className="lg:hidden">
                        <td colSpan={selectedLocation === 'all' ? 7 : 6} className="px-2 py-2 bg-gray-50">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-gray-600">Cost Value</p>
                              <p className="font-semibold text-gray-900">{formatCurrency(value)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Potential</p>
                              <p className="font-semibold text-green-600">{formatCurrency(potentialRevenue)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Status</p>
                              <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(status)}`}>
                                {getStatusIcon(status)}
                                {status.replace('_', ' ').toUpperCase()}
                              </div>
                            </div>
                            <div>
                              <p className="text-gray-600">Health</p>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    available <= minStock ? 'bg-red-500' :
                                    available <= reorderPoint ? 'bg-orange-500' :
                                    available >= maxStock ? 'bg-blue-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min((available / maxStock) * 100, 100)}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500">{available} / {maxStock}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ];
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Transfer Stock Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 rounded-t-xl flex justify-between items-center z-10">
              <div>
                <h2 className="text-2xl font-bold">Transfer Stock</h2>
                <p className="text-sm text-purple-100 mt-1">Move inventory between locations</p>
              </div>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferError(null);
                }}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
              {transferError && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">{transferError}</p>
                    </div>
                  </div>
                </div>
              )}

              <form id="transfer-form" onSubmit={async (e) => {
                e.preventDefault();
                setTransferring(true);
                setTransferError(null);

                try {
                  // Validate all products
                  for (const product of selectedProducts) {
                    if (product.product_type === 'packaged' && !product.variant_id) {
                      setTransferError(`Please select a variant for ${product.name}`);
                      setTransferring(false);
                      return;
                    }
                    if (!product.from_location_id || !product.to_location_id) {
                      setTransferError('Please select from and to locations for all products');
                      setTransferring(false);
                      return;
                    }
                    
                    const qty = product.product_type === 'packaged' 
                      ? (product.quantity || product.units || 0)
                      : (product.quantity || 0);
                    
                    if (qty <= 0) {
                      setTransferError(`Please enter a valid quantity for ${product.name}`);
                      setTransferring(false);
                      return;
                    }
                  }

                  // Submit all transfers
                  const transferPromises = selectedProducts.map(product => {
                    const quantity = product.product_type === 'packaged' 
                      ? (product.quantity || product.units || 0)
                      : (product.quantity || 0);
                    
                    return api.post('/operations/inventory/transfer', {
                      product_id: product.product_id,
                      variant_id: product.product_type === 'packaged' ? product.variant_id : null,
                      from_location_id: product.from_location_id,
                      to_location_id: product.to_location_id,
                      quantity: quantity,
                      reference_number: transferForm.reference_number || undefined,
                      notes: transferForm.notes || undefined
                    });
                  });

                  const results = await Promise.all(transferPromises);
                  const errors = results.filter(r => r.error);
                  
                  if (errors.length > 0) {
                    setTransferError(errors[0].error || 'Failed to transfer some items');
                  } else {
                    // Success - close modal and reload data
                    setShowTransferModal(false);
                    setTransferError(null);
                    setTransferForm({
                      reference_number: '',
                      notes: ''
                    });
                    setSelectedProducts([]);
                    setProductSearchTerm('');
                    setProductVariants(new Map());
                    loadData(); // Reload stock data
                  }
                } catch (err: any) {
                  setTransferError(err?.message || 'Failed to transfer stock');
                } finally {
                  setTransferring(false);
                }
              }}>
                {/* Product Selection */}
                <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <Package className="w-4 h-4 text-purple-600" />
                    Select Products <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search products by name or SKU..."
                          value={productSearchTerm}
                          onChange={(e) => {
                            setProductSearchTerm(e.target.value);
                            setShowProductDropdown(true);
                          }}
                          onFocus={() => setShowProductDropdown(true)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                        />
                      </div>
                      {showProductDropdown && filteredProducts.length > 0 && (
                        <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                          {filteredProducts.slice(0, 10).map((product) => (
                              <button
                                key={product.product_id}
                                type="button"
                                onClick={async () => {
                                  const alreadyAdded = selectedProducts.some(p => p.product_id === product.product_id);
                                  if (!alreadyAdded) {
                                    let fullProduct = product;
                                    if (product.product_type === 'packaged') {
                                      try {
                                        const productResponse = await api.get(`/catalog/products/${product.product_id}`);
                                        if (productResponse.data) {
                                          fullProduct = productResponse.data;
                                          if (fullProduct.variants && Array.isArray(fullProduct.variants)) {
                                            setProductVariants(prev => {
                                              const newMap = new Map(prev);
                                              newMap.set(product.product_id, fullProduct.variants);
                                              return newMap;
                                            });
                                          }
                                        }
                                      } catch (err) {
                                        console.warn('Could not fetch full product details:', err);
                                      }
                                    }
                                    setSelectedProducts([...selectedProducts, {
                                      ...fullProduct,
                                      variant_id: fullProduct.product_type === 'packaged' ? '' : undefined,
                                      from_location_id: null,
                                      to_location_id: null,
                                      quantity: 0,
                                      packages: fullProduct.product_type === 'packaged' ? 0 : undefined,
                                      units: fullProduct.product_type === 'packaged' ? 0 : undefined,
                                      orderBy: fullProduct.product_type === 'packaged' ? 'packages' : undefined
                                    }]);
                                  }
                                  setProductSearchTerm('');
                                  setShowProductDropdown(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b border-gray-100 last:border-b-0 transition-colors"
                              >
                                <div className="font-medium text-gray-900">{product.name}</div>
                                <div className="text-sm text-gray-500 mt-0.5">SKU: {product.sku}</div>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (productSearchTerm.trim()) {
                          const product = filteredProducts.find(p =>
                            p.name?.toLowerCase() === productSearchTerm.toLowerCase() ||
                            p.sku?.toLowerCase() === productSearchTerm.toLowerCase()
                          );
                          if (product) {
                            const alreadyAdded = selectedProducts.some(p => p.product_id === product.product_id);
                            if (!alreadyAdded) {
                              let fullProduct = product;
                              if (product.product_type === 'packaged') {
                                try {
                                  const productResponse = await api.get(`/catalog/products/${product.product_id}`);
                                  if (productResponse.data) {
                                    fullProduct = productResponse.data;
                                    if (fullProduct.variants && Array.isArray(fullProduct.variants)) {
                                      setProductVariants(prev => {
                                        const newMap = new Map(prev);
                                        newMap.set(product.product_id, fullProduct.variants);
                                        return newMap;
                                      });
                                    }
                                  }
                                } catch (err) {
                                  console.warn('Could not fetch full product details:', err);
                                }
                              }
                              setSelectedProducts([...selectedProducts, {
                                ...fullProduct,
                                variant_id: fullProduct.product_type === 'packaged' ? '' : undefined,
                                from_location_id: null,
                                to_location_id: null,
                                quantity: 0,
                                packages: fullProduct.product_type === 'packaged' ? 0 : undefined,
                                units: fullProduct.product_type === 'packaged' ? 0 : undefined,
                                orderBy: fullProduct.product_type === 'packaged' ? 'packages' : undefined
                              }]);
                              setProductSearchTerm('');
                              setShowProductDropdown(false);
                            }
                          }
                        }
                      }}
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="hidden sm:inline">Add Item</span>
                      <span className="sm:hidden">Add</span>
                    </button>
                  </div>
                </div>

                {/* Products Table */}
                {selectedProducts.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-800">Selected Products ({selectedProducts.length})</h3>
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Product</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">SKU</th>
                              {selectedProducts.some(p => p.product_type === 'packaged') && (
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Variant</th>
                              )}
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[200px]">
                                Quantity
                                <span className="block text-xs font-normal text-gray-500 mt-1 normal-case">
                                  (varies by type)
                                </span>
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">From</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">To</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-16">Action</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                        {selectedProducts.map((product, index) => {
                          const variants = productVariants.get(product.product_id) || product.variants || [];
                          const productVariantId = product.variant_id ? Number(product.variant_id) : null;
                          const selectedVariant = variants.find((v: any) => Number(v.variant_id) === productVariantId);
                          const isPackaged = product.product_type === 'packaged';
                          const isBulk = product.product_type === 'bulk';
                          const unitsPerPackage = selectedVariant?.units_per_package || 1;

                          const calculateQuantity = () => {
                            if (isPackaged && selectedVariant) {
                              if (product.orderBy === 'packages') {
                                return (product.packages || 0) * unitsPerPackage;
                              } else {
                                return product.units || 0;
                              }
                            }
                            return product.quantity || 0;
                          };

                          const currentQuantity = calculateQuantity();

                          return (
                            <tr key={`${product.product_id}-${index}`} className="hover:bg-purple-50/50 transition-colors">
                              <td className="px-4 py-4">
                                <div className="font-medium text-gray-900">{product.name}</div>
                                <div className="text-xs text-gray-500 mt-1 md:hidden">SKU: {product.sku}</div>
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-600 hidden md:table-cell">{product.sku}</td>
                              
                              {isPackaged && (
                                <td className="px-4 py-4">
                                  <select
                                    value={product.variant_id ? String(product.variant_id) : ''}
                                    onChange={(e) => {
                                      const updated = [...selectedProducts];
                                      const variantId = e.target.value ? Number(e.target.value) : null;
                                      const variant = variants.find((v: any) => Number(v.variant_id) === variantId);
                                      updated[index].variant_id = variantId;
                                      updated[index].packages = 0;
                                      updated[index].units = 0;
                                      updated[index].quantity = 0;
                                      updated[index].orderBy = 'packages';
                                      setSelectedProducts(updated);
                                    }}
                                    className="w-full min-w-[160px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                    required={isPackaged}
                                  >
                                    <option value="">Select Variant</option>
                                    {variants.map((v: any) => (
                                      <option key={v.variant_id} value={v.variant_id}>
                                        {v.variant_name || v.name} - {v.size} {v.size_unit}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              )}

                              <td className="px-4 py-4">
                                {isPackaged && !selectedVariant ? (
                                  <div className="text-xs text-amber-700 italic px-3 py-2 bg-amber-50 border-l-4 border-amber-400 rounded">
                                    Please select a variant first
                                  </div>
                                ) : isPackaged && selectedVariant ? (
                                  <div className="space-y-3">
                                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-3">
                                      <label className="block text-xs font-semibold text-blue-900 mb-2">
                                        Number of {selectedVariant.package_unit || 'boxes'} *
                                      </label>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = [...selectedProducts];
                                            updated[index].packages = Math.max(0, (updated[index].packages || 0) - 1);
                                            updated[index].units = updated[index].packages * unitsPerPackage;
                                            updated[index].quantity = updated[index].units;
                                            setSelectedProducts(updated);
                                          }}
                                          className="p-2 bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                                        >
                                          <Minus className="w-4 h-4 text-blue-600" />
                                        </button>
                                        <input
                                          type="number"
                                          min="0"
                                          value={product.packages || 0}
                                          onChange={(e) => {
                                            const updated = [...selectedProducts];
                                            const packages = parseInt(e.target.value) || 0;
                                            updated[index].packages = packages;
                                            updated[index].units = packages * unitsPerPackage;
                                            updated[index].quantity = updated[index].units;
                                            setSelectedProducts(updated);
                                          }}
                                          className="w-28 px-3 py-2.5 border-2 border-blue-400 rounded-lg text-lg font-bold text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                                          placeholder="0"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = [...selectedProducts];
                                            updated[index].packages = (updated[index].packages || 0) + 1;
                                            updated[index].units = updated[index].packages * unitsPerPackage;
                                            updated[index].quantity = updated[index].units;
                                            setSelectedProducts(updated);
                                          }}
                                          className="p-2 bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                                        >
                                          <Plus className="w-4 h-4 text-blue-600" />
                                        </button>
                                      </div>
                                      <div className="mt-3 p-2.5 bg-white border border-blue-300 rounded-lg">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-xs text-gray-600 flex items-center">
                                            <Calculator className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                                            Total:
                                          </span>
                                          <span className="text-sm font-bold text-blue-700">
                                            {currentQuantity} {selectedVariant.base_unit || 'units'}
                                          </span>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {product.packages || 0} {selectedVariant.package_unit || 'boxes'} × {unitsPerPackage} = {currentQuantity} {selectedVariant.base_unit || 'units'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...selectedProducts];
                                        updated[index].quantity = Math.max(0, (updated[index].quantity || 0) - (isBulk ? 0.1 : 1));
                                        setSelectedProducts(updated);
                                      }}
                                      className="p-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                      <Minus className="w-4 h-4 text-gray-600" />
                                    </button>
                                    <div className="flex flex-col">
                                      <input
                                        type="number"
                                        min="0"
                                        step={isBulk ? "0.01" : "1"}
                                        value={product.quantity || 0}
                                        onChange={(e) => {
                                          const updated = [...selectedProducts];
                                          updated[index].quantity = parseFloat(e.target.value) || 0;
                                          setSelectedProducts(updated);
                                        }}
                                        className="w-28 px-3 py-2 border-2 border-gray-300 rounded-lg text-base font-semibold text-center focus:border-purple-500 focus:ring-2 focus:ring-purple-200 bg-white"
                                        placeholder="0"
                                      />
                                      <span className="text-xs text-gray-500 mt-1 text-center">
                                        {isBulk ? (product.bulk_unit || 'units') : 'units'}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...selectedProducts];
                                        updated[index].quantity = (updated[index].quantity || 0) + (isBulk ? 0.1 : 1);
                                        setSelectedProducts(updated);
                                      }}
                                      className="p-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                      <Plus className="w-4 h-4 text-gray-600" />
                                    </button>
                                  </div>
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <select
                                  value={product.from_location_id || ''}
                                  onChange={(e) => {
                                    const updated = [...selectedProducts];
                                    updated[index].from_location_id = Number(e.target.value);
                                    setSelectedProducts(updated);
                                  }}
                                  className="w-full min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white"
                                  required
                                >
                                  <option value="">Select From</option>
                                  {locations.map((loc: any) => (
                                    <option key={loc.location_id} value={loc.location_id}>
                                      {loc.name || loc.location_name}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              <td className="px-4 py-4">
                                <select
                                  value={product.to_location_id || ''}
                                  onChange={(e) => {
                                    const updated = [...selectedProducts];
                                    updated[index].to_location_id = Number(e.target.value);
                                    setSelectedProducts(updated);
                                  }}
                                  className="w-full min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white"
                                  required
                                >
                                  <option value="">Select To</option>
                                  {locations
                                    .filter((loc: any) => loc.location_id !== product.from_location_id)
                                    .map((loc: any) => (
                                      <option key={loc.location_id} value={loc.location_id}>
                                        {loc.name || loc.location_name}
                                      </option>
                                    ))}
                                </select>
                              </td>

                              <td className="px-4 py-4">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
                                  }}
                                  className="mx-auto p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  aria-label="Remove product"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reference Number and Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      Reference Number
                    </label>
                    <input
                      type="text"
                      value={transferForm.reference_number}
                      onChange={(e) => setTransferForm({ ...transferForm, reference_number: e.target.value })}
                      placeholder="Optional reference number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      Notes
                    </label>
                    <input
                      type="text"
                      value={transferForm.notes}
                      onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                      placeholder="Optional notes"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 sm:px-6 py-4 rounded-b-xl flex flex-col sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferError(null);
                }}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition-colors text-gray-700"
                disabled={transferring}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="transfer-form"
                onClick={(e) => {
                  e.preventDefault();
                  const form = document.querySelector('form');
                  if (form) {
                    form.requestSubmit();
                  }
                }}
                disabled={transferring || selectedProducts.length === 0}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {transferring ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Transferring...</span>
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-5 h-5" />
                    <span>Transfer Stock</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {showDetailsModal && selectedProductDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-t-lg flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6" />
                <h2 className="text-xl font-bold">Product Details</h2>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedProductDetails(null);
                }}
                className="text-white hover:bg-purple-800 rounded-full p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Product Information */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Product Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Product Name</p>
                    <p className="font-semibold text-gray-900">{selectedProductDetails.product.product_name || 'Unknown Product'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">SKU</p>
                    <p className="font-mono text-gray-900">{selectedProductDetails.variantSku || selectedProductDetails.product.sku || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <p className="text-gray-900">{selectedProductDetails.product.category_name || 'Uncategorized'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{selectedProductDetails.locationName || 'Unknown'}</p>
                    </div>
                  </div>
                  {selectedProductDetails.variantName && (
                    <div>
                      <p className="text-sm text-gray-600">Variant</p>
                      <p className="text-gray-900">{selectedProductDetails.variantName}</p>
                    </div>
                  )}
                  {selectedProductDetails.size && (
                    <div>
                      <p className="text-sm text-gray-600">Size</p>
                      <p className="text-gray-900">{selectedProductDetails.size} {selectedProductDetails.locationData?.size_unit || ''}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quantity & Units */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Quantity & Units</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Available - comes first */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Available</p>
                    {selectedProductDetails.productType === 'packaged' ? (
                      (() => {
                        const packages = selectedProductDetails.packages || 0;
                        const looseUnits = selectedProductDetails.looseUnits || 0;
                        const unitsPerPackage = selectedProductDetails.unitsPerPackage || 1;
                        const totalBottles = (packages * unitsPerPackage) + looseUnits;
                        
                        if (packages === 0 && looseUnits === 0 && selectedProductDetails.available === 0) {
                          return (
                            <p className="text-2xl font-bold text-gray-400">0 {selectedProductDetails.baseUnit}s</p>
                          );
                        }
                        
                        // If we have available quantity but no packages calculated, calculate from available
                        const effectivePackages = packages > 0 ? packages : (selectedProductDetails.available > 0 ? Math.floor(selectedProductDetails.available / unitsPerPackage) : 0);
                        const effectiveLooseUnits = looseUnits > 0 ? looseUnits : (selectedProductDetails.available > 0 ? selectedProductDetails.available % unitsPerPackage : 0);
                        const effectiveTotalBottles = (effectivePackages * unitsPerPackage) + effectiveLooseUnits;
                        
                        return (
                          <div>
                            {effectivePackages > 0 && (
                              <p className="text-2xl font-bold text-green-600">
                                {effectivePackages} {selectedProductDetails.packageUnit}s
                              </p>
                            )}
                            {effectiveLooseUnits > 0 && (
                              <p className="text-lg font-semibold text-green-600 mt-1">
                                + {effectiveLooseUnits} {selectedProductDetails.baseUnit}s
                              </p>
                            )}
                            {effectiveTotalBottles > 0 && (
                              <p className="text-sm text-gray-600 mt-1">
                                ({effectiveTotalBottles} {selectedProductDetails.baseUnit}s total)
                              </p>
                            )}
                            {selectedProductDetails.size && (
                              <p className="text-xs text-gray-500 mt-1">
                                {selectedProductDetails.size}{selectedProductDetails.sizeUnit} per {selectedProductDetails.baseUnit}
                              </p>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-2xl font-bold text-green-600">
                        {Number(selectedProductDetails.available || 0).toLocaleString()} {selectedProductDetails.baseUnit}s
                      </p>
                    )}
                  </div>
                  
                  {/* Total Quantity - calculated from available */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total Quantity</p>
                    {selectedProductDetails.productType === 'packaged' ? (
                      (() => {
                        // Calculate total quantity from available packages and bottles
                        const size = Number(selectedProductDetails.size) || 0;
                        const sizeUnit = selectedProductDetails.sizeUnit || '';
                        const unitsPerPackage = selectedProductDetails.unitsPerPackage || 1;
                        
                        // Use effective packages/loose units (calculated from available if needed)
                        const packages = selectedProductDetails.packages || 0;
                        const looseUnits = selectedProductDetails.looseUnits || 0;
                        const effectivePackages = packages > 0 ? packages : (selectedProductDetails.available > 0 ? Math.floor(selectedProductDetails.available / unitsPerPackage) : 0);
                        const effectiveLooseUnits = looseUnits > 0 ? looseUnits : (selectedProductDetails.available > 0 ? selectedProductDetails.available % unitsPerPackage : 0);
                        const effectiveTotalBottles = (effectivePackages * unitsPerPackage) + effectiveLooseUnits;
                        
                        // If no size or size is 0, show total in base units
                        if (!size || size === 0) {
                          return (
                            <div>
                              <p className="text-2xl font-bold text-blue-600">
                                {Number(effectiveTotalBottles || selectedProductDetails.available || 0).toLocaleString()} {selectedProductDetails.baseUnit}s
                              </p>
                              {effectivePackages > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {effectivePackages} {selectedProductDetails.packageUnit}s × {unitsPerPackage}
                                  {effectiveLooseUnits > 0 ? ` + ${effectiveLooseUnits}` : ''}
                                </p>
                              )}
                              {!size && (
                                <p className="text-xs text-amber-600 mt-1">
                                  Size information not available
                                </p>
                              )}
                            </div>
                          );
                        }
                        
                        // Total from packages: packages × units_per_package × size
                        const totalFromPackages = effectivePackages * unitsPerPackage * size;
                        // Total from loose units: looseUnits × size
                        const totalFromLoose = effectiveLooseUnits * size;
                        const totalQuantity = totalFromPackages + totalFromLoose;
                        
                        if (totalQuantity === 0) {
                          return (
                            <p className="text-2xl font-bold text-gray-400">0 {sizeUnit}</p>
                          );
                        }
                        
                        return (
                          <div>
                            <p className="text-2xl font-bold text-blue-600">
                              {totalQuantity.toLocaleString()} {sizeUnit}
                            </p>
                            {effectivePackages > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                {effectivePackages} {selectedProductDetails.packageUnit}s × {unitsPerPackage} × {size}{sizeUnit}
                                {effectiveLooseUnits > 0 ? ` + ${effectiveLooseUnits} × ${size}${sizeUnit}` : ''}
                              </p>
                            )}
                            {effectivePackages === 0 && effectiveLooseUnits > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                {effectiveLooseUnits} × {size}{sizeUnit}
                              </p>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-2xl font-bold text-blue-600">
                        {Number(selectedProductDetails.quantity || 0).toLocaleString()} {selectedProductDetails.baseUnit}s
                      </p>
                    )}
                  </div>
                  {selectedProductDetails.reserved > 0 && (
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Reserved</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {Number(selectedProductDetails.reserved).toLocaleString()} {selectedProductDetails.baseUnit}s
                      </p>
                    </div>
                  )}
                  {selectedProductDetails.productType === 'packaged' && (
                    <>
                      {(() => {
                        const effectivePackages = selectedProductDetails.packages || 0;
                        const effectiveLooseUnits = selectedProductDetails.looseUnits || 0;
                        const unitsPerPackage = selectedProductDetails.unitsPerPackage || 1;
                        
                        // Calculate from available if packages not set
                        const calcPackages = effectivePackages > 0 ? effectivePackages : (selectedProductDetails.available > 0 ? Math.floor(selectedProductDetails.available / unitsPerPackage) : 0);
                        const calcLooseUnits = effectiveLooseUnits > 0 ? effectiveLooseUnits : (selectedProductDetails.available > 0 ? selectedProductDetails.available % unitsPerPackage : 0);
                        
                        if (calcPackages === 0 && calcLooseUnits === 0) return null;
                        
                        return (
                          <>
                            {calcPackages > 0 && (
                              <div className="bg-purple-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-600 mb-1">Packages</p>
                                <p className="text-2xl font-bold text-purple-600">
                                  {calcPackages} {selectedProductDetails.packageUnit}s
                                </p>
                              </div>
                            )}
                            {calcLooseUnits > 0 && (
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-600 mb-1">Loose Units</p>
                                <p className="text-2xl font-bold text-gray-600">
                                  {calcLooseUnits} {selectedProductDetails.baseUnit}s
                                </p>
                              </div>
                            )}
                            <div className="bg-indigo-50 p-4 rounded-lg">
                              <p className="text-sm text-gray-600 mb-1">Units per Package</p>
                              <p className="text-xl font-semibold text-indigo-600">
                                {unitsPerPackage} {selectedProductDetails.baseUnit}s
                              </p>
                            </div>
                            {selectedProductDetails.size && (
                              <div className="bg-teal-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-600 mb-1">Size per Unit</p>
                                <p className="text-xl font-semibold text-teal-600">
                                  {selectedProductDetails.size}{selectedProductDetails.sizeUnit}
                                </p>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>

              {/* Valuation */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Valuation</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Cost Value</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(selectedProductDetails.value)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Average Cost</p>
                    <p className="text-lg font-semibold text-gray-700">
                      {formatCurrency(selectedProductDetails.avgCost)}/{selectedProductDetails.baseUnit}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Potential Revenue</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(selectedProductDetails.potentialRevenue)}</p>
                  </div>
                </div>
              </div>

              {/* Stock Health */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Stock Health</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Stock Level</span>
                      <span>{selectedProductDetails.available} / {selectedProductDetails.maxStock}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          selectedProductDetails.available <= selectedProductDetails.minStock ? 'bg-red-500' :
                          selectedProductDetails.available <= selectedProductDetails.reorderPoint ? 'bg-orange-500' :
                          selectedProductDetails.available >= selectedProductDetails.maxStock ? 'bg-blue-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((selectedProductDetails.available / selectedProductDetails.maxStock) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border mt-1 ${getStatusColor(selectedProductDetails.status)}`}>
                        {getStatusIcon(selectedProductDetails.status)}
                        {selectedProductDetails.status.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Minimum Stock</p>
                      <p className="font-semibold text-gray-900">{selectedProductDetails.minStock}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Reorder Point</p>
                      <p className="font-semibold text-gray-900">{selectedProductDetails.reorderPoint}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 p-4 rounded-b-lg flex justify-end gap-3 sticky bottom-0">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedProductDetails(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockByLocation;
