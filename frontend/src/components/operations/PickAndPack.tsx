"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';

import { 

  PackageCheck, Search, Filter, Printer, CheckCircle,

  AlertTriangle, MapPin, Package, User, Calendar,

  Truck, BarChart, X, Eye, Camera, Clock, RefreshCw

} from 'lucide-react';

interface SalesOrder {
  id: string;
  so_id?: number;
  so_number?: string;
  customer: string;
  contact: string;
  orderDate: string;
  dueDate: string;
  priority: 'urgent' | 'high' | 'normal';
  totalValue: string;
  itemCount: number;
  status: string;
  shippingAddress: string;
  items?: OrderItem[];
  currency?: string;
  created_by?: number | null;
  created_by_name?: string | null;
  created_at?: string | null;
}

interface OrderItem {
  sku: string;
  variant_sku?: string;
  product_name?: string;
  variant_name?: string | null;
  name: string;
  ordered: number;
  quantity_ordered?: number;
  unit: string;
  location: string;
  picked?: number;
  packed?: number;
  pickedQty?: number;
  verified?: boolean;
  box?: string;
  so_item_id?: number;
  product_id?: number;
  variant_id?: number;
  available_qty?: number;
  unit_price?: number;
  value?: number;
  product_type?: string;
  category_id?: number;
  category_name?: string;
  size?: number;
  size_unit?: string;
  base_unit?: string;
  package_unit?: string;
  units_per_package?: number;
  packages_in_stock?: number;
  loose_units?: number;
  packages?: number;
  loose_units_ordered?: number;
  total_quantity_in_base_units?: number;
  average_cost?: number;
  cost_value?: number;
  selling_price?: number;
  potential_revenue?: number;
  weight?: number; // Weight per unit in kg
  quantity_allocated?: number;
  quantity_shipped?: number;
}

