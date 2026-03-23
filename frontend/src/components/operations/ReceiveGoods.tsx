"use client";

import React, { useState, useEffect } from 'react';

import { 

  PackageCheck, Search, Filter, Calendar, Truck, 

  CheckCircle, AlertTriangle, FileText, Printer,

  Camera, Plus, Minus, Save, X, Eye

} from 'lucide-react';

import { api } from "@/lib/api";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";

const ReceiveGoods: React.FC = () => {

  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [receivingItems, setReceivingItems] = useState<any[]>([]);
  const [showQualityCheck, setShowQualityCheck] = useState(false);
  const [pendingPOs, setPendingPOs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    expectedToday: { count: 0, totalAmount: 0 },
    expectedThisWeek: { count: 0, totalAmount: 0 },
    overdue: { count: 0, totalAmount: 0 },
    partialReceipts: { count: 0 }
  });

  useEffect(() => {
    loadPurchaseOrders();
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get<any>("/operations/receiving/stats");
      if (response.error) {
        console.error("Failed to load receiving stats:", response.error);
        return;
      }
      if (response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error("Error loading receiving stats:", err);
    }
  };

  const loadPurchaseOrders = async () => {
    setLoading(true);
    setError(null);

    const response = await api.get<any[]>("/operations/receiving/purchase-orders");

    if (response.error) {
      // Handle 500 errors gracefully - don't show error for backend issues
      if (response.details?.status === 500) {
        setPendingPOs([]);
        setLoading(false);
        return;
      }
      setError(response.error);
      setLoading(false);
      return;
    }

    // Transform API data
    const transformed = (response.data || []).map((po: any) => ({
      id: po.po_number || `PO-${po.po_id}`,
      po_id: po.po_id,
      supplier: po.supplier_name || 'Unknown',
      contact: '',
      expectedDate: po.expected_date || po.order_date,
      orderDate: po.order_date,
      totalValue: `RWF ${(po.total_amount || 0).toLocaleString()}`,
      itemCount: po.item_count || 0,
      status: po.status,
      priority: po.expected_date && new Date(po.expected_date) <= new Date() ? 'high' : 'medium',
      items: [] // Will be loaded when PO is selected
    }));

    setPendingPOs(transformed);
    setLoading(false);
  };

  const loadPODetails = async (poId: number) => {
    const response = await api.get<any>(`/operations/receiving/purchase-orders/${poId}`);

    if (response.error) {
      // Handle 500 errors gracefully - don't show error for backend issues
      if (response.details?.status === 500) {
        setError(null);
        return;
      }
      setError(response.error);
      return;
    }

    const po = response.data;
    const transformed = {
      id: po.po_number || `PO-${po.po_id}`,
      po_id: po.po_id,
      supplier: po.supplier_name || 'Unknown',
      contact: po.supplier_phone || '',
      expectedDate: po.expected_date || po.order_date,
      orderDate: po.order_date,
      totalValue: `RWF ${(po.total_amount || 0).toLocaleString()}`,
      itemCount: po.items?.length || 0,
      status: po.status,
      priority: po.expected_date && new Date(po.expected_date) <= new Date() ? 'high' : 'medium',
      items: (po.items || []).map((item: any) => ({
        po_item_id: item.item_id,
        sku: item.sku || 'N/A',
        name: item.product_name,
        ordered: item.quantity,
        received: item.received_qty || 0,
        pending: item.pending_qty || item.quantity,
        unit: item.unit_symbol || 'unit',
        price: item.unit_price || 0
      }))
    };

    setSelectedPO(transformed);
    setReceivingItems(transformed.items.map((item: any) => ({
      ...item,
      receivingQty: item.pending,
      condition: 'good',
      location: '',
      qualityCheck: false
    })));
  };

  const handleSelectPO = (po: any) => {
    loadPODetails(po.po_id);
  };

  const handleSubmitReceipt = async () => {
    if (!selectedPO) return;

    setSubmitting(true);
    setError(null);

    const receiptData = {
      po_id: selectedPO.po_id,
      receipt_date: new Date().toISOString().split('T')[0],
      received_by: 'Current User', // Get from auth store
      items: receivingItems.map(item => ({
        po_item_id: item.po_item_id,
        quantity_received: item.receivingQty,
        location_id: item.location,
        condition: item.condition
      }))
    };

    const response = await api.post("/operations/receiving/goods-receipts", receiptData);

    if (response.error) {
      setError(response.error);
      setSubmitting(false);
      return;
    }

    // Reset and reload
    setSelectedPO(null);
    setReceivingItems([]);
    loadPurchaseOrders();
    loadStats();
    setSubmitting(false);
  };




  const handleStartReceiving = (po: any) => {
    handleSelectPO(po);
  };



  const updateReceivingQty = (index: number, value: string) => {
    const updated = [...receivingItems];
    const qty = parseFloat(value) || 0;
    updated[index].receivingQty = qty;
    updated[index].variance = qty - (updated[index].ordered - updated[index].received);
    setReceivingItems(updated);
  };



  const updateCondition = (index: number, condition: string) => {

    const updated = [...receivingItems];

    updated[index].condition = condition;

    setReceivingItems(updated);

  };



  const calculateTotalVariance = () => {

    return receivingItems.reduce((sum, item) => {

      return sum + (item.variance * item.price);

    }, 0);

  };



  const handleCompleteReceipt = () => {
    handleSubmitReceipt();
  };



  if (loading && !selectedPO) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !selectedPO) {
    return (
      <div className="h-screen flex items-center justify-center">
        <ErrorMessage error={error} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {error && (
        <div className="mx-6 mt-4">
          <ErrorMessage error={error} />
        </div>
      )}

      {/* Header */}

      <div className="bg-white border-b border-gray-200 px-6 py-4">

        <div className="flex items-center justify-between">

          <div>

            <h1 className="text-2xl font-bold text-gray-900">Receive Goods</h1>

            <p className="text-sm text-gray-500">Process incoming shipments and update inventory</p>

          </div>

          <div className="flex gap-3">

            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">

              <Filter className="w-4 h-4" />

              Filter

            </button>

            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">

              <Printer className="w-4 h-4" />

              Print List

            </button>

          </div>

        </div>

      </div>



      <div className="flex-1 overflow-y-auto p-6">

        {!selectedPO ? (

          // PO Selection View

          <div className="space-y-6">

            {/* Summary Cards */}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

              <div className="bg-white border border-gray-200 rounded-lg p-4">

                <p className="text-sm text-gray-600 mb-1">Expected Today</p>

                <p className="text-2xl font-bold text-gray-900">{stats.expectedToday.count}</p>

                <p className="text-sm text-gray-500">RWF {stats.expectedToday.totalAmount.toLocaleString()}</p>

              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">

                <p className="text-sm text-gray-600 mb-1">Expected This Week</p>

                <p className="text-2xl font-bold text-gray-900">{stats.expectedThisWeek.count}</p>

                <p className="text-sm text-gray-500">RWF {stats.expectedThisWeek.totalAmount.toLocaleString()}</p>

              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">

                <p className="text-sm text-gray-600 mb-1">Overdue</p>

                <p className="text-2xl font-bold text-red-600">{stats.overdue.count}</p>

                <p className="text-sm text-gray-500">RWF {stats.overdue.totalAmount.toLocaleString()}</p>

              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">

                <p className="text-sm text-gray-600 mb-1">Partial Receipts</p>

                <p className="text-2xl font-bold text-yellow-600">{stats.partialReceipts.count}</p>

                <p className="text-sm text-gray-500">Needs completion</p>

              </div>

            </div>



            {/* Search and Filters */}

            <div className="bg-white border border-gray-200 rounded-lg p-4">

              <div className="flex gap-3">

                <div className="flex-1 relative">

                  <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />

                  <input

                    type="text"

                    placeholder="Search by PO number, supplier, or SKU..."

                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                  />

                </div>

                <select className="px-4 py-2 border border-gray-300 rounded-lg">

                  <option>All Suppliers</option>

                  <option>Zirakamwa ltd</option>

                  <option>Ishyo farm</option>

                </select>

                <select className="px-4 py-2 border border-gray-300 rounded-lg">

                  <option>Expected Date</option>

                  <option>Today</option>

                  <option>This Week</option>

                  <option>Overdue</option>

                </select>

              </div>

            </div>



            {/* Purchase Orders List */}

            <div className="bg-white border border-gray-200 rounded-lg">

              <div className="px-4 py-3 border-b border-gray-200">

                <h2 className="font-semibold text-gray-900">Purchase Orders Ready to Receive</h2>

              </div>

              <div className="divide-y divide-gray-200">

                {pendingPOs.map((po) => (

                  <div key={po.id} className="p-4 hover:bg-gray-50">

                    <div className="flex items-start justify-between">

                      <div className="flex-1">

                        <div className="flex items-center gap-3 mb-2">

                          <h3 className="font-semibold text-gray-900">{po.id}</h3>

                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${

                            po.priority === 'high' 

                              ? 'bg-red-100 text-red-700'

                              : po.priority === 'medium'

                              ? 'bg-yellow-100 text-yellow-700'

                              : 'bg-gray-100 text-gray-700'

                          }`}>

                            {po.priority.toUpperCase()}

                          </span>

                          <span className="text-sm text-gray-500">

                            Expected: {new Date(po.expectedDate).toLocaleDateString()}

                          </span>

                        </div>

                        

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">

                          <div>

                            <p className="text-xs text-gray-500">Supplier</p>

                            <p className="text-sm font-medium text-gray-900">{po.supplier}</p>

                            <p className="text-xs text-gray-500">{po.contact}</p>

                          </div>

                          <div>

                            <p className="text-xs text-gray-500">Order Date</p>

                            <p className="text-sm font-medium text-gray-900">

                              {new Date(po.orderDate).toLocaleDateString()}

                            </p>

                          </div>

                          <div>

                            <p className="text-xs text-gray-500">Items</p>

                            <p className="text-sm font-medium text-gray-900">{po.itemCount} items</p>

                          </div>

                          <div>

                            <p className="text-xs text-gray-500">Total Value</p>

                            <p className="text-sm font-medium text-gray-900">{po.totalValue}</p>

                          </div>

                        </div>



                        <div className="flex gap-2">

                          <button

                            onClick={() => handleStartReceiving(po)}

                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"

                          >

                            <PackageCheck className="w-4 h-4" />

                            Start Receiving

                          </button>

                          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">

                            <Eye className="w-4 h-4" />

                            View PO

                          </button>

                          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">

                            <Printer className="w-4 h-4" />

                            Print

                          </button>

                        </div>

                      </div>

                    </div>

                  </div>

                ))}

              </div>

            </div>

          </div>

        ) : (

          // Receiving Form View

          <div className="space-y-6">

            {/* Header Info */}

            <div className="bg-white border border-gray-200 rounded-lg p-6">

              <div className="flex items-start justify-between mb-4">

                <div>

                  <h2 className="text-xl font-bold text-gray-900 mb-1">

                    Receiving: {selectedPO.id}

                  </h2>

                  <p className="text-sm text-gray-600">

                    Supplier: {selectedPO.supplier} • Contact: {selectedPO.contact}

                  </p>

                </div>

                <button

                  onClick={() => {

                    setSelectedPO(null);

                    setReceivingItems([]);

                  }}

                  className="text-gray-400 hover:text-gray-600"

                >

                  <X className="w-6 h-6" />

                </button>

              </div>



              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-1">

                    Receipt Date *

                  </label>

                  <input

                    type="date"

                    defaultValue={new Date().toISOString().split('T')[0]}

                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"

                  />

                </div>

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-1">

                    Received By *

                  </label>

                  <input

                    type="text"

                    defaultValue="Current User"

                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"

                  />

                </div>

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-1">

                    Delivery Note #

                  </label>

                  <input

                    type="text"

                    placeholder="Enter delivery note number"

                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"

                  />

                </div>

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-1">

                    Carrier/Transport

                  </label>

                  <input

                    type="text"

                    placeholder="Enter carrier name"

                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"

                  />

                </div>

              </div>

            </div>



            {/* Items Table */}

            <div className="bg-white border border-gray-200 rounded-lg">

              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">

                <h3 className="font-semibold text-gray-900">Items to Receive</h3>

                <button

                  onClick={() => setShowQualityCheck(!showQualityCheck)}

                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"

                >

                  {showQualityCheck ? 'Hide' : 'Show'} Quality Inspection

                </button>

              </div>

              

              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead className="bg-gray-50 border-b border-gray-200">

                    <tr>

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">SKU</th>

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Item</th>

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Ordered</th>

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Receiving</th>

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Variance</th>

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Condition</th>

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Location</th>

                      {showQualityCheck && (

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Quality</th>

                      )}

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Notes</th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-gray-200">

                    {receivingItems.map((item, idx) => (

                      <tr key={idx} className="hover:bg-gray-50">

                        <td className="px-4 py-3 text-sm font-medium text-gray-900">

                          {item.sku}

                        </td>

                        <td className="px-4 py-3 text-sm text-gray-900">

                          {item.name}

                          <p className="text-xs text-gray-500">{item.unit}</p>

                        </td>

                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">

                          {item.ordered}

                        </td>

                        <td className="px-4 py-3">

                          <input

                            type="number"

                            value={item.receivingQty || 0}

                            onChange={(e) => updateReceivingQty(idx, e.target.value)}

                            className="w-20 px-2 py-1 border border-gray-300 rounded"

                            min="0"

                          />

                        </td>

                        <td className="px-4 py-3 text-sm">

                          <span className={`font-medium ${

                            item.variance < 0 ? 'text-red-600' : 

                            item.variance > 0 ? 'text-green-600' : 

                            'text-gray-600'

                          }`}>

                            {item.variance > 0 ? '+' : ''}{item.variance}

                          </span>

                        </td>

                        <td className="px-4 py-3">

                          <select

                            value={item.condition}

                            onChange={(e) => updateCondition(idx, e.target.value)}

                            className={`px-2 py-1 text-xs rounded border ${

                              item.condition === 'good' 

                                ? 'border-green-300 bg-green-50 text-green-700'

                                : item.condition === 'damaged'

                                ? 'border-red-300 bg-red-50 text-red-700'

                                : 'border-yellow-300 bg-yellow-50 text-yellow-700'

                            }`}

                          >

                            <option value="good">Good</option>

                            <option value="damaged">Damaged</option>

                            <option value="partial">Partial</option>

                          </select>

                        </td>

                        <td className="px-4 py-3">

                          <select className="px-2 py-1 text-sm border border-gray-300 rounded">

                            <option>Main Warehouse</option>

                            <option>Factory Storage</option>

                            <option>Downtown Store</option>

                          </select>

                        </td>

                        {showQualityCheck && (

                          <td className="px-4 py-3">

                            <select className="px-2 py-1 text-xs border border-gray-300 rounded">

                              <option value="pass">✓ Pass</option>

                              <option value="fail">✗ Fail</option>

                              <option value="hold">⚠ Hold</option>

                            </select>

                          </td>

                        )}

                        <td className="px-4 py-3">

                          <input

                            type="text"

                            placeholder="Add notes..."

                            className="w-32 px-2 py-1 text-sm border border-gray-300 rounded"

                          />

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </div>



            {/* Summary and Actions */}

            <div className="bg-white border border-gray-200 rounded-lg p-6">

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

                <div>

                  <p className="text-sm text-gray-600 mb-1">Total Ordered</p>

                  <p className="text-2xl font-bold text-gray-900">

                    {receivingItems.reduce((sum, item) => sum + item.ordered, 0)}

                  </p>

                  <p className="text-sm text-gray-500">{selectedPO.totalValue}</p>

                </div>

                <div>

                  <p className="text-sm text-gray-600 mb-1">Total Receiving</p>

                  <p className="text-2xl font-bold text-gray-900">

                    {receivingItems.reduce((sum, item) => sum + item.actualQty, 0)}

                  </p>

                </div>

                <div>

                  <p className="text-sm text-gray-600 mb-1">Value Variance</p>

                  <p className={`text-2xl font-bold ${

                    calculateTotalVariance() < 0 ? 'text-red-600' : 

                    calculateTotalVariance() > 0 ? 'text-green-600' : 

                    'text-gray-900'

                  }`}>

                    RWF {Math.abs(calculateTotalVariance()).toLocaleString()}

                  </p>

                  <p className="text-sm text-gray-500">

                    {calculateTotalVariance() < 0 ? 'Short' : calculateTotalVariance() > 0 ? 'Over' : 'Exact'}

                  </p>

                </div>

              </div>



              <div className="border-t border-gray-200 pt-6">

                <label className="block text-sm font-medium text-gray-700 mb-2">

                  Receipt Notes (Optional)

                </label>

                <textarea

                  rows={3}

                  placeholder="Add any notes about this receipt..."

                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"

                />

              </div>



              <div className="flex gap-3 mt-6">

                <button

                  onClick={handleCompleteReceipt}

                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"

                >

                  <CheckCircle className="w-5 h-5" />

                  Complete Receipt & Post to Inventory

                </button>

                <button className="flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium">

                  <Save className="w-5 h-5" />

                  Save as Draft

                </button>

                <button

                  onClick={() => {

                    setSelectedPO(null);

                    setReceivingItems([]);

                  }}

                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"

                >

                  Cancel

                </button>

              </div>

            </div>

          </div>

        )}

      </div>

    </div>

  );

};

export default ReceiveGoods;

