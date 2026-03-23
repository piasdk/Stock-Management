"use client";

import React, { useState, useEffect } from 'react';

import { Package, Truck, CheckCircle, Search, Filter, MapPin, Phone, DollarSign, Calendar, Clock, AlertCircle, FileText, Printer, Send, Mail, MessageSquare, Navigation, Eye, ChevronDown, ChevronUp, Save } from 'lucide-react';

import { api } from '@/lib/api';

const ShipOrdersPage = () => {

  const [activeTab, setActiveTab] = useState('ready');

  const [searchQuery, setSearchQuery] = useState('');

  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const [showFilters, setShowFilters] = useState(false);

  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const [stats, setStats] = useState({

    readyToShip: 0,

    inTransit: 0,

    deliveredToday: 0,

    urgent: 0,

    lateOrders: 0

  });

  const [orders, setOrders] = useState<any[]>([]);

  const [inTransitOrders, setInTransitOrders] = useState<any[]>([]);

  const [deliveredOrders, setDeliveredOrders] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showViewOrderModal, setShowViewOrderModal] = useState(false);
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<any | null>(null);
  const [updateStatusForm, setUpdateStatusForm] = useState({ status: 'delivered', tracking_number: '', notes: '' });
  const [trackingForm, setTrackingForm] = useState({ tracking_number: '', carrier: 'In-House Delivery', service: 'Standard' });
  const [viewOrderForm, setViewOrderForm] = useState({ 
    boxes: '', 
    weight: '', 
    timeSlot: ''
  });

  useEffect(() => {

    loadData();

  }, [activeTab]);



  const loadData = async () => {

    setLoading(true);

    setError(null);

    try {

      // Load stats

      const statsResponse = await api.get('/operations/shipping/stats');

      if (statsResponse.error) {

        setError(statsResponse.error);

      } else if (statsResponse.data && typeof statsResponse.data === 'object') {

        const statsData = statsResponse.data as { 

          readyToShip?: number; 

          inTransit?: number; 

          deliveredToday?: number;

          urgent?: number;

          lateOrders?: number;

        };

        setStats({

          readyToShip: statsData.readyToShip ?? 0,

          inTransit: statsData.inTransit ?? 0,

          deliveredToday: statsData.deliveredToday ?? 0,

          urgent: statsData.urgent ?? 0,

          lateOrders: statsData.lateOrders ?? 0

        });

      }



      // Load orders based on active tab

      if (activeTab === 'ready') {

        const ordersResponse = await api.get('/operations/shipping/sales-orders', { status: 'confirmed' });

        if (ordersResponse.error) {

          setError(ordersResponse.error);

        } else if (ordersResponse.data) {

          setOrders(Array.isArray(ordersResponse.data) ? ordersResponse.data : []);

        }

      } else if (activeTab === 'transit') {

        const transitResponse = await api.get('/operations/shipping/sales-orders', { status: 'shipped' });

        if (transitResponse.error) {

          setError(transitResponse.error);

        } else if (transitResponse.data) {

          const transitData = Array.isArray(transitResponse.data) ? transitResponse.data : [];

          // Transform for in-transit display - preserve all original data

          setInTransitOrders(transitData.map((order: any) => ({

            ...order, // Preserve all original fields including so_id, shippingNotes, etc.

            id: order.id,

            status: 'in-transit',

            customer: order.customer,

            trackingNumber: order.trackingNumber || null, // Don't set to 'N/A', let extraction handle it

            carrier: order.carrier || 'In-House Delivery', // Default carrier

            service: order.service || 'Standard', // Default service

            estimatedDelivery: order.deliveryDate || order.estimatedDelivery || order.estimatedDelivery || 'N/A',

            lastUpdate: order.trackingNumber ? 'Out for delivery' : 'In transit',

            currentLocation: order.currentLocation || 'Kigali Distribution Center', // Use from backend or default
            shippingNotes: order.shippingNotes || order.notes || '' // Preserve notes for tracking extraction

          })));

        }

      } else if (activeTab === 'delivered') {

        const deliveredResponse = await api.get('/operations/shipping/sales-orders', { status: 'completed' });

        if (deliveredResponse.error) {

          setError(deliveredResponse.error);

        } else if (deliveredResponse.data) {

          const deliveredData = Array.isArray(deliveredResponse.data) ? deliveredResponse.data : [];

          // Filter for today's deliveries

          const today = new Date().toISOString().split('T')[0];

          setDeliveredOrders(deliveredData.filter((order: any) => 

            order.deliveryDate === today

          ));

        }

      }

    } catch (err: any) {

      console.error('Error loading shipping data:', err);

      setError(err.message || 'Failed to load shipping data');

    } finally {

      setLoading(false);

    }

  };



  const toggleOrderSelection = (orderId: string) => {

    setSelectedOrders(prev => 

      prev.includes(orderId) 

        ? prev.filter(id => id !== orderId)

        : [...prev, orderId]

    );

  };

  // Extract tracking number from notes if available
  const extractTrackingNumber = (order: any): string | null => {
    // Check if tracking number exists directly in order (and is not null/N/A)
    if (order.trackingNumber && 
        order.trackingNumber !== 'N/A' && 
        order.trackingNumber !== null && 
        order.trackingNumber !== 'null' &&
        order.trackingNumber.trim() !== '') {
      return order.trackingNumber;
    }
    
    // Try to extract from notes
    const notes = order.shippingNotes || order.notes || '';
    if (notes) {
      // Pattern 1: "Tracking: XXXXX" or "Tracking:XXXXX" (supports alphanumeric and hyphens)
      // Must be on its own line or after newline, not part of carrier/service text
      let trackingMatch = notes.match(/(?:^|\n)\s*Tracking:\s*([A-Z0-9\-]+)/i);
      if (trackingMatch && trackingMatch[1] && trackingMatch[1].trim() !== '') {
        const tracking = trackingMatch[1].trim();
        // Validate it's a real tracking number (not part of other text)
        if (tracking.length >= 3) {
          return tracking;
        }
      }
      
      // Pattern 2: Look for alphanumeric sequences that look like tracking numbers (8+ characters)
      // But exclude common words that might appear in carrier/service names
      const excludedWords = ['Delivery', 'Standard', 'Express', 'Overnight', 'Economy', 'House', 'In-House', 'InHouse'];
      trackingMatch = notes.match(/\b([A-Z0-9]{8,})\b/i);
      if (trackingMatch && trackingMatch[1] && trackingMatch[1].trim() !== '') {
        const tracking = trackingMatch[1].trim();
        // Make sure it's not a common word (case-insensitive check)
        if (excludedWords.some(word => word.toLowerCase() === tracking.toLowerCase())) {
          return null;
        }
        // Make sure it's not part of carrier/service text using proper regex
        // Escape special regex characters in tracking string
        const escapedTracking = tracking.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const carrierPattern = new RegExp(`Carrier:\\s*[^,\\n]*\\b${escapedTracking}\\b`, 'i');
        const servicePattern = new RegExp(`Service:\\s*[^,\\n]*\\b${escapedTracking}\\b`, 'i');
        if (carrierPattern.test(notes) || servicePattern.test(notes)) {
          return null;
        }
        return tracking;
      }
    }
    
    return null;
  };

  // Extract additional info from notes
  const extractFromNotes = (notes: string, key: string): string | null => {
    if (!notes) return null;
    const match = notes.match(new RegExp(`${key}:\\s*([^\\n]+)`, 'i'));
    return match ? match[1].trim() : null;
  };

  // Handler for Track Package button
  const handleTrackPackage = (order: any) => {
    const trackingNumber = extractTrackingNumber(order);
    // Ensure we preserve so_id when setting selected order
    setSelectedOrderForAction({
      ...order,
      so_id: order.so_id || order.soId || null // Preserve so_id from multiple possible locations
    });
    setTrackingForm({
      tracking_number: trackingNumber || '',
      carrier: order.carrier || 'In-House Delivery',
      service: order.service || 'Standard'
    });
    setShowTrackingModal(true);
  };

  // Handler for Update Status button
  const handleUpdateStatusClick = (order: any) => {
    setSelectedOrderForAction(order);
    setUpdateStatusForm({ 
      status: order.status === 'shipped' ? 'completed' : 'shipped',
      tracking_number: extractTrackingNumber(order) || '',
      notes: ''
    });
    setShowUpdateStatusModal(true);
  };

  // Handler for submitting status update
  const handleUpdateStatus = async () => {
    // Check for so_id in multiple possible locations
    const soId = selectedOrderForAction?.so_id || 
                 (selectedOrderForAction?.id?.startsWith('SO-') 
                   ? selectedOrderForAction.id.replace('SO-', '') 
                   : selectedOrderForAction?.id);
    
    if (!soId) {
      console.error('Order data:', selectedOrderForAction);
      alert('Invalid order selected. Order ID not found.');
      return;
    }

    try {
      const response = await api.put(
        `/operations/shipping/sales-orders/${soId}/status`,
        updateStatusForm
      );

      if (response.error) {
        alert(`Error: ${response.error}`);
      } else {
        alert('Order status updated successfully!');
        setShowUpdateStatusModal(false);
        setSelectedOrderForAction(null);
        setUpdateStatusForm({ status: 'completed', tracking_number: '', notes: '' });
        loadData(); // Reload data
      }
    } catch (err: any) {
      console.error('Error updating order status:', err);
      alert(`Failed to update order status: ${err.message}`);
    }
  };

  // Handler for saving tracking information
  const handleSaveTracking = async () => {
    // Priority: Use so_id directly if available (most reliable)
    let soId = selectedOrderForAction?.so_id;
    
    // If so_id is not available, try to extract from id
    // Note: The order number (e.g., "SO-1764168970500") contains a timestamp,
    // not the actual so_id. The so_id should be preserved from backend.
    if (!soId && selectedOrderForAction?.id) {
      const orderId = selectedOrderForAction.id;
      // Only try extraction if id doesn't start with "SO-" (which is order number, not so_id)
      if (!orderId.startsWith('SO-')) {
        if (typeof orderId === 'string' && /^\d+$/.test(orderId)) {
          soId = orderId;
        } else if (typeof orderId === 'number') {
          soId = orderId.toString();
        }
      }
    }
    
    // Convert to number for API call
    const soIdNum = soId ? Number(soId) : null;
    
    if (!soIdNum || isNaN(soIdNum) || soIdNum <= 0) {
      console.error('Order data:', selectedOrderForAction);
      console.error('Extracted soId:', soId, 'soIdNum:', soIdNum);
      alert(`Invalid order selected. Order ID not found or invalid. Please check: so_id=${selectedOrderForAction?.so_id}, id=${selectedOrderForAction?.id}`);
      return;
    }

    // Tracking number is optional for in-house delivery
    const isInHouse = trackingForm.carrier.includes('In-House');
    
    if (!trackingForm.tracking_number.trim() && !isInHouse) {
      alert('Please enter a tracking number');
      return;
    }

    try {
      // Ensure status is valid (draft, confirmed, allocated, shipped, completed, cancelled)
      // If order is in-transit, it should be 'shipped'
      let orderStatus = selectedOrderForAction.status || 'shipped';
      if (orderStatus === 'in-transit') {
        orderStatus = 'shipped';
      }
      // Only allow valid statuses
      const validStatuses = ['confirmed', 'allocated', 'shipped', 'completed', 'cancelled'];
      if (!validStatuses.includes(orderStatus)) {
        orderStatus = 'shipped'; // Default to shipped if invalid
      }

      console.log('Saving tracking info:', {
        soId,
        soIdNum,
        orderStatus,
        carrier: trackingForm.carrier,
        service: trackingForm.service,
        trackingNumber: trackingForm.tracking_number,
        orderData: selectedOrderForAction,
        orderSoId: selectedOrderForAction?.so_id,
        orderId: selectedOrderForAction?.id
      });

      // Update status with tracking number in notes
      const response = await api.put(
        `/operations/shipping/sales-orders/${soIdNum}/status`,
        {
          status: orderStatus,
          tracking_number: trackingForm.tracking_number,
          notes: `Carrier: ${trackingForm.carrier}, Service: ${trackingForm.service}`
        }
      );

      if (response.error) {
        alert(`Error: ${response.error}`);
      } else {
        alert('Tracking information saved successfully!');
        setShowTrackingModal(false);
        setSelectedOrderForAction(null);
        setTrackingForm({ tracking_number: '', carrier: 'In-House Delivery', service: 'Standard' });
        loadData(); // Reload data
      }
    } catch (err: any) {
      console.error('Error saving tracking:', err);
      alert(`Failed to save tracking information: ${err.message}`);
    }
  };

  // Handler for Contact Customer button
  const handleContactCustomer = (order: any) => {
    setSelectedOrderForAction(order);
    setShowContactModal(true);
  };



  // Filter orders based on search query

  const filteredOrders = orders.filter(order => {

    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();

    return (

      order.id?.toLowerCase().includes(query) ||

      order.customer?.toLowerCase().includes(query) ||

      order.customerPhone?.toLowerCase().includes(query) ||

      order.address?.toLowerCase().includes(query) ||

      order.fullAddress?.toLowerCase().includes(query)

    );

  });



  const OrderCard = ({ order }: { order: any }) => {

    const isExpanded = expandedOrder === order.id;

    const isSelected = selectedOrders.includes(order.id);

    return (

      <div className={`border rounded-lg p-4 hover:shadow-lg transition-shadow ${

        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'

      } ${order.isLate ? 'border-l-4 border-l-red-500' : ''}`}>

        

        {/* Header Section */}

        <div className="flex items-start gap-4 mb-3">

          <input

            type="checkbox"

            checked={isSelected}

            onChange={() => toggleOrderSelection(order.id)}

            className="mt-1 w-5 h-5 rounded"

          />

          

          <div className="flex-1">

            <div className="flex items-start justify-between mb-2">

              <div>

                <div className="flex items-center gap-2">

                  <h3 className="text-lg font-bold text-gray-900">{order.id}</h3>

                  {order.priority === 'urgent' && (

                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">

                      🚨 URGENT

                    </span>

                  )}

                  {order.priority === 'express' && (

                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">

                      ⚡ EXPRESS

                    </span>

                  )}

                  {order.isLate && (

                    <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">

                      ⏰ LATE ({order.orderAge} days)

                    </span>

                  )}

                </div>

                <p className="text-sm text-gray-500">Invoice: {order.invoice}</p>

              </div>

              

              <div className="text-right">

                <span className={`px-3 py-1 rounded-full text-xs font-medium ${

                  order.paymentStatus === 'paid' 

                    ? 'bg-green-100 text-green-700' 

                    : order.paymentStatus === 'cod'

                    ? 'bg-yellow-100 text-yellow-700'

                    : 'bg-red-100 text-red-700'

                }`}>

                  {order.paymentStatus === 'paid' ? '✓ Paid' : order.paymentStatus === 'cod' ? '💵 COD' : '⚠ Unpaid'}

                </span>

                {order.orderAge > 3 && (

                  <p className="text-xs text-red-600 font-medium mt-1">

                    Waiting {order.orderAge} days

                  </p>

                )}

              </div>

            </div>

            {/* Customer Info */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">

              <div className="space-y-1">

                <div className="flex items-center gap-2">

                  <Package className="w-4 h-4 text-gray-400" />

                  <span className="font-semibold text-gray-900">{order.customer}</span>

                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">

                  <Phone className="w-4 h-4 text-gray-400" />

                  <span>{order.customerPhone || 'N/A'}</span>

                  {order.contactPerson && (

                    <>

                      <span className="text-gray-400">•</span>

                      <span>{order.contactPerson}</span>

                    </>

                  )}

                </div>

                <div className="flex items-start gap-2 text-sm text-gray-600">

                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />

                  <span>{order.fullAddress || order.address || 'Address not available'}</span>

                </div>

              </div>

              <div className="space-y-1">

                <div className="flex items-center gap-2 text-sm">

                  <Calendar className="w-4 h-4 text-blue-500" />

                  <span className="font-medium text-gray-900">Est. Delivery:</span>

                  <span className="text-gray-700">{order.estimatedDelivery || 'Not set'}</span>

                </div>

                <div className="flex items-center gap-2 text-sm">

                  <Clock className="w-4 h-4 text-blue-500" />

                  {order.timeSlot ? (
                    <span className="text-gray-700">{order.timeSlot}</span>
                  ) : null}

                </div>

                <div className="flex items-center gap-2 text-sm">

                  <Truck className="w-4 h-4 text-purple-500" />

                  <span className="font-medium">{order.carrier} - {order.service}</span>

                </div>

              </div>

            </div>

            {/* Shipment Details */}

            <div className="flex items-center gap-6 text-sm text-gray-600 mb-3 p-3 bg-gray-50 rounded">

              <div className="flex items-center gap-2">

                <Package className="w-4 h-4" />

                <span>{order.items} items / {order.boxes} boxes</span>

              </div>

              <div className="flex items-center gap-2">

                <span className="font-medium">Weight:</span>

                <span>{order.weight} kg</span>

              </div>

              <div className="flex items-center gap-2">

                <DollarSign className="w-4 h-4" />

                <span>Shipping: {order.currency} {order.shippingCost?.toLocaleString() || '0'}</span>

              </div>

              {order.paymentStatus === 'cod' && order.codAmount && (

                <div className="flex items-center gap-2 font-semibold text-orange-700">

                  <DollarSign className="w-4 h-4" />

                  <span>Collect: {order.currency} {order.codAmount.toLocaleString()}</span>

                </div>

              )}

            </div>

            {/* Delivery Instructions */}

            {order.deliveryInstructions && (

              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded">

                <div className="flex items-start gap-2">

                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />

                  <div>

                    <p className="text-xs font-semibold text-yellow-900 mb-1">Delivery Instructions:</p>

                    <p className="text-sm text-yellow-800">{order.deliveryInstructions}</p>

                  </div>

                </div>

              </div>

            )}

            {/* Expanded Details */}

            {isExpanded && (

              <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200 space-y-2">

                <h4 className="font-semibold text-gray-900 mb-2">Additional Details</h4>

                <div className="grid grid-cols-2 gap-2 text-sm">

                  <div><span className="text-gray-600">Order Value:</span> <span className="font-medium">{order.currency} {order.orderValue?.toLocaleString() || '0'}</span></div>

                  <div><span className="text-gray-600">Packed Date:</span> <span className="font-medium">{order.packedDate ? new Date(order.packedDate).toLocaleDateString() : 'N/A'}</span></div>

                  <div><span className="text-gray-600">Branch/Warehouse:</span> <span className="font-medium">{order.branchName || 'N/A'}</span></div>

                </div>

              </div>

            )}

            {/* Action Buttons */}

            <div className="flex flex-wrap gap-2 mt-3">

              <button 
                onClick={() => {
                  // Mark as shipped - update status to shipped
                  handleUpdateStatusClick(order);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium"
              >
                <Send className="w-4 h-4" />
                Mark as Shipped
              </button>

              <button 
                onClick={() => {
                  // Email customer
                  handleContactCustomer(order);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
              >
                <Mail className="w-4 h-4" />
                Email Customer
              </button>

              <button 
                onClick={() => {
                  // View order - show modal with all order details
                  const notes = order.shippingNotes || order.notes || '';
                  setSelectedOrderForAction(order);
                  // Extract values from notes or use order data
                  setViewOrderForm({
                    boxes: order.boxes?.toString() || extractFromNotes(notes, 'Boxes') || '',
                    weight: order.weight?.toString() || extractFromNotes(notes, 'Weight')?.replace(' kg', '') || '',
                    timeSlot: order.timeSlot || extractFromNotes(notes, 'Time Slot') || ''
                  });
                  setShowViewOrderModal(true);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
              >
                <Eye className="w-4 h-4" />
                View Order
              </button>

              <button 

                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}

                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm ml-auto"

              >

                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}

                {isExpanded ? 'Less' : 'More'}

              </button>

            </div>

          </div>

        </div>

      </div>

    );

  };



  const InTransitCard = ({ order }: { order: any }) => (

    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">

      <div className="flex items-start justify-between mb-3">

        <div>

          <h3 className="text-lg font-bold text-gray-900">{order.id}</h3>

          <p className="text-sm text-gray-600">{order.customer}</p>

        </div>

        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">

          🚚 In Transit

        </span>

      </div>

      <div className="space-y-2 mb-3">

        <div className="flex items-center gap-2 text-sm">
          <Truck className="w-4 h-4 text-blue-500" />
          <span className="font-medium">Carrier:</span>
          <span>{order.carrier || 'In-House Delivery'}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">Service:</span>
          <span>{order.service || 'Standard'}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Tracking Number:</span>
          <span className="text-blue-600 font-mono">
            {(() => {
              const trackingNum = extractTrackingNumber(order);
              return trackingNum || 'No tracking number';
            })()}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">

          <MapPin className="w-4 h-4 text-green-500" />

          <span>{order.currentLocation}</span>

        </div>

        <div className="flex items-center gap-2 text-sm">

          <Calendar className="w-4 h-4 text-orange-500" />

          <span>Est. Delivery: {order.estimatedDelivery}</span>

        </div>

      </div>

      <div className="p-2 bg-green-50 border border-green-200 rounded mb-3">

        <p className="text-sm text-green-800">

          <CheckCircle className="w-4 h-4 inline mr-1" />

          {order.lastUpdate}

        </p>

      </div>

      <div className="flex gap-2">

        <button 
          onClick={() => handleTrackPackage(order)}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >

          Track Package

        </button>

        <button 
          onClick={() => handleUpdateStatusClick(order)}
          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
        >

          Update Status

        </button>

        <button 
          onClick={() => handleContactCustomer(order)}
          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
        >

          Contact Customer

        </button>

      </div>

    </div>

  );



  return (

    <div className="min-h-screen bg-gray-50">

      {/* Header */}

      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">

        <div className="max-w-7xl mx-auto px-4 py-4">

          <div className="flex justify-between items-center mb-4">

            <div>

              <h1 className="text-3xl font-bold text-gray-900">Ship Orders</h1>

              <p className="text-gray-600 mt-1">Generate shipping labels and track shipments</p>

            </div>

            <div className="flex gap-2">

              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">

                <Navigation className="w-4 h-4" />

                Route Planner

              </button>

              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">

                <Printer className="w-4 h-4" />

                Print All Labels

              </button>

            </div>

          </div>

          {/* Stats */}

          {loading ? (

            <div className="text-center py-4 text-gray-500">Loading stats...</div>

          ) : error ? (

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">

              <p className="text-red-800">{error}</p>

            </div>

          ) : (

            <div className="grid grid-cols-5 gap-4 mb-4">

              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">

                <p className="text-sm text-orange-700 font-medium">Ready to Ship</p>

                <p className="text-2xl font-bold text-orange-900">{stats.readyToShip}</p>

                <p className="text-xs text-orange-600">Packed and ready</p>

              </div>

              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">

                <p className="text-sm text-blue-700 font-medium">In Transit</p>

                <p className="text-2xl font-bold text-blue-900">{stats.inTransit}</p>

                <p className="text-xs text-blue-600">Being delivered</p>

              </div>

              <div className="bg-green-50 rounded-lg p-3 border border-green-200">

                <p className="text-sm text-green-700 font-medium">Delivered Today</p>

                <p className="text-2xl font-bold text-green-900">{stats.deliveredToday}</p>

                <p className="text-xs text-green-600">Completed</p>

              </div>

              <div className="bg-red-50 rounded-lg p-3 border border-red-200">

                <p className="text-sm text-red-700 font-medium">Urgent Orders</p>

                <p className="text-2xl font-bold text-red-900">{stats.urgent}</p>

                <p className="text-xs text-red-600">Need immediate action</p>

              </div>

              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">

                <p className="text-sm text-yellow-700 font-medium">Late Orders</p>

                <p className="text-2xl font-bold text-yellow-900">{stats.lateOrders}</p>

                <p className="text-xs text-yellow-600">Over 3 days old</p>

              </div>

            </div>

          )}

          {/* Search and Filters */}

          <div className="flex gap-3">

            <div className="flex-1 relative">

              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />

              <input

                type="text"

                placeholder="Search by order number, customer name, phone, or address..."

                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                value={searchQuery}

                onChange={(e) => setSearchQuery(e.target.value)}

              />

            </div>

            <button 

              onClick={() => setShowFilters(!showFilters)}

              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"

            >

              <Filter className="w-4 h-4" />

              Filters

            </button>

          </div>

          {showFilters && (

            <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">

              <div className="grid grid-cols-4 gap-3">

                <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">

                  <option>All Carriers</option>

                  <option>DHL</option>

                  <option>UPS</option>

                  <option>FedEx</option>

                </select>

                <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">

                  <option>All Payment Status</option>

                  <option>Paid</option>

                  <option>COD</option>

                  <option>Unpaid</option>

                </select>

                <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">

                  <option>All Priorities</option>

                  <option>Urgent</option>

                  <option>Express</option>

                  <option>Standard</option>

                </select>

                <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">

                  <option>Sort: Newest First</option>

                  <option>Sort: Oldest First</option>

                  <option>Sort: Urgent First</option>

                  <option>Sort: Delivery Date</option>

                </select>

              </div>

            </div>

          )}

        </div>

      </div>

      {/* Bulk Actions Bar */}

      {selectedOrders.length > 0 && (

        <div className="bg-blue-600 text-white sticky top-[220px] z-10">

          <div className="max-w-7xl mx-auto px-4 py-3">

            <div className="flex items-center justify-between">

              <p className="font-medium">{selectedOrders.length} order(s) selected</p>

              <div className="flex gap-2">

                <button className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium">

                  Generate All Labels

                </button>

                <button className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium">

                  Print All Packing Slips

                </button>

                <button className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium">

                  Mark All as Shipped

                </button>

                <button 

                  onClick={() => setSelectedOrders([])}

                  className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 text-sm font-medium"

                >

                  Clear Selection

                </button>

              </div>

            </div>

          </div>

        </div>

      )}

      {/* Main Content */}

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Tabs */}

        <div className="bg-white rounded-lg border border-gray-200 mb-6">

          <div className="border-b border-gray-200">

            <div className="flex">

              {[

                { key: 'ready', label: 'Ready to Ship', count: stats.readyToShip },

                { key: 'transit', label: 'In Transit', count: stats.inTransit },

                { key: 'delivered', label: 'Delivered Today', count: stats.deliveredToday }

              ].map(tab => (

                <button

                  key={tab.key}

                  onClick={() => setActiveTab(tab.key)}

                  className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${

                    activeTab === tab.key

                      ? 'border-blue-600 text-blue-600'

                      : 'border-transparent text-gray-600 hover:text-gray-900'

                  }`}

                >

                  {tab.label}

                  <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">

                    {tab.count}

                  </span>

                </button>

              ))}

            </div>

          </div>

          <div className="p-6">

            {loading ? (

              <div className="text-center py-12 text-gray-500">Loading orders...</div>

            ) : error ? (

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">

                <p className="text-red-800">{error}</p>

              </div>

            ) : activeTab === 'ready' && (

              <div className="space-y-4">

                {filteredOrders.length === 0 ? (

                  <div className="text-center py-12 text-gray-500">

                    <p>No orders ready for shipping</p>

                    <p className="text-sm mt-2">Orders with status "confirmed" will appear here</p>

                  </div>

                ) : (

                  filteredOrders.map(order => (

                    <OrderCard key={order.id} order={order} />

                  ))

                )}

              </div>

            )}

            {activeTab === 'transit' && !loading && !error && (

              <div className="space-y-4">

                {inTransitOrders.length === 0 ? (

                  <div className="text-center py-12 text-gray-500">

                    <p>No orders in transit</p>

                  </div>

                ) : (

                  inTransitOrders.map(order => (

                    <InTransitCard key={order.id} order={order} />

                  ))

                )}

              </div>

            )}

            {activeTab === 'delivered' && !loading && !error && (

              <div className="text-center py-12">

                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />

                <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>

                <p className="text-gray-600">{stats.deliveredToday} orders delivered successfully today</p>

              </div>

            )}

          </div>

        </div>

      </div>

      {/* Update Status Modal */}
      {showUpdateStatusModal && selectedOrderForAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Update Order Status</h2>
            <p className="text-sm text-gray-600 mb-4">
              Order: <span className="font-semibold">{selectedOrderForAction.id}</span>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status
                </label>
                <select
                  value={updateStatusForm.status}
                  onChange={(e) => setUpdateStatusForm({ ...updateStatusForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="allocated">Allocated</option>
                  <option value="shipped">Shipped</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tracking Number (optional)
                </label>
                <input
                  type="text"
                  value={updateStatusForm.tracking_number}
                  onChange={(e) => setUpdateStatusForm({ ...updateStatusForm, tracking_number: e.target.value })}
                  placeholder="Enter tracking number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={updateStatusForm.notes}
                  onChange={(e) => setUpdateStatusForm({ ...updateStatusForm, notes: e.target.value })}
                  placeholder="Add any notes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateStatus}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Status
              </button>
              <button
                onClick={() => {
                  setShowUpdateStatusModal(false);
                  setSelectedOrderForAction(null);
                  setUpdateStatusForm({ status: 'completed', tracking_number: '', notes: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {showViewOrderModal && selectedOrderForAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Order Details</h2>
            <p className="text-sm text-gray-600 mb-4">
              Order: <span className="font-semibold">{selectedOrderForAction.id}</span>
            </p>
            
            <div className="space-y-4">
              {/* Customer Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-600">Customer</p>
                    <p className="font-semibold">{selectedOrderForAction.customer || 'N/A'}</p>
                  </div>
                  {selectedOrderForAction.contactPerson && (
                    <div>
                      <p className="text-sm text-gray-600">Contact Person</p>
                      <p className="font-semibold">{selectedOrderForAction.contactPerson}</p>
                    </div>
                  )}
                  {selectedOrderForAction.customerPhone && (
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-semibold">{selectedOrderForAction.customerPhone}</p>
                    </div>
                  )}
                  {selectedOrderForAction.customerEmail && (
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold">{selectedOrderForAction.customerEmail}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-semibold">{selectedOrderForAction.fullAddress || selectedOrderForAction.address || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Order Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-gray-900 mb-3">Order Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-600">Order Number</p>
                    <p className="font-semibold">{selectedOrderForAction.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Invoice</p>
                    <p className="font-semibold">{selectedOrderForAction.invoice || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-semibold capitalize">{selectedOrderForAction.status || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedOrderForAction.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 
                      selectedOrderForAction.paymentStatus === 'cod' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-red-100 text-red-700'
                    }`}>
                      {selectedOrderForAction.paymentStatus === 'paid' ? '✓ Paid' : 
                       selectedOrderForAction.paymentStatus === 'cod' ? '💵 COD' : 
                       '⚠ Unpaid'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Order Date</p>
                    <p className="font-semibold">{selectedOrderForAction.packedDate ? new Date(selectedOrderForAction.packedDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estimated Delivery</p>
                    <p className="font-semibold">{selectedOrderForAction.estimatedDelivery || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Order Value</p>
                    <p className="font-semibold">{selectedOrderForAction.currency || 'RWF'} {selectedOrderForAction.orderValue?.toLocaleString() || '0'}</p>
                  </div>
                  {selectedOrderForAction.codAmount && (
                    <div>
                      <p className="text-sm text-gray-600">COD Amount</p>
                      <p className="font-semibold">{selectedOrderForAction.currency || 'RWF'} {selectedOrderForAction.codAmount.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-gray-900 mb-3">Shipping Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-600">Items</p>
                    <p className="font-semibold">{selectedOrderForAction.items || 0} items</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Boxes *</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={viewOrderForm.boxes}
                      onChange={(e) => setViewOrderForm({ ...viewOrderForm, boxes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Enter number of boxes"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Weight (kg) *</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={viewOrderForm.weight}
                      onChange={(e) => setViewOrderForm({ ...viewOrderForm, weight: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Enter weight in kg"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Carrier</p>
                    <p className="font-semibold">{selectedOrderForAction.carrier || 'In-House Delivery'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Service</p>
                    <p className="font-semibold">{selectedOrderForAction.service || 'Standard'}</p>
                  </div>
                  {selectedOrderForAction.trackingNumber && (
                    <div>
                      <p className="text-sm text-gray-600">Tracking Number</p>
                      <p className="font-semibold font-mono">{selectedOrderForAction.trackingNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Shipping Cost</p>
                    <p className="font-semibold">{selectedOrderForAction.currency || 'RWF'} {selectedOrderForAction.shippingCost?.toLocaleString() || '0'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Time Slot</label>
                    <select
                      value={viewOrderForm.timeSlot}
                      onChange={(e) => setViewOrderForm({ ...viewOrderForm, timeSlot: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Select time slot</option>
                      <option value="Morning (9AM-12PM)">Morning (9AM-12PM)</option>
                      <option value="Afternoon (12PM-3PM)">Afternoon (12PM-3PM)</option>
                      <option value="Evening (3PM-6PM)">Evening (3PM-6PM)</option>
                      <option value="Any time">Any time</option>
                    </select>
                  </div>
                  {selectedOrderForAction.deliveryInstructions && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Delivery Instructions</p>
                      <p className="font-semibold">{selectedOrderForAction.deliveryInstructions}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Branch Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-gray-900 mb-3">Branch/Warehouse Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-600">Branch/Warehouse</p>
                    <p className="font-semibold">{selectedOrderForAction.branchName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Branch ID</p>
                    <p className="font-semibold">{selectedOrderForAction.branchId || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Priority & Status */}
              {(selectedOrderForAction.priority || selectedOrderForAction.isLate || selectedOrderForAction.orderAge) && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Priority & Status</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedOrderForAction.priority && (
                      <div>
                        <p className="text-sm text-gray-600">Priority</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedOrderForAction.priority === 'urgent' ? 'bg-red-100 text-red-700' : 
                          selectedOrderForAction.priority === 'express' ? 'bg-orange-100 text-orange-700' : 
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {selectedOrderForAction.priority === 'urgent' ? '🚨 Urgent' : 
                           selectedOrderForAction.priority === 'express' ? '⚡ Express' : 
                           'Standard'}
                        </span>
                      </div>
                    )}
                    {selectedOrderForAction.orderAge !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600">Order Age</p>
                        <p className="font-semibold">{selectedOrderForAction.orderAge} days</p>
                      </div>
                    )}
                    {selectedOrderForAction.isLate && (
                      <div className="col-span-2">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          ⏰ Late Order
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={async () => {
                  // Save the edited information
                  if (!selectedOrderForAction?.so_id) {
                    alert('Invalid order selected');
                    return;
                  }

                  try {
                    // Build notes string with updated information
                    let notes = selectedOrderForAction.shippingNotes || selectedOrderForAction.notes || '';
                    
                    // Update boxes in notes
                    if (viewOrderForm.boxes) {
                      notes = notes.replace(/Boxes?:\s*\d+/i, '').trim();
                      notes += (notes ? '\n' : '') + `Boxes: ${viewOrderForm.boxes}`;
                    }
                    
                    // Update weight in notes
                    if (viewOrderForm.weight) {
                      notes = notes.replace(/Weight:\s*[\d.]+\s*kg/i, '').trim();
                      notes += (notes ? '\n' : '') + `Weight: ${viewOrderForm.weight} kg`;
                    }
                    
                    // Add time slot to notes
                    if (viewOrderForm.timeSlot) {
                      notes = notes.replace(/Time Slot:\s*[^\n]+/i, '').trim();
                      notes += (notes ? '\n' : '') + `Time Slot: ${viewOrderForm.timeSlot}`;
                    }

                    // Update the order notes
                    const response = await api.put(`/operations/shipping/sales-orders/${selectedOrderForAction.so_id}/status`, {
                      status: selectedOrderForAction.status,
                      notes: notes
                    });

                    if (response.error) {
                      alert(`Error: ${response.error}`);
                    } else {
                      alert('Order information updated successfully!');
                      setShowViewOrderModal(false);
                      setSelectedOrderForAction(null);
                      loadData(); // Reload data to reflect changes
                    }
                  } catch (error: any) {
                    console.error('Error updating order:', error);
                    alert(`Error updating order: ${error.message || 'Unknown error'}`);
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowViewOrderModal(false);
                  setSelectedOrderForAction(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Customer Modal */}
      {showContactModal && selectedOrderForAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Contact Customer</h2>
            <p className="text-sm text-gray-600 mb-4">
              Order: <span className="font-semibold">{selectedOrderForAction.id}</span>
            </p>
            
            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-semibold">{selectedOrderForAction.customer}</p>
              </div>
              {selectedOrderForAction.contactPerson && (
                <div>
                  <p className="text-sm text-gray-600">Contact Person</p>
                  <p className="font-semibold">{selectedOrderForAction.contactPerson}</p>
                </div>
              )}
              {selectedOrderForAction.customerPhone && (
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold">{selectedOrderForAction.customerPhone}</p>
                </div>
              )}
              {selectedOrderForAction.customerEmail && (
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold">{selectedOrderForAction.customerEmail}</p>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-3">
              {selectedOrderForAction.customerPhone && (
                <>
                  <a
                    href={`tel:${selectedOrderForAction.customerPhone}`}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Phone className="w-4 h-4" />
                    Call Customer
                  </a>
                  <a
                    href={`sms:${selectedOrderForAction.customerPhone}`}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Send SMS
                  </a>
                </>
              )}
              {selectedOrderForAction.customerEmail && (
                <a
                  href={`mailto:${selectedOrderForAction.customerEmail}?subject=Order ${selectedOrderForAction.id} - Shipping Update&body=Dear ${selectedOrderForAction.contactPerson || selectedOrderForAction.customer},%0D%0A%0D%0AThis email is regarding your order ${selectedOrderForAction.id}.%0D%0A%0D%0A`}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Mail className="w-4 h-4" />
                  Send Email
                </a>
              )}
              <button
                onClick={() => {
                  setShowContactModal(false);
                  setSelectedOrderForAction(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {showTrackingModal && selectedOrderForAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Track Package</h2>
            <p className="text-sm text-gray-600 mb-4">
              Order: <span className="font-semibold">{selectedOrderForAction.id}</span>
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={trackingForm.tracking_number}
                  onChange={(e) => setTrackingForm({ ...trackingForm, tracking_number: e.target.value })}
                  placeholder="Enter tracking number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Carrier
                  </label>
                  <select
                    value={trackingForm.carrier}
                    onChange={(e) => setTrackingForm({ ...trackingForm, carrier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="DHL">DHL</option>
                    <option value="UPS">UPS</option>
                    <option value="FedEx">FedEx</option>
                    <option value="In-House Delivery">In-House Delivery</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service
                  </label>
                  <select
                    value={trackingForm.service}
                    onChange={(e) => setTrackingForm({ ...trackingForm, service: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Express">Express</option>
                    <option value="Overnight">Overnight</option>
                    <option value="Economy">Economy</option>
                    <option value="Same Day">Same Day</option>
                    <option value="Next Day">Next Day</option>
                    <option value="Local Delivery">Local Delivery</option>
                  </select>
                </div>
              </div>

              {/* Tracking Status Display */}
              {trackingForm.tracking_number && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-semibold mb-3">Tracking Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Status: In Transit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span>Current Location: {selectedOrderForAction.currentLocation || 'In transit to destination'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <span>Estimated Delivery: {selectedOrderForAction.estimatedDelivery || 'N/A'}</span>
                    </div>
                  </div>
                  
                  {/* Only show external tracking button for external carriers */}
                  {!trackingForm.carrier.includes('In-House') && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          const carrier = trackingForm.carrier.toLowerCase();
                          let trackingUrl = '';
                          
                          if (carrier.includes('dhl')) {
                            trackingUrl = `https://www.dhl.com/en/express/tracking.html?AWB=${trackingForm.tracking_number}`;
                          } else if (carrier.includes('ups')) {
                            trackingUrl = `https://www.ups.com/track?tracknum=${trackingForm.tracking_number}`;
                          } else if (carrier.includes('fedex')) {
                            trackingUrl = `https://www.fedex.com/fedextrack/?trknbr=${trackingForm.tracking_number}`;
                          } else {
                            trackingUrl = `https://www.google.com/search?q=${encodeURIComponent(trackingForm.carrier + ' ' + trackingForm.tracking_number + ' tracking')}`;
                          }
                          window.open(trackingUrl, '_blank');
                        }}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                      >
                        <Truck className="w-4 h-4" />
                        Track on {trackingForm.carrier} Website
                      </button>
                    </div>
                  )}
                  
                  {/* Show info for in-house delivery */}
                  {trackingForm.carrier.includes('In-House') && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Note:</strong> For in-house delivery, tracking number is optional. You can use an internal reference number or delivery confirmation code.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Show info when no tracking number but in-house delivery */}
              {!trackingForm.tracking_number && trackingForm.carrier.includes('In-House') && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Tracking number is optional for in-house delivery. 
                    You can leave it blank or enter an internal reference number or delivery confirmation code.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleSaveTracking}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Tracking Info
              </button>
              <button
                onClick={() => {
                  setShowTrackingModal(false);
                  setSelectedOrderForAction(null);
                  setTrackingForm({ tracking_number: '', carrier: 'In-House Delivery', service: 'Standard' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
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

// Export for backward compatibility

export const ShipOrders = ShipOrdersPage;



// ============================================

// EXPECTED DELIVERIES PAGE

// ============================================

export const ExpectedDeliveries = () => {

  const [expectedDeliveries, setExpectedDeliveries] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState({

    today: 0,

    thisWeek: 0,

    inTransit: 0,

    overdue: 0

  });



  useEffect(() => {

    loadData();

  }, []);



  const loadData = async () => {

    setLoading(true);

    setError(null);

    try {

      const response = await api.get('/operations/expected-deliveries', { days: 30 });

      if (response.error) {

        setError(response.error);

      } else if (response.data) {

        const deliveries = Array.isArray(response.data) ? response.data : [];

        setExpectedDeliveries(deliveries);



        // Calculate stats

        const today = new Date().toISOString().split('T')[0];

        const weekFromNow = new Date();

        weekFromNow.setDate(weekFromNow.getDate() + 7);

        const weekFromNowStr = weekFromNow.toISOString().split('T')[0];



        const todayCount = deliveries.filter((d: any) => d.expected_date === today).length;

        const weekCount = deliveries.filter((d: any) => 

          d.expected_date >= today && d.expected_date <= weekFromNowStr

        ).length;

        const inTransitCount = deliveries.filter((d: any) => d.status === 'in_transit').length;

        const overdueCount = deliveries.filter((d: any) => 

          d.expected_date < today && d.status !== 'received'

        ).length;



        setStats({

          today: todayCount,

          thisWeek: weekCount,

          inTransit: inTransitCount,

          overdue: overdueCount

        });

      }

    } catch (err: any) {

      console.error('Error loading expected deliveries:', err);

      setError(err.message || 'Failed to load expected deliveries');

    } finally {

      setLoading(false);

    }

  };



  return (

    <div className="h-screen flex flex-col bg-gray-50">

      <div className="bg-white border-b border-gray-200 px-6 py-4">

        <div className="flex items-center justify-between">

          <div>

            <h1 className="text-2xl font-bold text-gray-900">Expected Deliveries</h1>

            <p className="text-sm text-gray-500">Track incoming shipments and prepare for receiving</p>

          </div>

          <div className="flex gap-3">

            <select className="px-4 py-2 border border-gray-300 rounded-lg">

              <option>Next 7 days</option>

              <option>Next 14 days</option>

              <option>Next 30 days</option>

              <option>All upcoming</option>

            </select>

          </div>

        </div>

      </div>



      <div className="flex-1 overflow-y-auto p-6">

        {loading ? (

          <div className="text-center py-12 text-gray-500">Loading deliveries...</div>

        ) : error ? (

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">

            <p className="text-red-800">{error}</p>

          </div>

        ) : (

          <>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

              <div className="bg-white border border-gray-200 rounded-lg p-4">

                <p className="text-sm text-gray-600 mb-1">Today</p>

                <p className="text-2xl font-bold text-red-600">{stats.today}</p>

                <p className="text-sm text-gray-500">Expected deliveries</p>

              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">

                <p className="text-sm text-gray-600 mb-1">This Week</p>

                <p className="text-2xl font-bold text-blue-600">{stats.thisWeek}</p>

                <p className="text-sm text-gray-500">RWF {expectedDeliveries.reduce((sum: number, d: any) => sum + (parseFloat(d.total_amount) || 0), 0).toLocaleString()} total</p>

              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">

                <p className="text-sm text-gray-600 mb-1">In Transit</p>

                <p className="text-2xl font-bold text-purple-600">{stats.inTransit}</p>

                <p className="text-sm text-gray-500">Currently shipping</p>

              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">

                <p className="text-sm text-gray-600 mb-1">Overdue</p>

                <p className="text-2xl font-bold text-orange-600">{stats.overdue}</p>

                <p className="text-sm text-gray-500">Past expected date</p>

              </div>

            </div>



            <div className="bg-white border border-gray-200 rounded-lg">

              <div className="px-4 py-3 border-b border-gray-200">

                <h3 className="font-semibold text-gray-900">Upcoming Deliveries</h3>

              </div>

              

              <div className="divide-y divide-gray-200">

                {expectedDeliveries.length === 0 ? (

                  <div className="p-8 text-center text-gray-500">

                    <p>No expected deliveries</p>

                  </div>

                ) : (

                  expectedDeliveries.map((delivery: any) => {

                    const expectedDate = delivery.expected_date ? new Date(delivery.expected_date) : null;

                    const daysUntil = expectedDate ? Math.ceil((expectedDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

                    const isOverdue = expectedDate && expectedDate < new Date() && delivery.status !== 'received';

                    return (

                      <div key={delivery.po_number || delivery.po_id} className="p-4 hover:bg-gray-50">

                        <div className="flex items-start justify-between">

                          <div className="flex-1">

                            <div className="flex items-center gap-3 mb-2">

                              <h4 className="font-semibold text-gray-900">{delivery.po_number || `PO-${delivery.po_id}`}</h4>

                              <span className={`px-2 py-0.5 text-xs font-medium rounded ${

                                delivery.status === 'approved' ? 'bg-green-100 text-green-700' :

                                delivery.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :

                                'bg-gray-100 text-gray-700'

                              }`}>

                                {delivery.status ? delivery.status.replace('_', ' ').toUpperCase() : 'PENDING'}

                              </span>

                              {daysUntil === 1 && (

                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">

                                  Tomorrow

                                </span>

                              )}

                              {isOverdue && (

                                <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded">

                                  OVERDUE

                                </span>

                              )}

                            </div>



                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-3">

                              <div>

                                <p className="text-xs text-gray-500">Supplier</p>

                                <p className="text-sm font-medium text-gray-900">{delivery.supplier_name || 'Unknown'}</p>

                              </div>

                              <div>

                                <p className="text-xs text-gray-500">Expected Date</p>

                                <p className="text-sm font-medium text-gray-900">

                                  {expectedDate ? expectedDate.toLocaleDateString() : 'N/A'}

                                </p>

                              </div>

                              <div>

                                <p className="text-xs text-gray-500">Items</p>

                                <p className="text-sm font-medium text-gray-900">{delivery.item_count || 0} items</p>

                              </div>

                              <div>

                                <p className="text-xs text-gray-500">Value</p>

                                <p className="text-sm font-medium text-gray-900">

                                  {delivery.currency || 'RWF'} {parseFloat(delivery.total_amount || 0).toLocaleString()}

                                </p>

                              </div>

                              <div>

                                <p className="text-xs text-gray-500">Carrier</p>

                                <p className="text-sm font-medium text-gray-900">{delivery.carrier || 'N/A'}</p>

                              </div>

                            </div>



                            <div className="flex gap-2">

                              <button className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">

                                Prepare to Receive

                              </button>

                              <button className="px-3 py-1 border border-gray-300 text-sm rounded hover:bg-gray-50">

                                <Eye className="w-4 h-4 inline mr-1" />

                                View PO

                              </button>

                              <button className="px-3 py-1 border border-gray-300 text-sm rounded hover:bg-gray-50">

                                Contact Supplier

                              </button>

                            </div>

                          </div>

                        </div>

                      </div>

                    );

                  })

                )}

              </div>

            </div>

          </>

        )}

      </div>

    </div>

  );

};



// ============================================

// REORDER POINTS SETTINGS PAGE

// ============================================

export const ReorderPointsSettings = () => {

  const [products, setProducts] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');



  useEffect(() => {

    loadData();

  }, []);



  const loadData = async () => {

    setLoading(true);

    setError(null);

    try {

      const response = await api.get('/operations/reorder-points');

      if (response.error) {

        setError(response.error);

      } else if (response.data) {

        setProducts(Array.isArray(response.data) ? response.data : []);

      }

    } catch (err: any) {

      console.error('Error loading reorder points:', err);

      setError(err.message || 'Failed to load reorder points');

    } finally {

      setLoading(false);

    }

  };



  const filteredProducts = products.filter(product => {

    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();

    return (

      product.product_name?.toLowerCase().includes(query) ||

      product.sku?.toLowerCase().includes(query)

    );

  });



  return (

    <div className="h-screen flex flex-col bg-gray-50">

      <div className="bg-white border-b border-gray-200 px-6 py-4">

        <div className="flex items-center justify-between">

          <div>

            <h1 className="text-2xl font-bold text-gray-900">Reorder Points</h1>

            <p className="text-sm text-gray-500">Set minimum stock levels and automatic reorder quantities</p>

          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">

            <Save className="w-4 h-4" />

            Save All Changes

          </button>

        </div>

      </div>



      <div className="flex-1 overflow-y-auto p-6">

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">

          <h3 className="font-semibold text-blue-900 mb-2">How Reorder Points Work</h3>

          <p className="text-sm text-blue-800">

            When stock falls below the reorder point, the system will alert you to create a purchase order. 

            The reorder quantity is the suggested amount to order based on lead time and usage patterns.

          </p>

        </div>



        {loading ? (

          <div className="text-center py-12 text-gray-500">Loading products...</div>

        ) : error ? (

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">

            <p className="text-red-800">{error}</p>

          </div>

        ) : (

          <div className="bg-white border border-gray-200 rounded-lg">

            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">

              <h3 className="font-semibold text-gray-900">Product Reorder Settings</h3>

              <div className="relative">

                <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />

                <input

                  type="text"

                  placeholder="Search products..."

                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"

                  value={searchQuery}

                  onChange={(e) => setSearchQuery(e.target.value)}

                />

              </div>

            </div>



            <div className="overflow-x-auto">

              <table className="w-full">

                <thead className="bg-gray-50 border-b border-gray-200">

                  <tr>

                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Product</th>

                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Current Stock</th>

                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Reorder Point</th>

                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Reorder Quantity</th>

                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Lead Time (days)</th>

                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Status</th>

                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Actions</th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-200">

                  {filteredProducts.length === 0 ? (

                    <tr>

                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">

                        {searchQuery ? 'No products found matching your search' : 'No products with reorder points configured'}

                      </td>

                    </tr>

                  ) : (

                    filteredProducts.map((product) => (

                      <tr key={product.sku} className="hover:bg-gray-50">

                        <td className="px-4 py-3">

                          <p className="text-sm font-medium text-gray-900">{product.product_name}</p>

                          <p className="text-xs text-gray-500">SKU: {product.sku}</p>

                        </td>

                        <td className="px-4 py-3">

                          <p className={`text-sm font-medium ${

                            product.current_stock === 0 ? 'text-red-600' :

                            product.current_stock <= product.reorder_point ? 'text-orange-600' :

                            'text-gray-900'

                          }`}>

                            {product.current_stock || 0}

                          </p>

                        </td>

                        <td className="px-4 py-3">

                          <input

                            type="number"

                            defaultValue={product.reorder_point || 0}

                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"

                          />

                        </td>

                        <td className="px-4 py-3">

                          <input

                            type="number"

                            defaultValue={product.reorder_quantity || 0}

                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"

                          />

                        </td>

                        <td className="px-4 py-3">

                          <input

                            type="number"

                            defaultValue={product.lead_time_days || 0}

                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"

                          />

                        </td>

                        <td className="px-4 py-3">

                          {product.status === 'out_of_stock' ? (

                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">

                              Out of Stock

                            </span>

                          ) : product.status === 'need_reorder' ? (

                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">

                              Need Reorder

                            </span>

                          ) : (

                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">

                              Healthy

                            </span>

                          )}

                        </td>

                        <td className="px-4 py-3">

                          {product.status === 'need_reorder' || product.status === 'out_of_stock' ? (

                            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">

                              Create PO

                            </button>

                          ) : null}

                        </td>

                      </tr>

                    ))

                  )}

                </tbody>

              </table>

            </div>

          </div>

        )}

      </div>

    </div>

  );

};
