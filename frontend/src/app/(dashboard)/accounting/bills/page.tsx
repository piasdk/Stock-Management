"use client";

import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, AlertCircle, Search, Filter, Plus, MoreVertical, TrendingUp, Edit, Trash2, Eye, DollarSign, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const formatMoney = (value: number, currency = "RWF") =>
  `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}`;

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
};

// Map purchase order status to bill status
const getBillStatus = (status: string): 'draft' | 'submitted' | 'approved' | 'partially_paid' | 'paid' | 'cancelled' => {
  const statusLower = status?.toLowerCase() || '';
  if (statusLower === 'draft') return 'draft';
  if (statusLower === 'pending' || statusLower === 'submitted') return 'submitted';
  if (statusLower === 'approved' || statusLower === 'approved_pending') return 'approved';
  if (statusLower === 'partially_paid' || statusLower === 'partially_received') return 'partially_paid';
  if (statusLower === 'completed' || statusLower === 'received' || statusLower === 'paid') return 'paid';
  if (statusLower === 'cancelled') return 'cancelled';
  // Default mapping
  if (statusLower.includes('draft')) return 'draft';
  if (statusLower.includes('pending')) return 'submitted';
  return 'draft'; // Default to draft for unknown statuses
};

// Get allowed actions based on bill status
const getAllowedActions = (status: string): Array<'view' | 'edit' | 'delete' | 'approve' | 'pay'> => {
  const billStatus = getBillStatus(status);
  switch (billStatus) {
    case 'draft':
      return ['view', 'edit', 'delete'];
    case 'submitted':
      return ['view', 'approve'];
    case 'approved':
      return ['view', 'pay'];
    case 'partially_paid':
      return ['view', 'pay'];
    case 'paid':
      return ['view'];
    case 'cancelled':
      return ['view'];
    default:
      return ['view'];
  }
};

interface BillItem {
  bill_item_id?: number;
  product_id?: number;
  description: string;
  quantity: number;
  unit_cost: number;
  tax_amount?: number;
  line_total: number;
  product_name?: string;
  product_sku?: string;
}

interface Bill {
  bill_id: number;
  bill_number: string;
  bill_date: string;
  due_date: string;
  status: string;
  amount: number;
  total_amount?: number;
  subtotal_amount?: number;
  tax_amount?: number;
  discount_amount?: number;
  currency: string;
  vendor_name: string | null;
  vendor_phone: string | null;
  vendor_email: string | null;
  supplier_address?: string | null;
  notes?: string | null;
  items?: BillItem[];
  po_number?: string;
}

