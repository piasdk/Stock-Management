"use client";

import React, { useState } from 'react';
import { 
  PackageX, Search, Filter, Download, Plus, Eye, Edit, CheckCircle, 
  XCircle, Clock, AlertTriangle, ArrowLeft, RotateCcw, DollarSign,
  Package, User, Calendar, FileText, RefreshCw, TrendingUp, Hash,
  MapPin, Phone, Mail, ChevronDown, Printer, Send, MoreVertical
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const CustomerReturnsPage = () => {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterReason, setFilterReason] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);

  const returns = [
    {
      id: 'RET-2024-001',
      returnNumber: 'RET-001',
      customer: 'Acme Corporation',
      customerEmail: 'returns@acmecorp.com',
      customerPhone: '+250 788 123 456',
      originalInvoice: 'INV-2024-567',
      orderDate: '2024-11-15',
      returnDate: '2024-12-01',
      status: 'approved',
      reason: 'defective',
      items: [
        { sku: 'PROD-001', name: 'Wireless Mouse Pro', qty: 2, unitPrice: 45000, total: 90000 },
        { sku: 'PROD-015', name: 'USB-C Cable 2m', qty: 5, unitPrice: 8000, total: 40000 }
      ],
      totalAmount: 130000,
      refundAmount: 130000,
      restockFee: 0,
      condition: 'unopened',
      notes: 'Customer ordered wrong model'
    },
    {
      id: 'RET-2024-002',
      returnNumber: 'RET-002',
      customer: 'TechStart Solutions',
      customerEmail: 'support@techstart.com',
      customerPhone: '+250 788 234 567',
      originalInvoice: 'INV-2024-589',
      orderDate: '2024-11-20',
      returnDate: '2024-12-03',
      status: 'pending',
      reason: 'damaged',
      items: [
        { sku: 'PROD-023', name: 'Laptop Stand Aluminum', qty: 1, unitPrice: 85000, total: 85000 }
      ],
      totalAmount: 85000,
      refundAmount: 85000,
      restockFee: 0,
      condition: 'damaged',
      notes: 'Arrived with dent on corner, shipping damage'
    },
    {
      id: 'RET-2024-003',
      returnNumber: 'RET-003',
      customer: 'Innovation Labs Ltd',
      customerEmail: 'procurement@innovationlabs.com',
      customerPhone: '+250 788 345 678',
      originalInvoice: 'INV-2024-601',
      orderDate: '2024-11-25',
      returnDate: '2024-12-05',
      status: 'processing',
      reason: 'wrong_item',
      items: [
        { sku: 'PROD-045', name: 'Mechanical Keyboard RGB', qty: 3, unitPrice: 125000, total: 375000 },
        { sku: 'PROD-046', name: 'Gaming Mouse Pad XL', qty: 3, unitPrice: 35000, total: 105000 }
      ],
      totalAmount: 480000,
      refundAmount: 480000,
      restockFee: 0,
      condition: 'unopened',
      notes: 'Ordered RGB version by mistake, needs standard version'
    },
    {
      id: 'RET-2024-004',
      returnNumber: 'RET-004',
      customer: 'Digital Ventures',
      customerEmail: 'returns@digitalventures.com',
      customerPhone: '+250 788 456 789',
      originalInvoice: 'INV-2024-543',
      orderDate: '2024-10-28',
      returnDate: '2024-12-07',
      status: 'rejected',
      reason: 'no_longer_needed',
      items: [
        { sku: 'PROD-089', name: 'Office Chair Executive', qty: 1, unitPrice: 450000, total: 450000 }
      ],
      totalAmount: 450000,
      refundAmount: 0,
      restockFee: 0,
      condition: 'used',
      notes: 'Return rejected - beyond 30-day return window'
    },
    {
      id: 'RET-2024-005',
      returnNumber: 'RET-005',
      customer: 'Global Tech Partners',
      customerEmail: 'admin@globaltech.rw',
      customerPhone: '+250 788 567 890',
      originalInvoice: 'INV-2024-612',
      orderDate: '2024-11-30',
      returnDate: '2024-12-08',
      status: 'refunded',
      reason: 'defective',
      items: [
        { sku: 'PROD-067', name: 'Webcam 4K Ultra HD', qty: 2, unitPrice: 180000, total: 360000 }
      ],
      totalAmount: 360000,
      refundAmount: 360000,
      restockFee: 0,
      condition: 'defective',
      notes: 'Camera not working properly, full refund issued'
    },
    {
      id: 'RET-2024-006',
      returnNumber: 'RET-006',
      customer: 'Smart Solutions Inc',
      customerEmail: 'orders@smartsolutions.com',
      customerPhone: '+250 788 678 901',
      originalInvoice: 'INV-2024-625',
      orderDate: '2024-12-01',
      returnDate: '2024-12-10',
      status: 'inspection',
      reason: 'not_as_described',
      items: [
        { sku: 'PROD-112', name: 'Portable SSD 1TB', qty: 4, unitPrice: 95000, total: 380000 }
      ],
      totalAmount: 380000,
      refundAmount: 380000,
      restockFee: 0,
      condition: 'opened',
      notes: 'Customer claims slower speeds than advertised'
    }
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved':
      case 'refunded':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'pending':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'processing':
      case 'inspection':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'rejected':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'approved':
      case 'refunded':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'processing':
      case 'inspection':
        return <RefreshCw className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <PackageX className="w-4 h-4" />;
    }
  };

  const getReasonBadge = (reason) => {
    const reasons = {
      defective: { label: 'Defective', color: 'bg-red-100 text-red-700' },
      damaged: { label: 'Damaged', color: 'bg-orange-100 text-orange-700' },
      wrong_item: { label: 'Wrong Item', color: 'bg-purple-100 text-purple-700' },
      not_as_described: { label: 'Not as Described', color: 'bg-indigo-100 text-indigo-700' },
      no_longer_needed: { label: 'No Longer Needed', color: 'bg-gray-100 text-gray-700' }
    };
    return reasons[reason] || { label: reason, color: 'bg-gray-100 text-gray-700' };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-RW', { 
      style: 'currency', 
      currency: 'RWF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const StatCard = ({ icon: Icon, label, value, subValue, change, color, alert }) => (
    <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {alert && (
          <div className="flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            Alert
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
        {subValue && <p className="text-sm text-gray-500 mb-2">{subValue}</p>}
        {change !== undefined && (
          <div className="flex items-center text-sm">
            <TrendingUp className={`w-4 h-4 mr-1 ${change > 0 ? 'text-rose-500 rotate-180' : 'text-emerald-500'}`} />
            <span className={change > 0 ? 'text-rose-600' : 'text-emerald-600'}>
              {Math.abs(change)}% vs last month
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const filteredReturns = returns.filter(ret => {
    const statusMatch = filterStatus === 'all' || ret.status === filterStatus;
    const reasonMatch = filterReason === 'all' || ret.reason === filterReason;
    return statusMatch && reasonMatch;
  });

  const totalReturns = returns.length;
  const pendingReturns = returns.filter(r => r.status === 'pending').length;
  const totalRefunded = returns.filter(r => r.status === 'refunded').reduce((sum, r) => sum + r.refundAmount, 0);
  const returnRate = 2.3;

  const ReturnDetailsModal = ({ returnData, onClose }) => {
    if (!returnData) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Return Details</h2>
              <p className="text-sm text-gray-600">{returnData.returnNumber}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <XCircle className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Status and Actions */}
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border ${getStatusColor(returnData.status)}`}>
                {getStatusIcon(returnData.status)}
                {returnData.status.charAt(0).toUpperCase() + returnData.status.slice(1)}
              </span>
              <div className="flex gap-2">
                {returnData.status === 'pending' && (
                  <>
                    <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                      Approve Return
                    </button>
                    <button className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors">
                      Reject Return
                    </button>
                  </>
                )}
                {returnData.status === 'approved' && (
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Process Refund
                  </button>
                )}
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Customer</p>
                    <p className="text-sm font-medium text-gray-900">{returnData.customer}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{returnData.customerEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{returnData.customerPhone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Original Invoice</p>
                    <p className="text-sm font-medium text-blue-600 cursor-pointer hover:underline">{returnData.originalInvoice}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Return Information */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Order Date</p>
                <p className="text-sm font-medium text-gray-900">{returnData.orderDate}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Return Date</p>
                <p className="text-sm font-medium text-gray-900">{returnData.returnDate}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Reason</p>
                <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getReasonBadge(returnData.reason).color}`}>
                  {getReasonBadge(returnData.reason).label}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Condition</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{returnData.condition}</p>
              </div>
            </div>

            {/* Return Items */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Return Items</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Product</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Unit Price</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {returnData.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.sku}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.qty}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan="4" className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">Total Amount:</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{formatCurrency(returnData.totalAmount)}</td>
                    </tr>
                    {returnData.restockFee > 0 && (
                      <tr>
                        <td colSpan="4" className="px-4 py-2 text-sm text-gray-600 text-right">Restock Fee:</td>
                        <td className="px-4 py-2 text-sm text-rose-600 text-right">-{formatCurrency(returnData.restockFee)}</td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan="4" className="px-4 py-3 text-sm font-bold text-gray-900 text-right">Refund Amount:</td>
                      <td className="px-4 py-3 text-lg font-bold text-emerald-600 text-right">{formatCurrency(returnData.refundAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Notes */}
            {returnData.notes && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Notes</h3>
                <p className="text-sm text-blue-800">{returnData.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Customer Returns</h1>
                <p className="text-sm text-gray-600 mt-1">Manage product returns and refunds</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="90days">Last 90 days</option>
                <option value="year">This year</option>
              </select>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-white font-semibold">
                SM
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              icon={PackageX} 
              label="Total Returns" 
              value={totalReturns.toString()}
              subValue="This period"
              change={-12.5}
              color="bg-gradient-to-br from-orange-500 to-orange-600" 
            />
            <StatCard 
              icon={Clock} 
              label="Pending Review" 
              value={pendingReturns.toString()}
              subValue="Awaiting decision"
              alert={pendingReturns > 0}
              color="bg-gradient-to-br from-amber-500 to-amber-600" 
            />
            <StatCard 
              icon={DollarSign} 
              label="Total Refunded" 
              value={formatCurrency(totalRefunded)}
              subValue="This period"
              change={8.3}
              color="bg-gradient-to-br from-emerald-500 to-emerald-600" 
            />
            <StatCard 
              icon={TrendingUp} 
              label="Return Rate" 
              value={`${returnRate}%`}
              subValue="Of total sales"
              change={-1.2}
              color="bg-gradient-to-br from-blue-500 to-blue-600" 
            />
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-900">All Returns</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search returns..."
                      className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent w-64"
                    />
                  </div>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="processing">Processing</option>
                    <option value="inspection">Inspection</option>
                    <option value="refunded">Refunded</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <select 
                    value={filterReason}
                    onChange={(e) => setFilterReason(e.target.value)}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">All Reasons</option>
                    <option value="defective">Defective</option>
                    <option value="damaged">Damaged</option>
                    <option value="wrong_item">Wrong Item</option>
                    <option value="not_as_described">Not as Described</option>
                    <option value="no_longer_needed">No Longer Needed</option>
                  </select>
                  <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm">
                    <Plus className="w-4 h-4" />
                    New Return
                  </button>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Return ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Original Invoice</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Return Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredReturns.map((returnItem) => (
                    <tr key={returnItem.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900">{returnItem.returnNumber}</span>
                          <span className="text-xs text-gray-500">{returnItem.items.length} items</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-white font-semibold text-sm">
                            {returnItem.customer.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{returnItem.customer}</div>
                            <div className="text-xs text-gray-500">{returnItem.customerEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-blue-600 hover:underline cursor-pointer">
                          {returnItem.originalInvoice}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getReasonBadge(returnItem.reason).color}`}>
                          {getReasonBadge(returnItem.reason).label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{returnItem.returnDate}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{formatCurrency(returnItem.totalAmount)}</div>
                        <div className="text-xs text-emerald-600">Refund: {formatCurrency(returnItem.refundAmount)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${getStatusColor(returnItem.status)}`}>
                          {getStatusIcon(returnItem.status)}
                          {returnItem.status.charAt(0).toUpperCase() + returnItem.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setSelectedReturn(returnItem)}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors" 
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </button>
                          <button className="p-2 hover:bg-emerald-50 rounded-lg transition-colors" title="Process">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          </button>
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <MoreVertical className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Showing {filteredReturns.length} of {returns.length} returns</span>
                <div className="flex gap-2">
                  <button className="px-3 py-1 border border-gray-300 rounded hover:bg-white transition-colors">Previous</button>
                  <button className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors">1</button>
                  <button className="px-3 py-1 border border-gray-300 rounded hover:bg-white transition-colors">2</button>
                  <button className="px-3 py-1 border border-gray-300 rounded hover:bg-white transition-colors">Next</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      {selectedReturn && (
        <ReturnDetailsModal 
          returnData={selectedReturn} 
          onClose={() => setSelectedReturn(null)} 
        />
      )}
    </div>
  );
};

export default CustomerReturnsPage;
