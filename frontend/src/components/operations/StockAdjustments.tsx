"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import { 

  ClipboardCheck, Plus, Search, Filter, Calendar,

  CheckCircle, XCircle, AlertTriangle, Eye, FileText,

  Trash2, Package, TrendingDown, Camera, Upload,
  Box, Minus, Calculator

} from 'lucide-react';

import { api } from "@/lib/api";

const StockAdjustments = () => {
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState('pending'); // pending, create, history
  const [preSelectedSkus, setPreSelectedSkus] = useState<string[]>([]);
  const [selectedAdjustmentType, setSelectedAdjustmentType] = useState<string | null>(null);

  const [selectedAdjustment, setSelectedAdjustment] = useState<any>(null);

  const [showDetails, setShowDetails] = useState(false);

  // Form state for create adjustment
  const [formData, setFormData] = useState({
    reason: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Product search and selection
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Track selected variants for packaged products
  const [productVariants, setProductVariants] = useState<Map<number, any[]>>(new Map());

  // Stock adjustments state
  const [pendingAdjustments, setPendingAdjustments] = useState<any[]>([]);
  const [historyAdjustments, setHistoryAdjustments] = useState<any[]>([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState(false);
  const [adjustmentsError, setAdjustmentsError] = useState<string | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Load products, locations, and units on mount
  useEffect(() => {
    const loadProducts = async () => {
      setLoadingProducts(true);
      try {
        const response = await api.get<any[]>("/catalog/products");
        if (response.data) {
          setProducts(response.data);
          setFilteredProducts(response.data);
        }
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };

    const loadLocations = async () => {
      try {
        const response = await api.get<any[]>("/inventory/locations");
        if (response.data) {
          setLocations(response.data);
        }
      } catch (error) {
        console.error('Error loading locations:', error);
      }
    };

    const loadUnits = async () => {
      try {
        const response = await api.get<any[]>("/units");
        if (response.data) {
          setUnits(response.data);
        }
      } catch (error) {
        console.error('Error loading units:', error);
      }
    };

    loadProducts();
    loadLocations();
    loadUnits();
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

  // Auto-add pre-selected products when products are loaded
  useEffect(() => {
    if (preSelectedSkus.length > 0 && products.length > 0 && selectedProducts.length === 0) {
      const preselectedProducts = products.filter(p => preSelectedSkus.includes(p.sku));
      if (preselectedProducts.length > 0) {
        setSelectedProducts(preselectedProducts.map(p => ({
          ...p,
          quantity: 0,
          location_id: '',
          unit_cost: p.cost_price || 0,
          variant_id: p.product_type === 'packaged' ? '' : undefined,
          orderBy: p.product_type === 'packaged' ? 'packages' : undefined,
          packages: p.product_type === 'packaged' ? 0 : undefined,
          units: p.product_type === 'packaged' ? 0 : undefined,
        })));
      }
    }
  }, [preSelectedSkus, products, selectedProducts.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.product-search-container')) {
        setShowProductDropdown(false);
      }
    };

    if (showProductDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showProductDropdown]);

  // Load stock adjustments from API
  const loadAdjustments = async (status?: string) => {
    setLoadingAdjustments(true);
    setAdjustmentsError(null);
    try {
      const params: any = {};
      // Map frontend status to backend status
      if (status === 'pending' || !status) {
        params.status = 'pending'; // Show only pending (not approved/rejected)
      } else if (status === 'approved' || status === 'rejected') {
        params.status = 'approved'; // Show approved/rejected for history
      }
      const response = await api.get<any[]>("/operations/stock-adjustments", params);
      if (response.data) {
        // Map backend response to frontend format
        const mappedAdjustments = response.data.map((adj: any) => {
          // Calculate total value from items - use total_value_impact from backend if available, otherwise calculate
          const totalValue = adj.items.reduce((sum: number, item: any) => {
            // First try to use total_value_impact from the adjustment record
            if (item.total_value !== null && item.total_value !== undefined) {
              return sum + (parseFloat(item.total_value) || 0);
            }
            // Otherwise calculate from unit_cost and quantity
            if (item.unit_cost !== null && item.unit_cost !== undefined) {
              return sum + (parseFloat(item.unit_cost) * (item.quantity || 0));
            }
            // Fallback: try to get unit cost from product
            const product = products.find((p: any) => p.product_id === item.product_id);
            const unitCost = product?.cost_price || product?.selling_price || 0;
            return sum + ((item.quantity || 0) * unitCost);
          }, 0);

          // Calculate age in days
          const createdDate = new Date(adj.created_at);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - createdDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const age = diffDays === 0 ? 'Today' : `${diffDays} day${diffDays > 1 ? 's' : ''}`;

          return {
            id: adj.id || adj.reference_number || `ADJ-${adj.adjustment_id}`,
            type: adj.type || adj.adjustment_type || 'other',
            reason: adj.reason || adj.reason_code || 'No reason provided',
            submittedBy: adj.created_by_name || adj.created_by || '',
            submittedDate: adj.created_at,
            age: age,
            items: adj.items.map((item: any) => {
              const product = products.find((p: any) => p.product_id === item.product_id);
              const unitName = product?.unit_name || 'unit';
              // Find location_id from location name
              const location = locations.find((loc: any) => loc.name === item.location);
              return {
                sku: item.sku || 'N/A',
                name: item.product_name || 'Unknown',
                qty: item.quantity || 0,
                unit: unitName,
                value: 0, // Will be calculated
                location: item.location || 'Unknown',
                location_id: location?.location_id || null
              };
            }),
            totalValue: `RWF ${totalValue.toLocaleString()}`,
            notes: adj.remarks || '',
            attachments: [], // Backend doesn't return attachments yet
            status: 'pending', // Backend doesn't have status field yet
            approved_by: adj.approved_by || 0,
            approved_at: adj.approved_at || null,
            approval_status: adj.approval_status || null, // 'approved', 'rejected', or null
            approved_by_name: adj.approved_by_name || null,
            rejection_reason: adj.rejection_reason || null
          };
        });

        // Apply location and type filters
        let filtered = mappedAdjustments;
        
        if (locationFilter) {
          filtered = filtered.filter(adj => 
            adj.items.some((item: any) => {
              // Check if any item in the adjustment matches the location filter
              return item.location_id?.toString() === locationFilter;
            })
          );
        }
        
        if (typeFilter) {
          filtered = filtered.filter(adj => {
            const reason = (adj.reason || '').toLowerCase();
            return reason.includes(typeFilter.toLowerCase());
          });
        }
        
        // Filter by approval status - use approval_status field from backend
        const pending = filtered.filter(adj => 
          !adj.approval_status || adj.approval_status === null || adj.approved_by === 0
        );
        const history = filtered.filter(adj => 
          adj.approval_status && (adj.approval_status === 'approved' || adj.approval_status === 'rejected')
        );

        if (status === 'approved' || status === 'rejected') {
          setHistoryAdjustments(history);
        } else {
          setPendingAdjustments(pending);
        }
      }
    } catch (error) {
      console.error('Error loading adjustments:', error);
      setAdjustmentsError(error instanceof Error ? error.message : 'Failed to load adjustments');
      setPendingAdjustments([]);
      setHistoryAdjustments([]);
    } finally {
      setLoadingAdjustments(false);
    }
  };

  // Load adjustments when tab changes, component mounts, or filters change
  useEffect(() => {
    if (activeTab === 'pending') {
      loadAdjustments('pending');
    } else if (activeTab === 'history') {
      loadAdjustments('approved'); // Load approved/rejected for history
    }
    // Note: Filters are applied in loadAdjustments function, so we reload when filters change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, locationFilter, typeFilter]);

  // Check URL parameters and sessionStorage on mount
  useEffect(() => {
    // Check if create=true is in URL
    const createParam = searchParams?.get('create');
    if (createParam === 'true') {
      setActiveTab('create');
      
      // Get pre-selected SKUs and adjustment data from sessionStorage
      if (typeof window !== 'undefined') {
        const storedSkus = sessionStorage.getItem('adjust-stock-skus');
        if (storedSkus) {
          try {
            const skus = JSON.parse(storedSkus);
            setPreSelectedSkus(Array.isArray(skus) ? skus : []);
            // Clear sessionStorage after reading
            sessionStorage.removeItem('adjust-stock-skus');
            // Set initial search term if SKU is provided
            if (Array.isArray(skus) && skus.length > 0) {
              setProductSearchTerm(skus[0]);
            }
          } catch (e) {
            console.error('Error parsing adjust-stock-skus from sessionStorage:', e);
          }
        }
        
        // Get adjustment data (location, product details, etc.) from StockByLocation
        const adjustData = sessionStorage.getItem('adjust-stock-data');
        if (adjustData) {
          try {
            const data = JSON.parse(adjustData);
            // Store adjustment data for later use (e.g., pre-selecting location)
            // This data includes: product_id, location_id, location_name, current_quantity, etc.
            // You can use this to pre-populate the adjustment form
            console.log('Adjustment data from StockByLocation:', data);
            // Clear after reading
            sessionStorage.removeItem('adjust-stock-data');
          } catch (e) {
            console.error('Error parsing adjust-stock-data from sessionStorage:', e);
          }
        }
      }
    }
  }, [searchParams]);

  const adjustmentTypes = [

    { value: 'write-off', label: 'Write-off', icon: Trash2, color: 'red' },

    { value: 'damage', label: 'Damage', icon: AlertTriangle, color: 'orange' },

    { value: 'shrinkage', label: 'Shrinkage', icon: TrendingDown, color: 'yellow' },

    { value: 'quality', label: 'Quality Issue', icon: XCircle, color: 'red' },

    { value: 'goods-variance', label: 'Goods Receipt Variance', icon: Package, color: 'blue' },

    { value: 'found', label: 'Found Inventory', icon: CheckCircle, color: 'green' },

    { value: 'other', label: 'Other Adjustment', icon: FileText, color: 'gray' }

  ];

  const handleApprove = async (adjustmentId: string) => {
    try {
      // URL encode the reference number to handle special characters
      const encodedId = encodeURIComponent(adjustmentId);
      const response = await api.post(`/operations/stock-adjustments/${encodedId}/approve`);
      if (response.error) {
        alert(`Failed to approve adjustment: ${response.error}`);
      } else {
        alert(`Adjustment ${adjustmentId} approved successfully!`);
        // Reload adjustments to refresh the list
        await loadAdjustments('pending');
      }
    } catch (error) {
      console.error('Error approving adjustment:', error);
      alert(`Failed to approve adjustment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleReject = async (adjustmentId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      try {
        // URL encode the reference number to handle special characters
        const encodedId = encodeURIComponent(adjustmentId);
        const response = await api.post(`/operations/stock-adjustments/${encodedId}/reject`, { reason });
        if (response.error) {
          alert(`Failed to reject adjustment: ${response.error}`);
        } else {
          alert(`Adjustment ${adjustmentId} rejected successfully!`);
          // Reload adjustments to refresh the list
          await loadAdjustments('pending');
        }
      } catch (error) {
        console.error('Error rejecting adjustment:', error);
        alert(`Failed to reject adjustment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {

    if (e.target.checked) {

      setSelectedItems(pendingAdjustments.map(adj => adj.id));

    } else {

      setSelectedItems([]);

    }

  };

  const handleSelectItem = (id: string) => {

    if (selectedItems.includes(id)) {

      setSelectedItems(selectedItems.filter(i => i !== id));

    } else {

      setSelectedItems([...selectedItems, id]);

    }

  };

  const handleBatchApprove = async () => {
    if (selectedItems.length > 0) {
      try {
        const promises = selectedItems.map(id => 
          api.post(`/operations/stock-adjustments/${encodeURIComponent(id)}/approve`)
        );
        await Promise.all(promises);
        alert(`Successfully approved ${selectedItems.length} adjustment(s)!`);
        setSelectedItems([]);
        // Reload adjustments to refresh the list
        await loadAdjustments('pending');
      } catch (error) {
        console.error('Error batch approving adjustments:', error);
        alert(`Failed to approve some adjustments: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleBatchReject = async () => {
    if (selectedItems.length > 0) {
      const reason = prompt('Enter rejection reason for all selected:');
      if (reason) {
        try {
          const promises = selectedItems.map(id => 
            api.post(`/operations/stock-adjustments/${encodeURIComponent(id)}/reject`, { reason })
          );
          await Promise.all(promises);
          alert(`Successfully rejected ${selectedItems.length} adjustment(s)!`);
          setSelectedItems([]);
          // Reload adjustments to refresh the list
          await loadAdjustments('pending');
        } catch (error) {
          console.error('Error batch rejecting adjustments:', error);
          alert(`Failed to reject some adjustments: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  };

  // Calculate summary statistics from actual data
  const summaryStats = useMemo(() => {
    // Calculate total value from pending adjustments
    const totalValue = pendingAdjustments.reduce((sum, adj) => {
      // Extract numeric value from "RWF X,XXX" format
      const valueStr = adj.totalValue?.replace(/[RWF,\s]/g, '') || '0';
      return sum + parseFloat(valueStr) || 0;
    }, 0);

    // Calculate oldest pending adjustment age
    let oldestAge = 'N/A';
    if (pendingAdjustments.length > 0) {
      const dates = pendingAdjustments
        .map(adj => new Date(adj.submittedDate))
        .filter(date => !isNaN(date.getTime()));
      
      if (dates.length > 0) {
        const oldestDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - oldestDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        oldestAge = diffDays === 0 ? 'Today' : `${diffDays} day${diffDays > 1 ? 's' : ''}`;
      }
    }

    // Calculate this month's adjustments (from both pending and history)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const allAdjustments = [...pendingAdjustments, ...historyAdjustments];
    const thisMonthCount = allAdjustments.filter(adj => {
      const adjDate = new Date(adj.submittedDate);
      return adjDate >= startOfMonth;
    }).length;

    return {
      totalValue,
      oldestAge,
      thisMonthCount
    };
  }, [pendingAdjustments, historyAdjustments]);

  return (

    <div className="h-screen flex flex-col bg-gray-50">

      {/* Header */}

      <div className="bg-white border-b border-gray-200 px-6 py-4">

        <div className="flex items-center justify-between">

          <div>

            <h1 className="text-2xl font-bold text-gray-900">Stock Adjustments</h1>

            <p className="text-sm text-gray-500">Review and approve inventory adjustments</p>

          </div>

          <button

            onClick={() => setActiveTab('create')}

            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"

          >

            <Plus className="w-4 h-4" />

            New Adjustment

          </button>

        </div>

        {/* Tabs */}

        <div className="flex gap-4 mt-4 border-b border-gray-200">

          {[

            { id: 'pending', label: 'Pending Approval', count: pendingAdjustments.length },

            { id: 'create', label: 'Create New', count: null },

            { id: 'history', label: 'History', count: null }

          ].map(tab => (

            <button

              key={tab.id}

              onClick={() => setActiveTab(tab.id)}

              className={`px-4 py-2 font-medium border-b-2 transition-colors ${

                activeTab === tab.id

                  ? 'border-blue-600 text-blue-600'

                  : 'border-transparent text-gray-600 hover:text-gray-900'

              }`}

            >

              {tab.label}

              {tab.count !== null && (

                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">

                  {tab.count}

                </span>

              )}

            </button>

          ))}

        </div>

      </div>

      <div className="flex-1 overflow-y-auto p-6">

        {activeTab === 'pending' && (

          <div className="space-y-6">

            {/* Summary Cards */}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

              <div className="bg-white border border-gray-200 rounded-lg p-4">

                <p className="text-sm text-gray-600 mb-1">Total Pending</p>

                <p className="text-2xl font-bold text-gray-900">{pendingAdjustments.length}</p>

                <p className="text-sm text-gray-500">Awaiting approval</p>

              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">

                <p className="text-sm text-gray-600 mb-1">Total Value</p>

                <p className="text-2xl font-bold text-red-600">
                  {summaryStats.totalValue > 0 
                    ? `RWF ${summaryStats.totalValue.toLocaleString()}` 
                    : 'RWF 0'}
                </p>

                <p className="text-sm text-gray-500">Negative adjustments</p>

              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">

                <p className="text-sm text-gray-600 mb-1">Oldest Pending</p>

                <p className="text-2xl font-bold text-orange-600">
                  {summaryStats.oldestAge}
                </p>

                <p className="text-sm text-gray-500">Needs attention</p>

              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">

                <p className="text-sm text-gray-600 mb-1">This Month</p>

                <p className="text-2xl font-bold text-gray-900">
                  {summaryStats.thisMonthCount}
                </p>

                <p className="text-sm text-gray-500">Total adjustments</p>

              </div>

            </div>

            {/* Filters */}

            <div className="bg-white border border-gray-200 rounded-lg p-4">

              <div className="flex gap-3">

                <div className="flex-1 relative">

                  <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />

                  <input

                    type="text"

                    placeholder="Search by adjustment ID, SKU, or reason..."

                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"

                  />

                </div>

                <select 
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                  value={typeFilter || 'all'}
                  onChange={(e) => setTypeFilter(e.target.value === 'all' ? null : e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="write-off">Write-off</option>
                  <option value="damage">Damage</option>
                  <option value="shrinkage">Shrinkage</option>
                  <option value="quality">Quality</option>
                  <option value="other">Other</option>
                </select>

                <select 
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                  value={locationFilter ?? 'all'}
                  onChange={(e) => {
                    const value = e.target.value;
                    setLocationFilter(value === 'all' ? null : value);
                  }}
                >
                  <option value="all">All Locations</option>
                  {locations && locations.length > 0 && locations.map((location: any) => (
                    <option key={location.location_id} value={String(location.location_id)}>
                      {location.name}
                    </option>
                  ))}
                </select>

              </div>

            </div>

            {/* Adjustments Table */}

            <div className="bg-white border border-gray-200 rounded-lg">

              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">

                <h2 className="font-semibold text-gray-900">Pending Adjustments</h2>

                {loadingAdjustments && (

                  <span className="text-sm text-gray-500">Loading...</span>

                )}

                {adjustmentsError && (

                  <span className="text-sm text-red-600">{adjustmentsError}</span>

                )}

                {selectedItems.length > 0 && (

                  <div className="flex gap-2">

                    <button

                      onClick={handleBatchApprove}

                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"

                    >

                      ✓ Approve {selectedItems.length} Selected

                    </button>

                    <button

                      onClick={handleBatchReject}

                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"

                    >

                      ✗ Reject {selectedItems.length} Selected

                    </button>

                  </div>

                )}

              </div>

              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead className="bg-gray-50 border-b border-gray-200">

                    <tr>

                      <th className="px-4 py-3 w-12">

                        <input

                          type="checkbox"

                          className="rounded"

                          checked={selectedItems.length === pendingAdjustments.length}

                          onChange={handleSelectAll}

                        />

                      </th>

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">ID</th>

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Type</th>

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Reason</th>

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Product</th>

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Items</th>

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Value</th>

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Submitted</th>

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Age</th>

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Actions</th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-gray-200">

                    {loadingAdjustments ? (

                      <tr>

                        <td colSpan={10} className="px-4 py-8 text-center text-gray-500">

                          Loading adjustments...

                        </td>

                      </tr>

                    ) : pendingAdjustments.length === 0 ? (

                      <tr>

                        <td colSpan={10} className="px-4 py-8 text-center text-gray-500">

                          No pending adjustments found

                        </td>

                      </tr>

                    ) : (

                      pendingAdjustments.map((adj) => (

                      <tr key={adj.id} className="hover:bg-gray-50">

                        <td className="px-4 py-3">

                          <input

                            type="checkbox"

                            className="rounded"

                            checked={selectedItems.includes(adj.id)}

                            onChange={() => handleSelectItem(adj.id)}

                          />

                        </td>

                        <td className="px-4 py-3 text-sm font-medium text-gray-900">

                          {adj.id}

                        </td>

                        <td className="px-4 py-3">

                          <span className={`px-2 py-1 text-xs font-medium rounded ${

                            adj.type === 'write-off' || adj.type === 'quality'

                              ? 'bg-red-100 text-red-700'

                              : adj.type === 'damage'

                              ? 'bg-orange-100 text-orange-700'

                              : adj.type === 'shrinkage'

                              ? 'bg-yellow-100 text-yellow-700'

                              : 'bg-blue-100 text-blue-700'

                          }`}>

                            {adj.type.replace('-', ' ').toUpperCase()}

                          </span>

                        </td>

                        <td className="px-4 py-3 text-sm text-gray-900">

                          {adj.reason}

                        </td>

                        <td className="px-4 py-3 text-sm text-gray-900">

                          {adj.items.length > 0 ? adj.items[0].name || 'Unknown' : 'N/A'}

                          {adj.items.length > 1 && ` +${adj.items.length - 1} more`}

                        </td>

                        <td className="px-4 py-3 text-sm text-gray-600">

                          {adj.items.length} item(s)

                        </td>

                        <td className="px-4 py-3 text-sm text-red-600 font-medium">

                          {adj.totalValue}

                        </td>

                        <td className="px-4 py-3 text-sm text-gray-600">

                          <p>{adj.submittedBy}</p>

                          <p className="text-xs text-gray-500">

                            {new Date(adj.submittedDate).toLocaleDateString()}

                          </p>

                        </td>

                        <td className="px-4 py-3 text-sm">

                          <span className={`font-medium ${

                            parseInt(adj.age) > 3 ? 'text-red-600' : 'text-gray-600'

                          }`}>

                            {adj.age}

                          </span>

                        </td>

                        <td className="px-4 py-3">

                          <div className="flex gap-2">

                            <button

                              onClick={() => {

                                setSelectedAdjustment(adj);

                                setShowDetails(true);

                              }}

                              className="text-blue-600 hover:text-blue-700"

                              title="View Details"

                            >

                              <Eye className="w-4 h-4" />

                            </button>

                            <button

                              onClick={() => handleApprove(adj.id)}

                              className="text-green-600 hover:text-green-700"

                              title="Approve"

                            >

                              <CheckCircle className="w-4 h-4" />

                            </button>

                            <button

                              onClick={() => handleReject(adj.id)}

                              className="text-red-600 hover:text-red-700"

                              title="Reject"

                            >

                              <XCircle className="w-4 h-4" />

                            </button>

                          </div>

                        </td>

                      </tr>

                      ))

                    )}

                  </tbody>

                </table>

              </div>

            </div>

          </div>

        )}

        {activeTab === 'create' && (

          <div className="max-w-4xl mx-auto">

            <div className="bg-white border border-gray-200 rounded-lg p-6">

              <h2 className="text-xl font-bold text-gray-900 mb-6">Create Stock Adjustment</h2>

              <div className="space-y-6">

                {/* Adjustment Type */}

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-3">

                    Adjustment Type *

                  </label>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                    {adjustmentTypes.map((type) => {

                      const Icon = type.icon;
                      const isSelected = selectedAdjustmentType === type.value;

                      return (

                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setSelectedAdjustmentType(type.value)}
                          className={`relative flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50 shadow-md ring-2 ring-blue-200'
                              : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                          }`}
                        >

                          <Icon className={`w-6 h-6 ${
                            isSelected
                              ? type.color === 'red' ? 'text-red-700' :
                                type.color === 'orange' ? 'text-orange-700' :
                                type.color === 'yellow' ? 'text-yellow-700' :
                                type.color === 'blue' ? 'text-blue-700' :
                                type.color === 'green' ? 'text-green-700' :
                                'text-gray-700'
                              : type.color === 'red' ? 'text-red-600' :
                                type.color === 'orange' ? 'text-orange-600' :
                                type.color === 'yellow' ? 'text-yellow-600' :
                                type.color === 'blue' ? 'text-blue-600' :
                                type.color === 'green' ? 'text-green-600' :
                                'text-gray-600'
                          }`} />

                          <span className={`text-sm font-medium ${
                            isSelected ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {type.label}
                          </span>

                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle className="w-5 h-5 text-blue-600" />
                            </div>
                          )}

                        </button>

                      );

                    })}

                  </div>

                </div>

                {/* Basic Info */}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-1">

                      Reason *

                    </label>

                    <input

                      type="text"

                      placeholder="e.g., Damaged during inspection"

                      value={formData.reason}

                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}

                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"

                    />

                  </div>

                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-1">

                      Date *

                    </label>

                    <input

                      type="date"

                      value={formData.date}

                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}

                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"

                    />

                  </div>

                </div>

                {/* Item Selection */}

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-1">

                    Select Products *

                  </label>

                  {preSelectedSkus.length > 0 && (
                    <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                      Pre-selected: {preSelectedSkus.join(', ')}
                    </div>
                  )}

                  <div className="flex gap-2">

                    <div className="flex-1 relative product-search-container">
                      <input

                        type="text"

                        placeholder="Search products by name or SKU..."

                        value={productSearchTerm}

                        onChange={(e) => {

                          setProductSearchTerm(e.target.value);

                          setShowProductDropdown(true);

                        }}

                        onFocus={() => setShowProductDropdown(true)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"

                      />

                      {showProductDropdown && filteredProducts.length > 0 && (

                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">

                          {filteredProducts.slice(0, 10).map((product) => (

                            <button

                              key={product.product_id}

                              type="button"

                              onClick={async () => {

                                const alreadyAdded = selectedProducts.some(p => p.product_id === product.product_id);

                                if (!alreadyAdded) {
                                  // Fetch full product details with variants if it's a packaged product
                                  let fullProduct = product;
                                  if (product.product_type === 'packaged') {
                                    try {
                                      const productResponse = await api.get(`/catalog/products/${product.product_id}`);
                                      if (productResponse.data) {
                                        fullProduct = productResponse.data;
                                        // Store variants in the map
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

                                    quantity: 0,

                                    location_id: '',

                                    unit_cost: fullProduct.cost_price || 0,
                                    variant_id: fullProduct.product_type === 'packaged' ? '' : undefined,
                                    orderBy: fullProduct.product_type === 'packaged' ? 'packages' : undefined,
                                    packages: fullProduct.product_type === 'packaged' ? 0 : undefined,
                                    units: fullProduct.product_type === 'packaged' ? 0 : undefined,

                                  }]);

                                }

                                setProductSearchTerm('');

                                setShowProductDropdown(false);

                              }}

                              className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"

                            >

                              <div className="font-medium text-gray-900">{product.name}</div>

                              <div className="text-sm text-gray-500">SKU: {product.sku}</div>

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
                              // Fetch full product details with variants if it's a packaged product
                              let fullProduct = product;
                              if (product.product_type === 'packaged') {
                                try {
                                  const productResponse = await api.get(`/catalog/products/${product.product_id}`);
                                  if (productResponse.data) {
                                    fullProduct = productResponse.data;
                                    // Store variants in the map
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

                                quantity: 0,

                                location_id: '',

                                unit_cost: fullProduct.cost_price || 0,
                                variant_id: fullProduct.product_type === 'packaged' ? '' : undefined,
                                orderBy: fullProduct.product_type === 'packaged' ? 'packages' : undefined,
                                packages: fullProduct.product_type === 'packaged' ? 0 : undefined,
                                units: fullProduct.product_type === 'packaged' ? 0 : undefined,

                              }]);

                              setProductSearchTerm('');

                              setShowProductDropdown(false);

                            }

                          }

                        }

                      }}

                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"

                    >

                      Add Item

                    </button>

                  </div>

                </div>

                {/* Items Table */}

                {selectedProducts.length > 0 ? (

                  <div className="border border-gray-200 rounded-lg overflow-hidden">

                    <table className="w-full">

                      <thead className="bg-gray-50 border-b border-gray-200">

                        <tr>

                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Product</th>

                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">SKU</th>

                          {selectedProducts.some(p => p.product_type === 'packaged') && (
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Variant</th>
                          )}

                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                            Quantity
                            <span className="block text-xs font-normal text-gray-500 mt-1">
                              (varies by product type)
                            </span>
                          </th>

                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Location</th>

                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Unit Cost</th>

                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Actions</th>

                        </tr>

                      </thead>

                      <tbody className="divide-y divide-gray-200">

                        {selectedProducts.map((product, index) => {
                          const variants = productVariants.get(product.product_id) || product.variants || [];
                          // Ensure variant_id comparison works by converting both to numbers
                          const productVariantId = product.variant_id ? Number(product.variant_id) : null;
                          const selectedVariant = variants.find((v: any) => Number(v.variant_id) === productVariantId);
                          const isPackaged = product.product_type === 'packaged';
                          const isBulk = product.product_type === 'bulk';
                          const unitsPerPackage = selectedVariant?.units_per_package || 1;

                          // Get unit name for display
                          const getUnitLabel = () => {
                            if (isPackaged && selectedVariant) {
                              return selectedVariant.base_unit || 'units';
                            }
                            if (isBulk) {
                              return product.bulk_unit || 'units';
                            }
                            // For other product types, get unit from units table
                            const unit = units.find((u: any) => u.unit_id === product.unit_id);
                            return unit?.short_code || unit?.name || 'units';
                          };

                          const unitLabel = getUnitLabel();

                          // Calculate quantity from packages/units for packaged products
                          const calculateQuantity = () => {
                            if (isPackaged && selectedVariant) {
                              if (product.orderBy === 'packages') {
                                return product.packages * unitsPerPackage;
                              } else {
                                return product.units || 0;
                              }
                            }
                            return product.quantity || 0;
                          };

                          const currentQuantity = calculateQuantity();

                          return (
                          <tr key={product.product_id} className="hover:bg-gray-50">

                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.name}</td>

                            <td className="px-4 py-3 text-sm text-gray-600">{product.sku}</td>

                            {isPackaged && (
                              <td className="px-4 py-3">
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
                                    updated[index].orderBy = 'packages'; // Default to packages mode
                                    updated[index].unit_cost = variant?.cost_price || variant?.unit_price || product.cost_price || 0;
                                    setSelectedProducts(updated);
                                  }}
                                  className="w-40 px-2 py-1 border border-gray-300 rounded text-sm"
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

                            <td className="px-4 py-3">
                              {isPackaged && !selectedVariant ? (
                                <div className="text-xs text-amber-600 italic px-2 py-1 bg-amber-50 border border-amber-200 rounded">
                                  Please select a variant first
                                </div>
                              ) : isPackaged && selectedVariant ? (
                                <div className="space-y-2">
                                  {/* Default to packages mode - show prominently */}
                                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                                    <label className="block text-xs font-semibold text-blue-900 mb-1">
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
                                        className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-100"
                                      >
                                        <Minus className="w-4 h-4" />
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
                                        className="w-24 px-3 py-2 border-2 border-blue-300 rounded text-base font-bold text-center focus:border-blue-500"
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
                                        className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-100"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    </div>
                                    {/* Show automatic calculation prominently */}
                                    <div className="mt-2 p-2 bg-white border border-blue-300 rounded">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600">
                                          <Calculator className="w-3 h-3 inline mr-1" />
                                          Automatically calculated:
                                        </span>
                                        <span className="text-sm font-bold text-blue-700">
                                          {currentQuantity} {selectedVariant.base_unit || 'units'}
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {product.packages || 0} {selectedVariant.package_unit || 'boxes'} × {unitsPerPackage} {selectedVariant.base_unit || 'units'}/{selectedVariant.package_unit || 'box'} = {currentQuantity} {selectedVariant.base_unit || 'units'}
                                      </div>
                                    </div>
                                  </div>
                                  {/* Optional: Allow switching to units mode */}
                                  <details className="text-xs">
                                    <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                                      Or enter by individual {selectedVariant.base_unit || 'units'}
                                    </summary>
                                    <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded">
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = [...selectedProducts];
                                            updated[index].units = Math.max(0, (updated[index].units || 0) - 1);
                                            updated[index].packages = Math.ceil(updated[index].units / unitsPerPackage);
                                            updated[index].quantity = updated[index].units;
                                            setSelectedProducts(updated);
                                          }}
                                          className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                                        >
                                          <Minus className="w-3 h-3" />
                                        </button>
                                        <input
                                          type="number"
                                          min="0"
                                          value={product.units || 0}
                                          onChange={(e) => {
                                            const updated = [...selectedProducts];
                                            const units = parseInt(e.target.value) || 0;
                                            updated[index].units = units;
                                            updated[index].packages = Math.ceil(units / unitsPerPackage);
                                            updated[index].quantity = units;
                                            setSelectedProducts(updated);
                                          }}
                                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                                          placeholder="0"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = [...selectedProducts];
                                            updated[index].units = (updated[index].units || 0) + 1;
                                            updated[index].packages = Math.ceil(updated[index].units / unitsPerPackage);
                                            updated[index].quantity = updated[index].units;
                                            setSelectedProducts(updated);
                                          }}
                                          className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </button>
                                        <span className="text-xs text-gray-600 ml-2">
                                          = {product.packages || 0} {selectedVariant.package_unit || 'boxes'}
                                        </span>
                                      </div>
                                    </div>
                                  </details>
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
                                    className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                                  >
                                    <Minus className="w-3 h-3" />
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
                                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                                    />
                                    <span className="text-xs text-gray-500 text-center mt-1">{unitLabel}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...selectedProducts];
                                      updated[index].quantity = (updated[index].quantity || 0) + (isBulk ? 0.1 : 1);
                                      setSelectedProducts(updated);
                                    }}
                                    className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3">

                              <select

                                value={product.location_id || ''}

                                onChange={(e) => {

                                  const updated = [...selectedProducts];

                                  updated[index].location_id = e.target.value;

                                  setSelectedProducts(updated);

                                }}

                                className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"

                              >

                                <option value="">Select Location</option>

                                {locations.map((location: any) => (

                                  <option key={location.location_id} value={location.location_id}>

                                    {location.name}

                                  </option>

                                ))}

                              </select>

                            </td>

                            <td className="px-4 py-3">

                              <input

                                type="number"

                                min="0"

                                step="0.01"

                                value={product.unit_cost || 0}

                                onChange={(e) => {

                                  const updated = [...selectedProducts];

                                  updated[index].unit_cost = parseFloat(e.target.value) || 0;

                                  setSelectedProducts(updated);

                                }}

                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"

                              />

                            </td>

                            <td className="px-4 py-3">

                              <button

                                type="button"

                                onClick={() => {

                                  setSelectedProducts(selectedProducts.filter((_, i) => i !== index));

                                }}

                                className="text-red-600 hover:text-red-700"

                              >

                                <Trash2 className="w-4 h-4" />

                              </button>

                            </td>

                          </tr>
                          );
                        })}

                      </tbody>

                    </table>

                  </div>

                ) : (

                  <div className="border border-gray-200 rounded-lg p-8 text-center">

                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />

                    <p className="text-gray-600">No items added yet</p>

                    <p className="text-sm text-gray-500">Search and add products to adjust</p>

                  </div>

                )}

                {/* Notes */}

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-1">

                    Notes

                  </label>

                  <textarea

                    rows={3}

                    placeholder="Add any additional details..."

                    value={formData.notes}

                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}

                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"

                  />

                </div>

                {/* Attachments */}

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-1">

                    Attachments (Photos, Documents)

                  </label>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">

                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />

                    <p className="text-sm text-gray-600 mb-1">

                      Drag and drop files here, or click to browse

                    </p>

                    <p className="text-xs text-gray-500">

                      Supports: JPG, PNG, PDF (Max 10MB)

                    </p>

                  </div>

                </div>

                {/* Actions */}

                <div className="flex gap-3 pt-6 border-t border-gray-200">

                  <button

                    type="button"

                    onClick={async () => {

                      if (!selectedAdjustmentType) {

                        alert('Please select an adjustment type');

                        return;

                      }

                      if (selectedProducts.length === 0) {

                        alert('Please add at least one product');

                        return;

                      }

                      if (!formData.reason.trim()) {

                        alert('Please enter a reason');

                        return;

                      }

                      setIsSubmitting(true);

                      try {

                        // Validate all products have required fields
                        const invalidProducts = selectedProducts.filter(p => {
                          // For packaged products, check variant_id
                          if (p.product_type === 'packaged' && !p.variant_id) {
                            return true;
                          }
                          // Calculate actual quantity
                          let actualQty = 0;
                          if (p.product_type === 'packaged') {
                            const variants = productVariants.get(p.product_id) || p.variants || [];
                            const productVariantId = p.variant_id ? Number(p.variant_id) : null;
                            const variant = variants.find((v: any) => Number(v.variant_id) === productVariantId);
                            if (variant) {
                              const unitsPerPackage = variant.units_per_package || 1;
                              actualQty = p.orderBy === 'packages' 
                                ? (p.packages || 0) * unitsPerPackage 
                                : (p.units || 0);
                            }
                          } else {
                            actualQty = p.quantity || 0;
                          }
                          return !p.location_id || actualQty <= 0;
                        });

                        if (invalidProducts.length > 0) {
                          alert('Please ensure all products have a location, variant (for packaged products), and quantity greater than 0');
                          setIsSubmitting(false);
                          return;
                        }

                        // Create adjustments for each product
                        const adjustmentPromises = selectedProducts.map(async (product) => {
                          // Calculate actual quantity based on product type
                          let actualQuantity = 0;
                          let variantId = null;
                          
                          if (product.product_type === 'packaged') {
                            const variants = productVariants.get(product.product_id) || product.variants || [];
                            const productVariantId = product.variant_id ? Number(product.variant_id) : null;
                            const variant = variants.find((v: any) => Number(v.variant_id) === productVariantId);
                            if (!variant) {
                              throw new Error(`Variant not found for ${product.name}`);
                            }
                            variantId = productVariantId;
                            const unitsPerPackage = variant.units_per_package || 1;
                            actualQuantity = product.orderBy === 'packages' 
                              ? (product.packages || 0) * unitsPerPackage 
                              : (product.units || 0);
                          } else {
                            actualQuantity = product.quantity || 0;
                          }

                          // First, get the stock level for this product and location
                          const stockLevelsParams: any = {
                            productId: product.product_id,
                            locationId: product.location_id
                          };
                          if (variantId) {
                            // For packaged products, we need to find the stock level with matching variant
                            // The API might not support variant filtering, so we'll filter client-side
                          }
                          
                          const stockLevelsResponse = await api.get<any[]>(
                            `/inventory/stock-levels?productId=${product.product_id}&locationId=${product.location_id}`
                          );

                          let stockLevelId = null;
                          if (stockLevelsResponse.data && stockLevelsResponse.data.length > 0) {
                            // For packaged products, find the stock level with matching variant_id
                            if (variantId) {
                              const matchingLevel = stockLevelsResponse.data.find(
                                (sl: any) => {
                                  const slVariantId = sl.variant_id ? Number(sl.variant_id) : null;
                                  const prodVariantId = variantId ? Number(variantId) : null;
                                  return slVariantId === prodVariantId;
                                }
                              );
                              // Only use the matching level, don't fall back to first one
                              if (matchingLevel) {
                                stockLevelId = matchingLevel.stock_level_id;
                                console.log(`[StockAdjustments] Found matching stock level ${stockLevelId} for variant ${variantId}`);
                              } else {
                                console.log(`[StockAdjustments] No matching stock level found for variant ${variantId}, will create new one`);
                              }
                              // If no matching level found, stockLevelId remains null and we'll create a new one
                            } else {
                              // For non-packaged products, use the first (and likely only) stock level
                              stockLevelId = stockLevelsResponse.data[0].stock_level_id;
                              console.log(`[StockAdjustments] Using stock level ${stockLevelId} for non-packaged product`);
                            }
                          } else {
                            console.log(`[StockAdjustments] No stock levels found, will create new one`);
                          }

                          // Map adjustment type to increase/decrease
                          const adjustmentType = selectedAdjustmentType === 'found' ? 'increase' : 'decrease';
                          
                          // Prepare the adjustment payload
                          const adjustPayload: any = {
                            product_id: product.product_id,
                            location_id: product.location_id,
                            adjustment_type: adjustmentType,
                            quantity: actualQuantity,
                            reason_code: selectedAdjustmentType || 'other',
                            remarks: formData.reason || formData.notes || 'Stock adjustment',
                            unit_cost: product.unit_cost || 0,
                          };
                          
                          // Include variant_id for packaged products (send null explicitly if not set)
                          if (product.product_type === 'packaged') {
                            adjustPayload.variant_id = variantId || null;
                          }
                          
                          // If stock level exists, adjust it using the stock level ID
                          if (stockLevelId) {
                            return api.post(`/inventory/stock-levels/${stockLevelId}/adjust`, adjustPayload);
                          } else {
                            // If no stock level exists, create one first (for increase adjustments)
                            // Then adjust it, or for decrease, we can't decrease what doesn't exist
                            if (adjustmentType === 'increase') {
                              // Create the stock level first
                              const createPayload: any = {
                                product_id: product.product_id,
                                location_id: product.location_id,
                                quantity_in_stock: 0, // Start with 0, then adjust
                                unit_cost: product.unit_cost || 0,
                              };
                              
                              // Include variant_id for packaged products
                              if (variantId) {
                                createPayload.variant_id = variantId;
                              }
                              
                              const createResponse = await api.post<any>('/inventory/stock-levels', createPayload);
                              const newStockLevelId = (createResponse.data as any).stock_level_id;
                              
                              // Now adjust the newly created stock level
                              return api.post(`/inventory/stock-levels/${newStockLevelId}/adjust`, adjustPayload);
                            } else {
                              throw new Error(`Cannot decrease stock for ${product.name} - no stock level exists`);
                            }
                          }
                        });

                        await Promise.all(adjustmentPromises);

                        alert('Adjustment submitted successfully!');

                        // Reset form

                        setSelectedAdjustmentType(null);

                        setFormData({ reason: '', date: new Date().toISOString().split('T')[0], notes: '' });

                        setSelectedProducts([]);

                        setProductSearchTerm('');

                        // Reload adjustments
                        await loadAdjustments('pending');

                        setActiveTab('pending');

                      } catch (error: any) {
                        console.error('Error submitting adjustment:', error);
                        
                        // Extract error message from API response
                        let errorMessage = 'Unknown error';
                        if (error?.response?.data?.error) {
                          errorMessage = error.response.data.error;
                        } else if (error instanceof Error) {
                          errorMessage = error.message;
                        } else if (typeof error === 'string') {
                          errorMessage = error;
                        }
                        
                        alert(`Failed to submit adjustment: ${errorMessage}`);
                      } finally {

                        setIsSubmitting(false);

                      }

                    }}

                    disabled={isSubmitting}

                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"

                  >

                    {isSubmitting ? 'Submitting...' : 'Submit for Approval'}

                  </button>

                  <button

                    type="button"

                    onClick={async () => {

                      if (!selectedAdjustmentType) {

                        alert('Please select an adjustment type');

                        return;

                      }

                      if (selectedProducts.length === 0) {

                        alert('Please add at least one product');

                        return;

                      }

                      setIsSubmitting(true);

                      try {

                        // TODO: Implement API call to save as draft

                        console.log('Saving as draft:', {

                          type: selectedAdjustmentType,

                          reason: formData.reason,

                          date: formData.date,

                          notes: formData.notes,

                          products: selectedProducts,

                        });

                        alert('Adjustment saved as draft successfully!');

                        setActiveTab('pending');

                      } catch (error) {

                        console.error('Error saving draft:', error);

                        alert('Failed to save draft. Please try again.');

                      } finally {

                        setIsSubmitting(false);

                      }

                    }}

                    disabled={isSubmitting}

                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"

                  >

                    {isSubmitting ? 'Saving...' : 'Save as Draft'}

                  </button>

                  <button

                    type="button"

                    onClick={() => {

                      setActiveTab('pending');

                      setSelectedAdjustmentType(null);

                      setFormData({ reason: '', date: new Date().toISOString().split('T')[0], notes: '' });

                      setSelectedProducts([]);

                      setProductSearchTerm('');

                    }}

                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"

                  >

                    Cancel

                  </button>

                </div>

              </div>

            </div>

          </div>

        )}

        {activeTab === 'history' && (

          <div className="space-y-6">

            {loadingAdjustments ? (

              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">

                <p className="text-gray-500">Loading adjustment history...</p>

              </div>

            ) : historyAdjustments.length === 0 ? (

              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">

                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />

                <h3 className="text-lg font-semibold text-gray-900 mb-2">

                  Adjustment History

                </h3>

                <p className="text-gray-600">

                  No adjustment history found

                </p>

              </div>

            ) : (

              <div className="bg-white border border-gray-200 rounded-lg">

                <div className="px-4 py-3 border-b border-gray-200">

                  <h2 className="font-semibold text-gray-900">Adjustment History</h2>

                </div>

                <div className="overflow-x-auto">

                  <table className="w-full">

                    <thead className="bg-gray-50 border-b border-gray-200">

                      <tr>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">ID</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Type</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Reason</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Product</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Items</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Value</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Submitted By</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Date</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Approved By</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Status</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Rejection Reason</th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-gray-200">

                      {historyAdjustments.map((adj) => (

                        <tr key={adj.id} className="hover:bg-gray-50">

                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{adj.id}</td>

                          <td className="px-4 py-3">

                            <span className={`px-2 py-1 text-xs font-medium rounded ${

                              adj.type === 'write-off' || adj.type === 'quality'

                                ? 'bg-red-100 text-red-700'

                                : adj.type === 'damage'

                                ? 'bg-orange-100 text-orange-700'

                                : adj.type === 'shrinkage'

                                ? 'bg-yellow-100 text-yellow-700'

                                : 'bg-blue-100 text-blue-700'

                            }`}>

                              {adj.type.replace('-', ' ').toUpperCase()}

                            </span>

                          </td>

                          <td className="px-4 py-3 text-sm text-gray-900">{adj.reason}</td>

                          <td className="px-4 py-3 text-sm text-gray-900">

                            {adj.items.length > 0 ? adj.items[0].name || 'Unknown' : 'N/A'}

                            {adj.items.length > 1 && ` +${adj.items.length - 1} more`}

                          </td>

                          <td className="px-4 py-3 text-sm text-gray-600">{adj.items.length} item(s)</td>

                          <td className="px-4 py-3 text-sm text-red-600 font-medium">{adj.totalValue}</td>

                          <td className="px-4 py-3 text-sm text-gray-600">{adj.submittedBy}</td>

                          <td className="px-4 py-3 text-sm text-gray-600">

                            {new Date(adj.submittedDate).toLocaleDateString()}

                          </td>

                          <td className="px-4 py-3 text-sm text-gray-600">

                            {adj.approved_by_name || 'N/A'}

                          </td>

                          <td className="px-4 py-3">

                            {adj.approval_status === 'approved' ? (
                              <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700">
                                ✓ Approved
                              </span>
                            ) : adj.approval_status === 'rejected' ? (
                              <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700">
                                ✗ Rejected
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                                Pending
                              </span>
                            )}

                          </td>

                          <td className="px-4 py-3 text-sm text-gray-600">

                            {adj.rejection_reason || '-'}

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              </div>

            )}

          </div>

        )}

      </div>

      {/* Details Modal */}

      {showDetails && selectedAdjustment && (

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">

          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">

            <div className="p-6 border-b border-gray-200 flex items-center justify-between">

              <h3 className="text-xl font-bold text-gray-900">

                Adjustment Details: {selectedAdjustment.id}

              </h3>

              <button

                onClick={() => setShowDetails(false)}

                className="text-gray-400 hover:text-gray-600"

              >

                <XCircle className="w-6 h-6" />

              </button>

            </div>

            <div className="p-6 space-y-6">

              {/* Info Grid */}

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <p className="text-sm text-gray-600">Type</p>

                  <p className="font-medium text-gray-900 capitalize">

                    {selectedAdjustment.type.replace('-', ' ')}

                  </p>

                </div>

                <div>

                  <p className="text-sm text-gray-600">Total Value</p>

                  <p className="font-medium text-red-600">{selectedAdjustment.totalValue}</p>

                </div>

                <div>

                  <p className="text-sm text-gray-600">Submitted By</p>

                  <p className="font-medium text-gray-900">{selectedAdjustment.submittedBy}</p>

                </div>

                <div>

                  <p className="text-sm text-gray-600">Date</p>

                  <p className="font-medium text-gray-900">

                    {new Date(selectedAdjustment.submittedDate).toLocaleDateString()}

                  </p>

                </div>

              </div>

              {/* Reason */}

              <div>

                <p className="text-sm text-gray-600 mb-1">Reason</p>

                <p className="text-gray-900">{selectedAdjustment.reason}</p>

              </div>

              {/* Items */}

              <div>

                <p className="text-sm font-medium text-gray-900 mb-2">Affected Items</p>

                <div className="border border-gray-200 rounded-lg overflow-hidden">

                  <table className="w-full">

                    <thead className="bg-gray-50">

                      <tr>

                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">SKU</th>

                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Item</th>

                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Qty</th>

                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Location</th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-gray-200">

                      {selectedAdjustment.items.map((item: any, idx: number) => (

                        <tr key={idx}>

                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{item.sku}</td>

                          <td className="px-4 py-2 text-sm text-gray-900">{item.name}</td>

                          <td className="px-4 py-2 text-sm text-gray-900">

                            {item.qty} {item.unit}

                          </td>

                          <td className="px-4 py-2 text-sm text-gray-600">{item.location}</td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              </div>

              {/* Notes */}

              {selectedAdjustment.notes && (

                <div>

                  <p className="text-sm font-medium text-gray-900 mb-1">Notes</p>

                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">

                    {selectedAdjustment.notes}

                  </p>

                </div>

              )}

              {/* Attachments */}

              {selectedAdjustment.attachments.length > 0 && (

                <div>

                  <p className="text-sm font-medium text-gray-900 mb-2">Attachments</p>

                  <div className="flex gap-2">

                    {selectedAdjustment.attachments.map((file: string, idx: number) => (

                      <div key={idx} className="px-3 py-2 bg-gray-100 rounded text-sm text-gray-700">

                        {file}

                      </div>

                    ))}

                  </div>

                </div>

              )}

              {/* Actions */}

              <div className="flex gap-3 pt-4 border-t border-gray-200">

                <button

                  onClick={() => {

                    handleApprove(selectedAdjustment.id);

                    setShowDetails(false);

                  }}

                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"

                >

                  ✓ Approve

                </button>

                <button

                  onClick={() => {

                    handleReject(selectedAdjustment.id);

                    setShowDetails(false);

                  }}

                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"

                >

                  ✗ Reject

                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};

export default StockAdjustments;