const PickAndPack = () => {

  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [pickingItems, setPickingItems] = useState<OrderItem[]>([]);
  const [currentStep, setCurrentStep] = useState('pick'); // pick, verify, pack, ship
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packingData, setPackingData] = useState({
    numberOfBoxes: 1,
    totalWeight: 0,
    packingNotes: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [customers, setCustomers] = useState<string[]>([]);
  const [stats, setStats] = useState({
    readyToPick: 0,
    pickingInProgress: 0,
    readyToShip: 0,
    awaitingStock: 0
  });
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [orderDetails, setOrderDetails] = useState<SalesOrder | null>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);



  // Load sales orders from API
  useEffect(() => {
    loadSalesOrders();
  }, []);

  const loadSalesOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<SalesOrder[]>('/operations/pick-pack/sales-orders');
      
      if (response.error) {
        setError(response.error);
        setSalesOrders([]);
        setLoading(false);
        return;
      }

      const orders = Array.isArray(response.data) ? response.data : [];
      setSalesOrders(orders);
      
      // Extract unique customers
      const uniqueCustomers = [...new Set(orders.map((order: SalesOrder) => order.customer))];
      setCustomers(uniqueCustomers);

      // Calculate stats
      const readyToPick = orders.filter((o: SalesOrder) => o.status === 'confirmed').length;
      const pickingInProgress = orders.filter((o: SalesOrder) => o.status === 'allocated').length;
      const readyToShip = 0; // Will be calculated from shipped status
      const awaitingStock = 0; // Can be calculated based on stock availability
      
      setStats({
        readyToPick,
        pickingInProgress,
        readyToShip,
        awaitingStock
      });
    } catch (err: any) {
      console.error('Error loading sales orders:', err);
      setError(err?.message || 'Failed to load sales orders');
      setSalesOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return (salesOrders || []).filter((order: SalesOrder) => {
      const matchesSearch = !searchTerm || 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.so_number?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCustomer = customerFilter === 'all' || order.customer === customerFilter;
      const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter;
      
      return matchesSearch && matchesCustomer && matchesPriority;
    });
  }, [salesOrders, searchTerm, customerFilter, priorityFilter]);



  const handleStartPicking = async (order: SalesOrder) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch order details with items
      const response = await api.get<SalesOrder>(`/operations/pick-pack/sales-orders/${order.so_id || order.id}`);
      
      if (response.error) {
        setError(response.error);
        setLoading(false);
        return;
      }

      const orderDetails = response.data;
      if (!orderDetails) {
        setError('Order details not found');
        setLoading(false);
        return;
      }
      
      const itemsToPick = (orderDetails.items || []).map((item: OrderItem) => ({
        ...item,
        // Map backend fields to frontend fields
        name: item.product_name || item.name,
        ordered: item.quantity_ordered || item.ordered || 0,
        sku: item.variant_sku || item.sku,
        pickedQty: 0,
        verified: false,
        box: '',
        so_item_id: item.so_item_id
      }));

      setPickingItems(itemsToPick);
      setSelectedOrder(orderDetails);
      setCurrentStep('pick');
    } catch (err: any) {
      console.error('Error loading order details:', err);
      setError(err?.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };



  const updatePickedQty = (index: number, value: string) => {

    const updated = [...pickingItems];

    updated[index].pickedQty = parseInt(value) || 0;

    setPickingItems(updated);

  };



  const handleVerifyItem = (index: number) => {

    const updated = [...pickingItems];

    updated[index].verified = !updated[index].verified;

    setPickingItems(updated);

  };



  const allItemsPicked = () => {

    return pickingItems.every(item => (item.pickedQty || 0) >= (item.ordered || item.quantity_ordered || 0));

  };

  // Check if at least some items have been picked (allows partial picking)
  const hasAnyItemsPicked = () => {
    return pickingItems.some(item => (item.pickedQty || 0) > 0);
  };



  const allItemsVerified = () => {
    return pickingItems.every(item => item.verified);
  };

  // Check if at least some items have been verified (allows partial verification)
  const hasAnyItemsVerified = () => {
    return pickingItems.some(item => item.verified);
  };

  // Check if at least some items have been picked (for allowing progression)
  const hasAnyPickedItems = () => {
    return pickingItems.some(item => (item.pickedQty || 0) > 0);
  };

  // Calculate packing data when entering pack step
  useEffect(() => {
    if (currentStep === 'pack' && pickingItems.length > 0) {
      // Calculate number of boxes from picked items
      let totalBoxes = 0;
      pickingItems.forEach(item => {
        if ((item.pickedQty || 0) > 0) {
          if (item.product_type === 'packaged' && item.units_per_package && item.units_per_package > 0) {
            // For packaged products, calculate boxes needed
            const packages = Math.ceil((item.pickedQty || 0) / item.units_per_package);
            totalBoxes += packages;
          } else {
            // For bulk products or items without package info, count as 1 box per item type
            totalBoxes += 1;
          }
        }
      });
      const calculatedBoxes = Math.max(1, totalBoxes);

      // Calculate total weight from picked items (if weight data is available)
      let totalWeight = 0;
      pickingItems.forEach(item => {
        if ((item.pickedQty || 0) > 0 && item.weight) {
          totalWeight += (item.weight || 0) * (item.pickedQty || 0);
        }
      });

      // Generate packing notes from order and items
      const notes = [];
      if (selectedOrder) {
        notes.push(`Order: ${selectedOrder.so_number || selectedOrder.id}`);
        notes.push(`Customer: ${selectedOrder.customer}`);
      }
      
      const pickedItems = pickingItems.filter(item => (item.pickedQty || 0) > 0);
      if (pickedItems.length > 0) {
        notes.push(`\nPicked Items (${pickedItems.length}):`);
        pickedItems.forEach(item => {
          const qty = item.pickedQty || 0;
          const ordered = item.ordered || item.quantity_ordered || 0;
          if (qty < ordered) {
            notes.push(`- ${item.product_name || item.name}: ${qty} of ${ordered} (partial)`);
          } else {
            notes.push(`- ${item.product_name || item.name}: ${qty}`);
          }
        });
      }

      const generatedNotes = notes.join('\n');
      
      // Only update if values have changed to avoid unnecessary re-renders
      setPackingData(prev => {
        // Check if we need to update (avoid overwriting user edits)
        if (prev.numberOfBoxes === 1 && calculatedBoxes !== 1) {
          return {
            numberOfBoxes: calculatedBoxes,
            totalWeight: totalWeight,
            packingNotes: generatedNotes
          };
        } else if (prev.packingNotes === '' && generatedNotes !== '') {
          return {
            ...prev,
            totalWeight: totalWeight > 0 ? totalWeight : prev.totalWeight,
            packingNotes: generatedNotes
          };
        } else if (prev.numberOfBoxes === 1 && calculatedBoxes > 1) {
          return {
            numberOfBoxes: calculatedBoxes,
            totalWeight: totalWeight > 0 ? totalWeight : prev.totalWeight,
            packingNotes: prev.packingNotes || generatedNotes
          };
        }
        return prev;
      });
    }
  }, [currentStep, pickingItems.length, selectedOrder?.so_id, selectedOrder?.id]);

  const handleSavePickedQuantities = async () => {
    if (!selectedOrder) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const items = pickingItems.map(item => ({
        so_item_id: item.so_item_id,
        picked_qty: item.pickedQty || 0,
        packed_qty: item.packed || 0
      }));

      const response = await api.put(`/operations/pick-pack/sales-orders/${selectedOrder.so_id || selectedOrder.id}/pick`, { items });
      
      if (response.error) {
        setError(response.error);
        setLoading(false);
        return;
      }
      
      // Reload orders
      await loadSalesOrders();
      
      // Show success message or move to next step
      if (allItemsPicked()) {
        setCurrentStep('verify');
      }
    } catch (err: any) {
      console.error('Error saving picked quantities:', err);
      setError(err?.message || 'Failed to save picked quantities');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPickList = async (order: SalesOrder) => {
    try {
      setLoadingOrderDetails(true);
      
      // Fetch order details if not already loaded
      let orderToPrint = order;
      if (!order.items || order.items.length === 0) {
        const response = await api.get<SalesOrder>(`/operations/pick-pack/sales-orders/${order.so_id || order.id}`);
        if (response.error || !response.data) {
          setError(response.error || 'Failed to load order details for printing');
          setLoadingOrderDetails(false);
          return;
        }
        orderToPrint = response.data;
      }
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setLoadingOrderDetails(false);
        return;
      }
      
      const printContent = `
        <html>
          <head>
            <title>Pick List - ${orderToPrint.id}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; }
              .info { margin-bottom: 15px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>Pick List - ${orderToPrint.id}</h1>
            <div class="info">
              <p><strong>Customer:</strong> ${orderToPrint.customer}</p>
              <p><strong>Contact:</strong> ${orderToPrint.contact || 'N/A'}</p>
              <p><strong>Order Date:</strong> ${orderToPrint.orderDate}</p>
              <p><strong>Due Date:</strong> ${orderToPrint.dueDate}</p>
              <p><strong>Shipping Address:</strong> ${orderToPrint.shippingAddress}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Item</th>
                  <th>Location</th>
                  <th>Ordered</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                ${(orderToPrint.items || []).map((item: OrderItem) => `
                  <tr>
                    <td>${item.sku}</td>
                    <td>${item.name}</td>
                    <td>${item.location}</td>
                    <td>${item.ordered}</td>
                    <td>${item.unit}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      setLoadingOrderDetails(false);
    } catch (err: any) {
      console.error('Error printing pick list:', err);
      setError(err?.message || 'Failed to print pick list');
      setLoadingOrderDetails(false);
    }
  };

  const handleViewOrder = async (order: SalesOrder) => {
    try {
      setLoadingOrderDetails(true);
      setError(null);
      
      // Fetch order details
      const response = await api.get<SalesOrder>(`/operations/pick-pack/sales-orders/${order.so_id || order.id}`);
      
      if (response.error) {
        setError(response.error);
        setLoadingOrderDetails(false);
        return;
      }

      if (!response.data) {
        setError('Order details not found');
        setLoadingOrderDetails(false);
        return;
      }

      setOrderDetails(response.data);
      setShowOrderDetailsModal(true);
      setLoadingOrderDetails(false);
    } catch (err: any) {
      console.error('Error loading order details:', err);
      setError(err?.message || 'Failed to load order details');
      setLoadingOrderDetails(false);
    }
  };



  return (

    <div className="h-screen flex flex-col bg-gray-50">

      {/* Header */}

      <div className="bg-white border-b border-gray-200 px-6 py-4">

        <div className="flex items-center justify-between">

          <div>

            <h1 className="text-2xl font-bold text-gray-900">Pick & Pack</h1>

            <p className="text-sm text-gray-500">Fulfill sales orders and prepare for shipping</p>

          </div>

          <div className="flex gap-3">

            <button 
              onClick={loadSalesOrders}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >

              <RefreshCw className="w-4 h-4" />

              Refresh

            </button>

            {selectedOrder && (
              <button 
                onClick={() => handlePrintPickList(selectedOrder)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >

              <Printer className="w-4 h-4" />

              Print Pick List

              </button>
            )}

          </div>

        </div>

      </div>



      <div className="flex-1 overflow-y-auto p-6">

        {loading && !selectedOrder && <LoadingSpinner />}
        {error && !selectedOrder && <ErrorMessage error={error} />}

        {!selectedOrder && !loading && (

          // Order Selection View

          <div className="space-y-6">

            {/* Summary Cards */}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

              <div className="bg-white border border-gray-200 rounded-lg p-4">

                <p className="text-sm text-gray-600 mb-1">Ready to Pick</p>

                <p className="text-2xl font-bold text-gray-900">{stats.readyToPick}</p>

                <p className="text-sm text-gray-500">
                  {filteredOrders.filter((o: SalesOrder) => o.status === 'confirmed')
                    .reduce((sum: number, o: SalesOrder) => sum + parseFloat(o.totalValue.replace(/[^\d.]/g, '') || '0'), 0).toLocaleString()} RWF
                </p>

              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">

                <p className="text-sm text-gray-600 mb-1">Picking in Progress</p>

                <p className="text-2xl font-bold text-yellow-600">{stats.pickingInProgress}</p>

                <p className="text-sm text-gray-500">
                  {filteredOrders.filter((o: SalesOrder) => o.status === 'allocated')
                    .reduce((sum: number, o: SalesOrder) => sum + parseFloat(o.totalValue.replace(/[^\d.]/g, '') || '0'), 0).toLocaleString()} RWF
                </p>

              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">

                <p className="text-sm text-gray-600 mb-1">Ready to Ship</p>

                <p className="text-2xl font-bold text-green-600">{stats.readyToShip}</p>

                <p className="text-sm text-gray-500">RWF 0</p>

              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">

                <p className="text-sm text-gray-600 mb-1">Awaiting Stock</p>

                <p className="text-2xl font-bold text-red-600">{stats.awaitingStock}</p>

                <p className="text-sm text-gray-500">RWF 0</p>

              </div>

            </div>



            {/* Search */}

            <div className="bg-white border border-gray-200 rounded-lg p-4">

              <div className="flex gap-3">

                <div className="flex-1 relative">

                  <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />

                  <input

                    type="text"

                    placeholder="Search by order number, customer, or SKU..."

                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                  />

                </div>

                <select 
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >

                  <option value="all">All Customers</option>

                  {customers.map(customer => (
                    <option key={customer} value={customer}>{customer}</option>
                  ))}

                </select>

                <select 
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >

                  <option value="all">All Priorities</option>

                  <option value="urgent">Urgent</option>

                  <option value="high">High</option>

                  <option value="normal">Normal</option>

                </select>

              </div>

            </div>



            {/* Orders List */}

            <div className="bg-white border border-gray-200 rounded-lg">

              <div className="px-4 py-3 border-b border-gray-200">

                <h2 className="font-semibold text-gray-900">Sales Orders Ready to Pick</h2>

              </div>

              <div className="divide-y divide-gray-200">

                {filteredOrders.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No orders found matching your criteria.
                  </div>
                ) : (
                  filteredOrders.map((order: SalesOrder) => (

                  <div key={order.id} className="p-4 hover:bg-gray-50">

                    <div className="flex items-start justify-between">

                      <div className="flex-1">

                        <div className="flex items-center gap-3 mb-2">

                          <h3 className="font-semibold text-gray-900">{order.id}</h3>

                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${

                            order.priority === 'urgent' 

                              ? 'bg-red-100 text-red-700'

                              : order.priority === 'high'

                              ? 'bg-orange-100 text-orange-700'

                              : 'bg-gray-100 text-gray-700'

                          }`}>

                            {order.priority.toUpperCase()}

                          </span>

                          <span className="flex items-center gap-1 text-sm text-gray-500">

                            <Clock className="w-4 h-4" />

                            Due: {new Date(order.dueDate).toLocaleDateString()}

                          </span>

                        </div>

                        

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">

                          <div>

                            <p className="text-xs text-gray-500">Customer</p>

                            <p className="text-sm font-medium text-gray-900">{order.customer}</p>

                            <p className="text-xs text-gray-500">{order.contact}</p>

                          </div>

                          <div>

                            <p className="text-xs text-gray-500">Ship To</p>

                            <p className="text-sm font-medium text-gray-900">{order.shippingAddress}</p>

                          </div>

                          <div>

                            <p className="text-xs text-gray-500">Items</p>

                            <p className="text-sm font-medium text-gray-900">{order.itemCount} items</p>

                          </div>

                          <div>

                            <p className="text-xs text-gray-500">Total Value</p>

                            <p className="text-sm font-medium text-gray-900">{order.totalValue}</p>

                          </div>

                        </div>



                        <div className="flex gap-2">

                          <button

                            onClick={() => handleStartPicking(order)}

                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"

                          >

                            <PackageCheck className="w-4 h-4" />

                            Start Picking

                          </button>

                          <button 
                            onClick={() => handleViewOrder(order)}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >

                            <Eye className="w-4 h-4" />

                            View Order

                          </button>

                          <button 
                            onClick={() => handlePrintPickList(order)}
                            disabled={loadingOrderDetails}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >

                            <Printer className="w-4 h-4" />

                            Print Pick List

                          </button>

                        </div>

                      </div>

                    </div>

                  </div>

                  ))
                )}

              </div>

            </div>

          </div>

        )}

        {selectedOrder && (

          // Picking/Packing View

          <div className="space-y-6">

            {/* Progress Steps */}

            <div className="bg-white border border-gray-200 rounded-lg p-6">

              <div className="flex items-center justify-between mb-4">

                <h2 className="text-xl font-bold text-gray-900">

                  Processing: {selectedOrder.id}

                </h2>

                <button

                  onClick={() => {

                    setSelectedOrder(null);

                    setPickingItems([]);

                    setCurrentStep('pick');

                  }}

                  className="text-gray-400 hover:text-gray-600"

                >

                  <X className="w-6 h-6" />

                </button>

              </div>



              <div className="flex items-center gap-4">

                {[

                  { id: 'pick', label: 'Pick Items', icon: Package },

                  { id: 'verify', label: 'Verify', icon: CheckCircle },

                  { id: 'pack', label: 'Pack', icon: PackageCheck },

                  { id: 'ship', label: 'Ready to Ship', icon: Truck }

                ].map((step, idx, arr) => {

                  const StepIcon = step.icon;

                  const isActive = currentStep === step.id;

                  const isCompleted = arr.findIndex(s => s.id === currentStep) > idx;

                  

                  return (

                    <React.Fragment key={step.id}>

                      <div className="flex items-center gap-2">

                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${

                          isActive ? 'bg-blue-600 text-white' :

                          isCompleted ? 'bg-green-600 text-white' :

                          'bg-gray-200 text-gray-500'

                        }`}>

                          <StepIcon className="w-5 h-5" />

                        </div>

                        <div>

                          <p className={`text-sm font-medium ${

                            isActive ? 'text-blue-600' :

                            isCompleted ? 'text-green-600' :

                            'text-gray-500'

                          }`}>

                            {step.label}

                          </p>

                        </div>

                      </div>

                      {idx < arr.length - 1 && (

                        <div className={`flex-1 h-1 ${

                          isCompleted ? 'bg-green-600' : 'bg-gray-200'

                        }`} />

                      )}

                    </React.Fragment>

                  );

                })}

              </div>

            </div>



            {/* Order Info */}

            <div className="bg-white border border-gray-200 rounded-lg p-6">

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                <div>

                  <p className="text-sm text-gray-600 mb-1">Customer</p>

                  <p className="text-lg font-semibold text-gray-900">{selectedOrder.customer}</p>

                  <p className="text-sm text-gray-500">{selectedOrder.contact}</p>

                </div>

                <div>

                  <p className="text-sm text-gray-600 mb-1">Shipping Address</p>

                  <p className="text-lg font-semibold text-gray-900">{selectedOrder.shippingAddress}</p>

                </div>

                <div>

                  <p className="text-sm text-gray-600 mb-1">Order Value</p>

                  <p className="text-lg font-semibold text-gray-900">{selectedOrder.totalValue}</p>

                  <p className="text-sm text-gray-500">Due: {new Date(selectedOrder.dueDate).toLocaleDateString()}</p>

                </div>

              </div>

            </div>



            {/* Items Table */}

            {currentStep === 'pick' && (

              <div className="bg-white border border-gray-200 rounded-lg">

                <div className="px-4 py-3 border-b border-gray-200">

                  <h3 className="font-semibold text-gray-900">Pick Items from Warehouse</h3>

                </div>

                

                <div className="overflow-x-auto">

                  <table className="w-full">

                    <thead className="bg-gray-50 border-b border-gray-200">

                      <tr>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">#</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">SKU</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Product Name</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Variant</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Location</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Ordered</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Allocated</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Shipped</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Status</th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-gray-200">

                      {pickingItems.map((item, idx) => {

                        // Determine if it's a packaged product
                        const isPackaged = item.product_type === 'packaged' && item.variant_id;
                        const hasSize = item.size && item.size > 0;
                        
                        // Calculate packages and units for packaged products
                        let packages = 0;
                        let looseUnits = 0;
                        let unitsPerPackage = item.units_per_package || 1;
                        
                        if (isPackaged && item.ordered) {
                          packages = Math.floor(item.ordered / unitsPerPackage);
                          looseUnits = item.ordered % unitsPerPackage;
                        }
                        
                        // Format ordered quantity display
                        let orderedDisplay = '';
                        if (isPackaged && hasSize) {
                          if (packages > 0 && looseUnits > 0) {
                            orderedDisplay = `${packages} ${item.package_unit || 'box'}s + ${looseUnits} ${item.base_unit || 'bottle'}s`;
                          } else if (packages > 0) {
                            orderedDisplay = `${packages} ${item.package_unit || 'box'}s`;
                          } else if (looseUnits > 0) {
                            orderedDisplay = `${looseUnits} ${item.base_unit || 'bottle'}s`;
                          } else {
                            orderedDisplay = `${item.ordered} ${item.base_unit || 'bottle'}s`;
                          }
                        } else {
                          orderedDisplay = `${item.ordered} ${item.unit || 'unit'}s`;
                        }
                        
                        // Format picked quantity display (same format as ordered)
                        let pickedDisplay = '';
                        const pickedQty = item.pickedQty || 0;
                        if (isPackaged && hasSize && pickedQty > 0) {
                          const pickedPackages = Math.floor(pickedQty / unitsPerPackage);
                          const pickedLoose = pickedQty % unitsPerPackage;
                          if (pickedPackages > 0 && pickedLoose > 0) {
                            pickedDisplay = `${pickedPackages} ${item.package_unit || 'box'}s + ${pickedLoose} ${item.base_unit || 'bottle'}s`;
                          } else if (pickedPackages > 0) {
                            pickedDisplay = `${pickedPackages} ${item.package_unit || 'box'}s`;
                          } else if (pickedLoose > 0) {
                            pickedDisplay = `${pickedLoose} ${item.base_unit || 'bottle'}s`;
                          } else {
                            pickedDisplay = `${pickedQty} ${item.base_unit || 'bottle'}s`;
                          }
                        } else {
                          pickedDisplay = `${pickedQty} ${item.unit || 'unit'}s`;
                        }
                        
                        return (
                          <tr key={idx} className="hover:bg-gray-50">

                            <td className="px-4 py-3 text-sm font-medium text-gray-500">
                              {idx + 1}
                            </td>

                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {item.sku}
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div>
                                <p className="font-medium">{item.product_name || item.name}</p>
                                {item.category_name && (
                                  <p className="text-xs text-gray-500">{item.category_name}</p>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-700">
                              {item.variant_name ? (
                                <div>
                                  <p className="font-medium">{item.variant_name}</p>
                                  {hasSize && (
                                    <p className="text-xs text-gray-500">
                                      {item.size?.toLocaleString()}{item.size_unit}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">Standard</span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {item.location && item.location !== 'N/A' ? (
                                <div className="flex items-center gap-1 text-sm text-blue-600 font-medium">
                                  <MapPin className="w-4 h-4" />
                                  {item.location}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">Not specified</span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900 font-medium">
                                {orderedDisplay}
                              </div>
                              {isPackaged && hasSize && (
                                <p className="text-xs text-gray-500 mt-1">
                                  ({item.ordered} {item.base_unit || 'bottle'}s total)
                                </p>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={item.pickedQty || ''}
                                  onChange={(e) => updatePickedQty(idx, e.target.value)}
                                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                  min="0"
                                  max={item.ordered}
                                  placeholder="0"
                                />
                                {pickedQty > 0 && (
                                  <span className="text-xs text-gray-500">
                                    {pickedDisplay}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                Allocated: {item.quantity_allocated || 0}
                              </p>
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div>
                                <p className="font-medium">{item.quantity_shipped || 0}</p>
                                <p className="text-xs text-gray-500">
                                  {item.quantity_shipped && item.quantity_allocated 
                                    ? `${((item.quantity_shipped / item.quantity_allocated) * 100).toFixed(0)}% of allocated`
                                    : 'Not shipped'}
                                </p>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              {(() => {
                                const picked = item.pickedQty || 0;
                                const ordered = item.ordered || item.quantity_ordered || 0;
                                if (picked >= ordered && ordered > 0) {
                                  return (
                                    <span className="flex items-center gap-1 text-green-600 text-sm">
                                      <CheckCircle className="w-4 h-4" />
                                      Complete
                                    </span>
                                  );
                                } else if (picked > 0) {
                                  return <span className="text-yellow-600 text-sm">Partial</span>;
                                } else {
                                  return <span className="text-gray-400 text-sm">Pending</span>;
                                }
                              })()}
                            </td>

                          </tr>
                        );
                      })}

                    </tbody>

                  </table>

                </div>



                <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">

                  <div>

                    <div className="text-sm text-gray-600">
                      <p>
                        Progress: {pickingItems.filter(i => (i.pickedQty || 0) >= (i.ordered || i.quantity_ordered || 0)).length} of {pickingItems.length} items fully picked
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {pickingItems.filter(i => (i.pickedQty || 0) > 0 && (i.pickedQty || 0) < (i.ordered || i.quantity_ordered || 0)).length > 0 && 
                          `${pickingItems.filter(i => (i.pickedQty || 0) > 0 && (i.pickedQty || 0) < (i.ordered || i.quantity_ordered || 0)).length} items partially picked - partial deliveries allowed`
                        }
                      </p>
                    </div>

                  </div>

                  <button

                    onClick={async () => {
                      await handleSavePickedQuantities();
                      setCurrentStep('verify');
                    }}

                    disabled={!hasAnyItemsPicked()}

                    className={`px-6 py-2 rounded-lg font-medium ${

                      hasAnyItemsPicked()

                        ? 'bg-blue-600 text-white hover:bg-blue-700'

                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'

                    }`}

                  >

                    Continue to Verify →

                  </button>

                </div>

              </div>

            )}



            {currentStep === 'verify' && (

              <div className="bg-white border border-gray-200 rounded-lg">

                <div className="px-4 py-3 border-b border-gray-200">

                  <h3 className="font-semibold text-gray-900">Verify Picked Items</h3>

                </div>

                

                <div className="p-6 space-y-4">

                  {pickingItems
                    .filter(item => (item.pickedQty || 0) > 0) // Only show items that have been picked
                    .map((item, idx) => {
                      // Find the original index in pickingItems array
                      const originalIdx = pickingItems.findIndex(i => i.so_item_id === item.so_item_id);
                      
                      return (
                        <div key={item.so_item_id || idx} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.product_name || item.name}</p>
                            <p className="text-sm text-gray-500">
                              SKU: {item.variant_sku || item.sku} • 
                              Picked: {item.pickedQty || 0} {item.ordered && item.pickedQty && item.pickedQty < item.ordered 
                                ? `(of ${item.ordered} ordered)` 
                                : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => handleVerifyItem(originalIdx >= 0 ? originalIdx : idx)}
                            className={`px-4 py-2 rounded-lg font-medium ${
                              item.verified
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {item.verified ? '✓ Verified' : 'Verify'}
                          </button>
                        </div>
                      );
                    })}
                  
                  {pickingItems.filter(item => (item.pickedQty || 0) === 0).length > 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> {pickingItems.filter(item => (item.pickedQty || 0) === 0).length} item(s) not picked yet. 
                        You can proceed with partial verification and complete the rest later.
                      </p>
                    </div>
                  )}

                </div>



                <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">

                  <button

                    onClick={() => setCurrentStep('pick')}

                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"

                  >

                    ← Back to Picking

                  </button>

                  <button

                    onClick={() => {
                      // Calculate and set packing data before moving to pack step
                      if (pickingItems.length > 0) {
                        let totalBoxes = 0;
                        pickingItems.forEach(item => {
                          if ((item.pickedQty || 0) > 0) {
                            if (item.product_type === 'packaged' && item.units_per_package && item.units_per_package > 0) {
                              const packages = Math.ceil((item.pickedQty || 0) / item.units_per_package);
                              totalBoxes += packages;
                            } else {
                              totalBoxes += 1;
                            }
                          }
                        });
                        const calculatedBoxes = Math.max(1, totalBoxes);

                        let totalWeight = 0;
                        pickingItems.forEach(item => {
                          if ((item.pickedQty || 0) > 0 && item.weight) {
                            totalWeight += (item.weight || 0) * (item.pickedQty || 0);
                          }
                        });

                        const notes = [];
                        if (selectedOrder) {
                          notes.push(`Order: ${selectedOrder.so_number || selectedOrder.id}`);
                          notes.push(`Customer: ${selectedOrder.customer}`);
                        }
                        
                        const pickedItems = pickingItems.filter(item => (item.pickedQty || 0) > 0);
                        if (pickedItems.length > 0) {
                          notes.push(`\nPicked Items (${pickedItems.length}):`);
                          pickedItems.forEach(item => {
                            const qty = item.pickedQty || 0;
                            const ordered = item.ordered || item.quantity_ordered || 0;
                            if (qty < ordered) {
                              notes.push(`- ${item.product_name || item.name}: ${qty} of ${ordered} (partial)`);
                            } else {
                              notes.push(`- ${item.product_name || item.name}: ${qty}`);
                            }
                          });
                        }

                        setPackingData({
                          numberOfBoxes: calculatedBoxes,
                          totalWeight: totalWeight,
                          packingNotes: notes.join('\n')
                        });
                      }
                      setCurrentStep('pack');
                    }}

                    disabled={!hasAnyPickedItems()}

                    className={`px-6 py-2 rounded-lg font-medium ${

                      hasAnyPickedItems()

                        ? 'bg-blue-600 text-white hover:bg-blue-700'

                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'

                    }`}

                  >

                    Continue to Packing →

                  </button>

                </div>

              </div>

            )}



            {currentStep === 'pack' && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">

                <h3 className="font-semibold text-gray-900 mb-4">Packing Information</h3>

                

                <div className="space-y-4">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div>

                      <label className="block text-sm font-medium text-gray-700 mb-1">

                        Number of Boxes *

                      </label>

                      <input

                        type="number"

                        min="1"

                        value={packingData.numberOfBoxes}

                        onChange={(e) => setPackingData({...packingData, numberOfBoxes: parseInt(e.target.value) || 1})}

                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"

                      />

                      <p className="text-xs text-gray-500 mt-1">
                        Calculated from {pickingItems.filter(i => (i.pickedQty || 0) > 0).length} picked item(s)
                      </p>

                    </div>

                    <div>

                      <label className="block text-sm font-medium text-gray-700 mb-1">

                        Total Weight (kg)

                      </label>

                      <input

                        type="number"

                        step="0.1"

                        value={packingData.totalWeight || ''}

                        onChange={(e) => setPackingData({...packingData, totalWeight: parseFloat(e.target.value) || 0})}

                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"

                        placeholder="0.0"

                      />

                      <p className="text-xs text-gray-500 mt-1">
                        {packingData.totalWeight > 0 ? 'Calculated from product weights' : 'Enter weight manually'}
                      </p>

                    </div>

                  </div>



                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-1">

                      Packing Notes

                    </label>

                    <textarea

                      rows={5}

                      value={packingData.packingNotes}

                      onChange={(e) => setPackingData({...packingData, packingNotes: e.target.value})}

                      placeholder="Add any special packing instructions..."

                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"

                    />

                    <input

                      type="number"

                      min="1"

                      defaultValue="1"

                      className="w-full px-3 py-2 border border-gray-300 rounded-lg hidden"

                    />

                  </div>

                </div>



                <div className="flex justify-between items-center mt-6">

                  <button

                    onClick={() => setCurrentStep('verify')}

                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"

                  >

                    ← Back to Verify

                  </button>

                  <button

                    onClick={async () => {
                      // Update order status to 'shipped' when marking as ready to ship
                      if (selectedOrder) {
                        try {
                          await api.put(
                            `/operations/shipping/sales-orders/${selectedOrder.so_id || selectedOrder.id}/status`,
                            { status: 'shipped' }
                          );
                          // Reload orders to reflect the change
                          await loadSalesOrders();
                        } catch (err) {
                          console.error('Error updating order status:', err);
                          // Continue anyway - don't block user
                        }
                      }
                      setCurrentStep('ship');
                    }}

                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"

                  >

                    Mark Ready to Ship →

                  </button>

                </div>

              </div>

            )}



            {currentStep === 'ship' && (

              <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">

                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />

                <h3 className="text-xl font-bold text-gray-900 mb-2">

                  Order Ready for Shipping!

                </h3>

                <p className="text-gray-600 mb-6">

                  {selectedOrder.id} has been picked, verified, and packed.

                </p>

                <div className="flex gap-3 justify-center">

                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">

                    Generate Shipping Label

                  </button>

                  <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">

                    Print Packing Slip

                  </button>

                  <button

                    onClick={async () => {
                      if (selectedOrder) {
                        try {
                          setLoading(true);
                          // Update order status to 'shipped' so it no longer appears in "Ready to Pick" list
                          // The getSalesOrdersForPicking only shows 'confirmed' or 'allocated' orders
                          const response = await api.put(
                            `/operations/shipping/sales-orders/${selectedOrder.so_id || selectedOrder.id}/status`,
                            { status: 'shipped' } // Change status so it's removed from "Ready to Pick" list
                          );
                          
                          if (response.error) {
                            console.error('Failed to update order status:', response.error);
                            // Continue anyway - don't block user
                          }
                          
                          // Reload orders list to reflect the change
                          await loadSalesOrders();
                        } catch (err) {
                          console.error('Error updating order status:', err);
                          // Continue anyway - don't block user
                        } finally {
                          setLoading(false);
                        }
                      }
                      
                      setSelectedOrder(null);
                      setPickingItems([]);
                      setPackingData({ numberOfBoxes: 1, totalWeight: 0, packingNotes: '' });
                      setCurrentStep('pick');
                    }}

                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"

                  >

                    Complete & Next Order

                  </button>

                </div>

              </div>

            )}

          </div>

        )}

      </div>

      {/* Order Details Modal */}
      {showOrderDetailsModal && orderDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Order Details - {orderDetails.id}</h2>
              <button
                onClick={() => {
                  setShowOrderDetailsModal(false);
                  setOrderDetails(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Customer</p>
                  <p className="text-lg font-semibold text-gray-900">{orderDetails.customer}</p>
                  <p className="text-sm text-gray-500">{orderDetails.contact}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Shipping Address</p>
                  <p className="text-lg font-semibold text-gray-900">{orderDetails.shippingAddress}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Order Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(orderDetails.orderDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Due Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(orderDetails.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Value</p>
                  <p className="text-lg font-semibold text-gray-900">{orderDetails.totalValue}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <span className={`px-3 py-1 text-sm font-medium rounded ${
                    orderDetails.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                    orderDetails.status === 'allocated' ? 'bg-yellow-100 text-yellow-700' :
                    orderDetails.status === 'shipped' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {orderDetails.status.toUpperCase()}
                  </span>
                </div>
                {orderDetails.created_by_name && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Registered By</p>
                    <p className="text-lg font-semibold text-gray-900">{orderDetails.created_by_name}</p>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
                <div className="space-y-4">
                  {orderDetails.items && orderDetails.items.length > 0 ? (
                    orderDetails.items.map((item: OrderItem, idx: number) => {
                      const isPackaged = item.product_type === 'packaged' && item.variant_id;
                      const hasSize = item.size && item.size > 0;
                      const packages = item.packages || 0;
                      const looseUnits = item.loose_units_ordered || 0;
                      const unitsPerPackage = item.units_per_package || 1;
                      
                      // Calculate total quantity display
                      let totalQuantityDisplay = '';
                      if (isPackaged && hasSize && item.size) {
                        const sizeValue = item.size;
                        const totalInBaseUnits = item.total_quantity_in_base_units || (item.ordered * sizeValue);
                        totalQuantityDisplay = `${totalInBaseUnits.toLocaleString()} ${item.size_unit || 'g'}`;
                        if (packages > 0 || looseUnits > 0) {
                          totalQuantityDisplay += ` (${packages} ${item.package_unit || 'box'}s × ${unitsPerPackage} × ${sizeValue}${item.size_unit || 'g'})`;
                          if (looseUnits > 0) {
                            totalQuantityDisplay += ` + ${looseUnits} × ${sizeValue}${item.size_unit || 'g'}`;
                          }
                        }
                      } else {
                        totalQuantityDisplay = `${item.ordered} ${item.unit || 'unit'}s`;
                      }
                      
                      return (
                        <div key={idx} className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
                          {/* Product Information */}
                          <div className="mb-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Product Information</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Product Name</p>
                                <p className="text-sm font-semibold text-gray-900">{item.product_name || item.name}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 mb-1">SKU</p>
                                <p className="text-sm font-semibold text-gray-900">{item.sku}</p>
                              </div>
                              {item.category_name && (
                                <div>
                                  <p className="text-xs text-gray-600 mb-1">Category</p>
                                  <p className="text-sm font-semibold text-gray-900">{item.category_name}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Location</p>
                                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {item.location}
                                </p>
                              </div>
                              {item.variant_name && (
                                <div>
                                  <p className="text-xs text-gray-600 mb-1">Variant</p>
                                  <p className="text-sm font-semibold text-gray-900">{item.variant_name}</p>
                                </div>
                              )}
                              {hasSize && (
                                <div>
                                  <p className="text-xs text-gray-600 mb-1">Size</p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {item.size?.toLocaleString()} {item.size_unit}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quantity & Units */}
                          <div className="mb-6 border-t pt-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Quantity & Units</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {/* Available - Shows ordered quantity based on packages */}
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-xs font-medium text-blue-700 mb-2">Available</p>
                                {isPackaged && hasSize ? (
                                  <>
                                    <p className="text-lg font-bold text-blue-900">
                                      {item.ordered} {item.base_unit || 'bottle'}s
                                    </p>
                                    {packages > 0 && (
                                      <p className="text-xs text-blue-600 mt-1">
                                        {packages} {item.package_unit || 'box'}s
                                        {looseUnits > 0 && ` + ${looseUnits} loose ${item.base_unit || 'bottle'}s`}
                                      </p>
                                    )}
                                    {item.size && (
                                      <p className="text-xs text-blue-500 mt-1">
                                        {item.size.toLocaleString()}{item.size_unit} per {item.base_unit || 'bottle'}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-lg font-bold text-blue-900">
                                    {item.ordered} {item.unit || 'unit'}s
                                  </p>
                                )}
                              </div>

                              {/* Total Quantity */}
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-xs font-medium text-green-700 mb-2">Total Quantity</p>
                                <p className="text-lg font-bold text-green-900">
                                  {isPackaged && hasSize && item.size
                                    ? `${(item.total_quantity_in_base_units || (item.ordered * item.size)).toLocaleString()} ${item.size_unit || 'g'}`
                                    : `${item.ordered} ${item.unit || 'unit'}s`}
                                </p>
                              </div>

                              {/* Packages - Only for packaged products */}
                              {isPackaged && hasSize && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                  <p className="text-xs font-medium text-purple-700 mb-2">Packages</p>
                                  <p className="text-lg font-bold text-purple-900">
                                    {packages} {item.package_unit || 'box'}s
                                  </p>
                                  {looseUnits > 0 && (
                                    <p className="text-xs text-purple-600 mt-1">
                                      + {looseUnits} loose {item.base_unit || 'unit'}s
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Units per Package - Only for packaged products */}
                              {isPackaged && hasSize && (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                  <p className="text-xs font-medium text-orange-700 mb-2">Units per Package</p>
                                  <p className="text-lg font-bold text-orange-900">
                                    {unitsPerPackage} {item.base_unit || 'bottle'}s
                                  </p>
                                </div>
                              )}

                              {/* Size per Unit - Only for packaged products with size */}
                              {isPackaged && hasSize && (
                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                  <p className="text-xs font-medium text-indigo-700 mb-2">Size per Unit</p>
                                  <p className="text-lg font-bold text-indigo-900">
                                    {item.size ? item.size.toLocaleString() : '0'}{item.size_unit}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Valuation */}
                          <div className="border-t pt-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Valuation</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Cost Value</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  RWF {item.cost_value?.toLocaleString() || '0'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Average Cost</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  RWF {item.average_cost?.toLocaleString() || '0'}/{item.base_unit || item.unit || 'unit'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Potential Revenue</p>
                                <p className="text-sm font-semibold text-green-600">
                                  RWF {item.potential_revenue?.toLocaleString() || item.value?.toLocaleString() || '0'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No items found
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowOrderDetailsModal(false);
                  setOrderDetails(null);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (orderDetails) {
                    handlePrintPickList(orderDetails);
                  }
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Pick List
              </button>
              <button
                onClick={() => {
                  if (orderDetails) {
                    setShowOrderDetailsModal(false);
                    setOrderDetails(null);
                    handleStartPicking(orderDetails);
                  }
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <PackageCheck className="w-4 h-4" />
                Start Picking
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

};



export default PickAndPack;


