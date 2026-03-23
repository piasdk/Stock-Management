"use client";

import React, { useState, useEffect } from 'react';

import { 

  Activity, TrendingUp, TrendingDown, Package,

  Search, Filter, Calendar, Download, Eye,

  ArrowRight, ArrowDown, ArrowUp, RefreshCw

} from 'lucide-react';

import { api } from "@/lib/api";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";

const StockMovements = () => {

  const [dateRange, setDateRange] = useState('today');
  const [movementType, setMovementType] = useState('all');
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });

  useEffect(() => {
    loadMovements();
  }, [dateRange, movementType]);

  const loadMovements = async () => {
    setLoading(true);
    setError(null);

    const today = new Date();
    const params: any = {
      movementType: movementType !== 'all' ? movementType : undefined,
      page: 1,
      limit: 50
    };

    // Set date range
    if (dateRange === 'today') {
      params.startDate = today.toISOString().split('T')[0];
      params.endDate = today.toISOString().split('T')[0];
    } else if (dateRange === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      params.startDate = weekAgo.toISOString().split('T')[0];
      params.endDate = today.toISOString().split('T')[0];
    } else if (dateRange === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      params.startDate = monthAgo.toISOString().split('T')[0];
      params.endDate = today.toISOString().split('T')[0];
    }

    const response = await api.get<{ data: any[], pagination: any }>("/operations/inventory/movements", params);

    if (response.error) {
      // Handle 500 errors gracefully - don't show error for backend issues
      if (response.details?.status === 500) {
        setMovements([]);
        setLoading(false);
        return;
      }
      setError(response.error);
      setLoading(false);
      return;
    }

    // Transform API data
    const transformed = (response.data?.data || []).map((movement: any) => {
      // Map database movement types to frontend types
      const typeMap: Record<string, string> = {
        'purchase': 'receive',
        'purchase_return': 'return',
        'sale': 'issue',
        'sale_return': 'return',
        'manufacture_in': 'production',
        'manufacture_out': 'production',
        'adjustment': 'adjust',
        'transfer_in': 'transfer',
        'transfer_out': 'transfer',
        'write_off': 'adjust'
      };
      
      const frontendType = typeMap[movement.movement_type] || movement.movement_type || 'adjust';
      
      // Determine from/to locations
      let fromLocation = movement.from_location || movement.location_name || 'N/A';
      let toLocation = movement.to_location || movement.location_name || 'N/A';
      
      // For adjustments, use reference_doc if available
      if (movement.movement_type === 'adjustment' && movement.reference_doc) {
        fromLocation = movement.location_name || 'N/A';
        toLocation = movement.reference_doc;
      }
      
      // Build reference string
      let reference = '';
      if (movement.reference_doc) {
        reference = movement.reference_doc;
      } else if (movement.reference_type && movement.reference_id) {
        reference = `${movement.reference_type}-${movement.reference_id}`;
      } else if (movement.reference_type) {
        reference = movement.reference_type;
      } else {
        reference = `MOV-${movement.movement_id}`;
      }
      
      return {
        id: `MOV-${movement.movement_id}`,
        timestamp: new Date(movement.created_at).toLocaleString(),
        type: frontendType,
        sku: movement.sku || 'N/A',
        product: movement.product_name || 'Unknown Product',
        quantity: Number(movement.quantity) || 0,
        unit: 'unit', // Can be enhanced with unit from product if available
        from: fromLocation,
        to: toLocation,
        value: (Number(movement.quantity) || 0) * (Number(movement.unit_cost) || 0),
        user: movement.created_by_name || 'System',
        reference: reference
      };
    });

    setMovements(transformed);
    setPagination(response.data?.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
    setLoading(false);
  };

  // Calculate summary stats from actual movements data
  const calculateSummaryStats = () => {
    const todayMovements = movements.filter(m => {
      const movementDate = new Date(m.timestamp);
      const today = new Date();
      return movementDate.toDateString() === today.toDateString();
    });

    const received = todayMovements.filter(m => m.type === 'receive');
    const issued = todayMovements.filter(m => m.type === 'issue');
    const transferred = todayMovements.filter(m => m.type === 'transfer');
    const adjusted = todayMovements.filter(m => m.type === 'adjust');

    return {
      today: {
        received: {
          qty: received.reduce((sum, m) => sum + m.quantity, 0),
          value: received.reduce((sum, m) => sum + m.value, 0),
          count: received.length
        },
        issued: {
          qty: issued.reduce((sum, m) => sum + m.quantity, 0),
          value: issued.reduce((sum, m) => sum + m.value, 0),
          count: issued.length
        },
        transferred: {
          qty: transferred.reduce((sum, m) => sum + m.quantity, 0),
          value: transferred.reduce((sum, m) => sum + m.value, 0),
          count: transferred.length
        },
        adjusted: {
          qty: adjusted.reduce((sum, m) => sum + m.quantity, 0),
          value: adjusted.reduce((sum, m) => sum + m.value, 0),
          count: adjusted.length
        }
      }
    };
  };

  const summaryStats = calculateSummaryStats();

  const getMovementIcon = (type: string) => {

    const icons: Record<string, { Icon: typeof ArrowDown; color: string }> = {

      receive: { Icon: ArrowDown, color: 'green' },

      issue: { Icon: ArrowUp, color: 'blue' },

      transfer: { Icon: ArrowRight, color: 'purple' },

      adjust: { Icon: RefreshCw, color: 'orange' },

      production: { Icon: Package, color: 'indigo' },

      return: { Icon: TrendingDown, color: 'yellow' }

    };

    return icons[type] || icons.adjust;

  };

  const getMovementBadge = (type: string) => {

    const badges: Record<string, { color: string; label: string }> = {

      receive: { color: 'green', label: 'Receive' },

      issue: { color: 'blue', label: 'Issue' },

      transfer: { color: 'purple', label: 'Transfer' },

      adjust: { color: 'orange', label: 'Adjust' },

      production: { color: 'indigo', label: 'Production' },

      return: { color: 'yellow', label: 'Return' }

    };

    const badge = badges[type] || badges.adjust;

    return (

      <span className={`px-2 py-1 text-xs font-medium rounded ${
        type === 'receive' ? 'bg-green-100 text-green-700' :
        type === 'issue' ? 'bg-blue-100 text-blue-700' :
        type === 'transfer' ? 'bg-purple-100 text-purple-700' :
        type === 'adjust' ? 'bg-orange-100 text-orange-700' :
        type === 'production' ? 'bg-indigo-100 text-indigo-700' :
        'bg-yellow-100 text-yellow-700'
      }`}>

        {badge.label}

      </span>

    );

  };

  return (

    <div className="h-screen flex flex-col bg-gray-50">

      {/* Header */}

      <div className="bg-white border-b border-gray-200 px-6 py-4">

        <div className="flex items-center justify-between">

          <div>

            <h1 className="text-2xl font-bold text-gray-900">Stock Movements</h1>

            <p className="text-sm text-gray-500">Track all inventory transactions and movements</p>

          </div>

          <div className="flex gap-3">

            <select

              value={dateRange}

              onChange={(e) => setDateRange(e.target.value)}

              className="px-4 py-2 border border-gray-300 rounded-lg"

            >

              <option value="today">Today</option>

              <option value="yesterday">Yesterday</option>

              <option value="week">This Week</option>

              <option value="month">This Month</option>

              <option value="custom">Custom Range</option>

            </select>

            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">

              <Download className="w-4 h-4" />

              Export

            </button>

          </div>

        </div>

      </div>

      <div className="flex-1 overflow-y-auto p-6">

        {/* Summary Cards */}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

          <div className="bg-white border border-gray-200 rounded-lg p-4">

            <div className="flex items-start justify-between mb-2">

              <div>

                <p className="text-sm text-gray-600">Received</p>

                <p className="text-2xl font-bold text-green-600">

                  {summaryStats.today.received.qty}

                </p>

                <p className="text-sm text-gray-500">

                  RWF {summaryStats.today.received.value.toLocaleString()}

                </p>

              </div>

              <div className="p-2 rounded bg-green-100">

                <ArrowDown className="w-5 h-5 text-green-600" />

              </div>

            </div>

            <p className="text-xs text-gray-500">

              {summaryStats.today.received.count} transactions

            </p>

          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">

            <div className="flex items-start justify-between mb-2">

              <div>

                <p className="text-sm text-gray-600">Issued</p>

                <p className="text-2xl font-bold text-blue-600">

                  {summaryStats.today.issued.qty}

                </p>

                <p className="text-sm text-gray-500">

                  RWF {summaryStats.today.issued.value.toLocaleString()}

                </p>

              </div>

              <div className="p-2 rounded bg-blue-100">

                <ArrowUp className="w-5 h-5 text-blue-600" />

              </div>

            </div>

            <p className="text-xs text-gray-500">

              {summaryStats.today.issued.count} transactions

            </p>

          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">

            <div className="flex items-start justify-between mb-2">

              <div>

                <p className="text-sm text-gray-600">Transferred</p>

                <p className="text-2xl font-bold text-purple-600">

                  {summaryStats.today.transferred.qty}

                </p>

                <p className="text-sm text-gray-500">

                  RWF {summaryStats.today.transferred.value.toLocaleString()}

                </p>

              </div>

              <div className="p-2 rounded bg-purple-100">

                <ArrowRight className="w-5 h-5 text-purple-600" />

              </div>

            </div>

            <p className="text-xs text-gray-500">

              {summaryStats.today.transferred.count} transactions

            </p>

          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">

            <div className="flex items-start justify-between mb-2">

              <div>

                <p className="text-sm text-gray-600">Adjusted</p>

                <p className={`text-2xl font-bold ${

                  summaryStats.today.adjusted.qty >= 0 ? 'text-green-600' : 'text-orange-600'

                }`}>

                  {summaryStats.today.adjusted.qty}

                </p>

                <p className={`text-sm ${

                  summaryStats.today.adjusted.value >= 0 ? 'text-gray-500' : 'text-red-600'

                }`}>

                  RWF {Math.abs(summaryStats.today.adjusted.value).toLocaleString()}

                </p>

              </div>

              <div className="p-2 rounded bg-orange-100">

                <RefreshCw className="w-5 h-5 text-orange-600" />

              </div>

            </div>

            <p className="text-xs text-gray-500">

              {summaryStats.today.adjusted.count} transactions

            </p>

          </div>

        </div>

        {/* Filters */}

        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

            <div className="md:col-span-2 relative">

              <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />

              <input

                type="text"

                placeholder="Search by SKU, product, or reference..."

                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"

              />

            </div>

            <select

              value={movementType}

              onChange={(e) => setMovementType(e.target.value)}

              className="px-3 py-2 border border-gray-300 rounded-lg"

            >

              <option value="all">All Movement Types</option>

              <option value="receive">Receive</option>

              <option value="issue">Issue</option>

              <option value="transfer">Transfer</option>

              <option value="adjust">Adjust</option>

              <option value="production">Production</option>

              <option value="return">Return</option>

            </select>

            <select className="px-3 py-2 border border-gray-300 rounded-lg">

              <option>All Locations</option>

              <option>Main Warehouse</option>

              <option>Downtown Store</option>

              <option>Factory Storage</option>

            </select>

          </div>

        </div>

        {/* Movements Table */}

        <div className="bg-white border border-gray-200 rounded-lg">

          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">

            <h3 className="font-semibold text-gray-900">Movement History</h3>

            <div className="flex items-center gap-2 text-sm text-gray-600">

              <Activity className="w-4 h-4" />

              <span>{movements.length} movements today</span>

            </div>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="bg-gray-50 border-b border-gray-200">

                <tr>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Time</th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Type</th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Product</th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Quantity</th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">From</th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">To</th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Value</th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">User</th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Reference</th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Actions</th>

                </tr>

              </thead>

              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center">
                      <LoadingSpinner />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center">
                      <ErrorMessage error={error} />
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      No stock movements found for the selected period.
                    </td>
                  </tr>
                ) : (
                  movements.map((movement) => {

                  const { Icon, color } = getMovementIcon(movement.type);

                  return (

                    <tr key={movement.id} className="hover:bg-gray-50">

                      <td className="px-4 py-3 text-sm text-gray-600">

                        {new Date(movement.timestamp).toLocaleTimeString('en-US', {

                          hour: '2-digit',

                          minute: '2-digit'

                        })}

                      </td>

                      <td className="px-4 py-3">

                        <div className="flex items-center gap-2">

                          <div className={`p-1 rounded ${
                            color === 'green' ? 'bg-green-100' :
                            color === 'blue' ? 'bg-blue-100' :
                            color === 'purple' ? 'bg-purple-100' :
                            color === 'orange' ? 'bg-orange-100' :
                            color === 'indigo' ? 'bg-indigo-100' :
                            'bg-yellow-100'
                          }`}>

                            <Icon className={`w-3 h-3 ${
                              color === 'green' ? 'text-green-600' :
                              color === 'blue' ? 'text-blue-600' :
                              color === 'purple' ? 'text-purple-600' :
                              color === 'orange' ? 'text-orange-600' :
                              color === 'indigo' ? 'text-indigo-600' :
                              'text-yellow-600'
                            }`} />

                          </div>

                          {getMovementBadge(movement.type)}

                        </div>

                      </td>

                      <td className="px-4 py-3">

                        <p className="text-sm font-medium text-gray-900">{movement.product}</p>

                        <p className="text-xs text-gray-500">SKU: {movement.sku}</p>

                      </td>

                      <td className="px-4 py-3">

                        <p className={`text-sm font-medium ${

                          movement.quantity > 0 ? 'text-green-600' : 'text-red-600'

                        }`}>

                          {movement.quantity > 0 ? '+' : ''}{movement.quantity} {movement.unit}

                        </p>

                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">

                        {movement.from}

                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">

                        {movement.to}

                      </td>

                      <td className="px-4 py-3">

                        <p className={`text-sm font-medium ${

                          movement.value > 0 ? 'text-gray-900' : 'text-red-600'

                        }`}>

                          RWF {Math.abs(movement.value).toLocaleString()}

                        </p>

                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600">

                        {movement.user}

                      </td>

                      <td className="px-4 py-3 text-sm text-blue-600 font-medium">

                        {movement.reference}

                      </td>

                      <td className="px-4 py-3">

                        <button className="text-blue-600 hover:text-blue-700">

                          <Eye className="w-4 h-4" />

                        </button>

                      </td>

                    </tr>

                  );
                  })
                )}

              </tbody>

            </table>

          </div>

          {/* Pagination */}

          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">

            <p className="text-sm text-gray-600">

              Showing 1-{movements.length} of {movements.length} movements

            </p>

            <div className="flex gap-2">

              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">

                Previous

              </button>

              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">

                Next

              </button>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

};

export default StockMovements;