const BillsPage = () => {
  const { user } = useAuthStore();
  const currency = "RWF";
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingBill, setViewingBill] = useState<Bill | null>(null);
  const [loadingBillDetails, setLoadingBillDetails] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<Bill[]>("/accounting/bills");
        if (response.error) {
          setError(response.error);
          setBills([]);
        } else {
          setBills(response.data || []);
        }
      } catch (err) {
        console.error("Error fetching bills:", err);
        setError("Failed to load bills");
        setBills([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, []);

  const getStatusColor = (status: string) => {
    const billStatus = getBillStatus(status);
    switch(billStatus) {
      case 'paid': return 'text-emerald-600 bg-emerald-50';
      case 'approved': return 'text-blue-600 bg-blue-50';
      case 'partially_paid': return 'text-amber-600 bg-amber-50';
      case 'submitted': return 'text-purple-600 bg-purple-50';
      case 'draft': return 'text-gray-600 bg-gray-50';
      case 'cancelled': return 'text-rose-600 bg-rose-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    const billStatus = getBillStatus(status);
    switch(billStatus) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'partially_paid': return <Clock className="w-4 h-4" />;
      case 'submitted': return <Clock className="w-4 h-4" />;
      case 'draft': return <FileText className="w-4 h-4" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    const billStatus = getBillStatus(status);
    const labels: Record<string, string> = {
      'draft': 'Draft',
      'submitted': 'Submitted',
      'approved': 'Approved',
      'partially_paid': 'Partially Paid',
      'paid': 'Paid',
      'cancelled': 'Cancelled'
    };
    return labels[billStatus] || billStatus.charAt(0).toUpperCase() + billStatus.slice(1);
  };

  // Fetch bill details
  const fetchBillDetails = async (billId: number) => {
    try {
      setLoadingBillDetails(true);
      const response = await api.get<Bill>(`/accounting/bills/${billId}`);
      if (response.error) {
        setError(response.error);
        return null;
      }
      return response.data;
    } catch (err) {
      console.error("Error fetching bill details:", err);
      setError("Failed to load bill details");
      return null;
    } finally {
      setLoadingBillDetails(false);
    }
  };

  // Refresh bills list
  const refreshBills = async () => {
    try {
      const response = await api.get<Bill[]>("/accounting/bills");
      if (!response.error && response.data) {
        setBills(response.data || []);
      }
    } catch (err) {
      console.error("Error refreshing bills:", err);
    }
  };

  // Action handlers
  const handleView = async (bill: Bill) => {
    const billDetails = await fetchBillDetails(bill.bill_id);
    if (billDetails) {
      setViewingBill(billDetails);
    }
  };

  const handleEdit = (bill: Bill) => {
    // TODO: Implement edit bill functionality
    alert(`Edit functionality for bill ${bill.bill_number} will be implemented soon.`);
  };

  const handleDelete = async (bill: Bill) => {
    if (!confirm(`Are you sure you want to delete bill ${bill.bill_number || bill.bill_id}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await api.delete(`/accounting/bills/${bill.bill_id}`);
      if (response.error) {
        alert(`Error: ${response.error}`);
        return;
      }
      
      // Refresh bills list
      await refreshBills();
    } catch (err) {
      console.error("Error deleting bill:", err);
      alert("Failed to delete bill. Please try again.");
    }
  };

  const handleApprove = async (bill: Bill) => {
    if (!confirm(`Approve bill ${bill.bill_number || bill.bill_id}?`)) {
      return;
    }
    
    try {
      const response = await api.put(`/accounting/bills/${bill.bill_id}/status`, { status: 'approved' });
      if (response.error) {
        alert(`Error: ${response.error}`);
        return;
      }
      
      // Refresh bills list
      await refreshBills();
    } catch (err) {
      console.error("Error approving bill:", err);
      alert("Failed to approve bill. Please try again.");
    }
  };

  const handlePay = async (bill: Bill) => {
    const billDetails = await fetchBillDetails(bill.bill_id);
    if (billDetails) {
      setPayingBill(billDetails);
      setShowPayModal(true);
    }
  };

  const StatCard = ({ icon: Icon, label, value, change, color }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: number;
    change?: number;
    color: string;
  }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <h3 className="text-3xl font-bold text-gray-900">{formatMoney(value, currency)}</h3>
          {change !== undefined && change !== 0 && (
            <div className="flex items-center mt-2 text-sm">
              <TrendingUp className={`w-4 h-4 mr-1 ${change > 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
              <span className={change > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {change > 0 ? '+' : ''}{change.toFixed(1)}% from last month
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  const filteredBills = bills.filter(bill => 
    !searchTerm || 
    bill.bill_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalBills = filteredBills.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);
  const paidBills = filteredBills.filter(bill => getBillStatus(bill.status) === 'paid').reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);
  const outstanding = filteredBills.filter(bill => getBillStatus(bill.status) !== 'paid' && getBillStatus(bill.status) !== 'cancelled').reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);
  
  // Calculate month-over-month changes (simplified - you can enhance this with actual date comparisons)
  const calculateChange = (current: number) => {
    // For now, return 0 as we don't have historical data
    // TODO: Implement proper month-over-month calculation
    return 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={FileText} 
          label="Total Bills" 
          value={totalBills} 
          change={calculateChange(totalBills)} 
          color="bg-gradient-to-br from-purple-500 to-purple-600" 
        />
        <StatCard 
          icon={CheckCircle} 
          label="Paid Bills" 
          value={paidBills} 
          change={calculateChange(paidBills)} 
          color="bg-gradient-to-br from-emerald-500 to-emerald-600" 
        />
        <StatCard 
          icon={Clock} 
          label="Outstanding" 
          value={outstanding} 
          change={calculateChange(outstanding)} 
          color="bg-gradient-to-br from-rose-500 to-rose-600" 
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 md:p-6 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-gray-900">Bills</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search bills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-auto pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <button className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filter</span>
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Bill</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="block md:hidden divide-y divide-gray-100">
          {filteredBills.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No bills found</div>
          ) : (
            filteredBills.map((bill) => {
              const billStatus = getBillStatus(bill.status);
              const allowedActions = getAllowedActions(bill.status);
              return (
                <div key={bill.bill_id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{bill.bill_number || `BILL-${bill.bill_id}`}</p>
                      <p className="text-sm text-gray-600">{bill.vendor_name || 'No Vendor'}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                      {getStatusIcon(bill.status)}
                      <span className="hidden sm:inline">{getStatusLabel(bill.status)}</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Amount</p>
                      <p className="font-semibold text-gray-900">{formatMoney(bill.amount || 0, bill.currency || currency)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date</p>
                      <p className="text-gray-700">{formatDate(bill.bill_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      Due: {formatDate(bill.due_date)}
                    </div>
                    <div className="flex items-center gap-1">
                      {allowedActions.includes('view') && (
                        <button
                          onClick={() => handleView(bill)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                      {allowedActions.includes('edit') && (
                        <button
                          onClick={() => handleEdit(bill)}
                          className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                      {allowedActions.includes('delete') && (
                        <button
                          onClick={() => handleDelete(bill)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                      {allowedActions.includes('approve') && (
                        <button
                          onClick={() => handleApprove(bill)}
                          className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </button>
                      )}
                      {allowedActions.includes('pay') && (
                        <button
                          onClick={() => handlePay(bill)}
                          className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                          title="Pay"
                        >
                          <DollarSign className="w-4 h-4 text-purple-600" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Bill ID</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Vendor</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No bills found</td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => {
                    const billStatus = getBillStatus(bill.status);
                    const allowedActions = getAllowedActions(bill.status);
                    return (
                      <tr key={bill.bill_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bill.bill_number || `BILL-${bill.bill_id}`}</td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-700">{bill.vendor_name || 'No Vendor'}</td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatMoney(bill.amount || 0, bill.currency || currency)}</td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(bill.bill_date)}</td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(bill.due_date)}</td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                            {getStatusIcon(bill.status)}
                            {getStatusLabel(bill.status)}
                          </span>
                        </td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-1">
                            {allowedActions.includes('view') && (
                              <button
                                onClick={() => handleView(bill)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="View"
                              >
                                <Eye className="w-4 h-4 text-gray-600" />
                              </button>
                            )}
                            {allowedActions.includes('edit') && (
                              <button
                                onClick={() => handleEdit(bill)}
                                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4 text-blue-600" />
                              </button>
                            )}
                            {allowedActions.includes('delete') && (
                              <button
                                onClick={() => handleDelete(bill)}
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            )}
                            {allowedActions.includes('approve') && (
                              <button
                                onClick={() => handleApprove(bill)}
                                className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </button>
                            )}
                            {allowedActions.includes('pay') && (
                              <button
                                onClick={() => handlePay(bill)}
                                className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                                title="Pay"
                              >
                                <DollarSign className="w-4 h-4 text-purple-600" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Bill Modal */}
      {viewingBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Bill Details</h2>
              <button
                onClick={() => setViewingBill(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            {loadingBillDetails ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Bill Header */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number</label>
                    <p className="text-sm text-gray-900 font-mono">{viewingBill.bill_number || `BILL-${viewingBill.bill_id}`}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(viewingBill.status)}`}>
                      {getStatusIcon(viewingBill.status)}
                      {getStatusLabel(viewingBill.status)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bill Date</label>
                    <p className="text-sm text-gray-900">{formatDate(viewingBill.bill_date)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <p className="text-sm text-gray-900">{formatDate(viewingBill.due_date)}</p>
                  </div>
                </div>

                {/* Vendor Information */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Vendor Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                      <p className="text-sm text-gray-900">{viewingBill.vendor_name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <p className="text-sm text-gray-900">{viewingBill.vendor_phone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-sm text-gray-900">{viewingBill.vendor_email || 'N/A'}</p>
                    </div>
                    {viewingBill.supplier_address && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <p className="text-sm text-gray-900">{viewingBill.supplier_address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bill Items */}
                {viewingBill.items && viewingBill.items.length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill Items</h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Description</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Quantity</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Unit Cost</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Tax</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {viewingBill.items.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {item.product_name ? `${item.product_name} (${item.product_sku || 'N/A'})` : item.description}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">{Number(item.quantity).toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{formatMoney(item.unit_cost, viewingBill.currency || currency)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{formatMoney(item.tax_amount || 0, viewingBill.currency || currency)}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatMoney(item.line_total, viewingBill.currency || currency)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Bill Totals */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-end">
                    <div className="w-full md:w-64 space-y-2">
                      {viewingBill.subtotal_amount !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="text-gray-900">{formatMoney(viewingBill.subtotal_amount, viewingBill.currency || currency)}</span>
                        </div>
                      )}
                      {viewingBill.discount_amount && Number(viewingBill.discount_amount) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Discount</span>
                          <span className="text-gray-900">-{formatMoney(viewingBill.discount_amount, viewingBill.currency || currency)}</span>
                        </div>
                      )}
                      {viewingBill.tax_amount && Number(viewingBill.tax_amount) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax</span>
                          <span className="text-gray-900">{formatMoney(viewingBill.tax_amount, viewingBill.currency || currency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2">
                        <span className="text-gray-900">Total</span>
                        <span className="text-gray-900">{formatMoney(viewingBill.total_amount || viewingBill.amount, viewingBill.currency || currency)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {viewingBill.notes && (
                  <div className="border-t border-gray-200 pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{viewingBill.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setViewingBill(null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  {getAllowedActions(viewingBill.status).includes('approve') && (
                    <button
                      onClick={async () => {
                        setViewingBill(null);
                        await handleApprove(viewingBill);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Approve Bill
                    </button>
                  )}
                  {getAllowedActions(viewingBill.status).includes('pay') && (
                    <button
                      onClick={async () => {
                        setViewingBill(null);
                        await handlePay(viewingBill);
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Pay Bill
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pay Bill Modal */}
      {showPayModal && payingBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Pay Bill</h2>
              <button
                onClick={() => {
                  setShowPayModal(false);
                  setPayingBill(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number</label>
                <p className="text-sm text-gray-900 font-mono">{payingBill.bill_number || `BILL-${payingBill.bill_id}`}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                <p className="text-sm text-gray-900">{payingBill.vendor_name || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                <p className="text-2xl font-bold text-gray-900">{formatMoney(payingBill.total_amount || payingBill.amount, payingBill.currency || currency)}</p>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-4">Payment functionality will be implemented soon. This will allow you to record payments against this bill.</p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowPayModal(false);
                      setPayingBill(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      // For now, just mark as paid
                      try {
                        const response = await api.put(`/accounting/bills/${payingBill.bill_id}/status`, { status: 'paid' });
                        if (response.error) {
                          alert(`Error: ${response.error}`);
                          return;
                        }
                        setShowPayModal(false);
                        setPayingBill(null);
                        await refreshBills();
                      } catch (err) {
                        console.error("Error paying bill:", err);
                        alert("Failed to mark bill as paid. Please try again.");
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Mark as Paid
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};

export default BillsPage;

