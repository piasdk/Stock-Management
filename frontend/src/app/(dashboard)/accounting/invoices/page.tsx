"use client";

import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, AlertCircle, Search, Filter, Plus, MoreVertical, TrendingUp, X, User, Calendar, DollarSign } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

const getStatusFromSalesOrder = (status: string) => {
  // Map sales order status to invoice status
  if (status === 'completed' || status === 'shipped') return 'paid';
  if (status === 'pending' || status === 'draft') return 'pending';
  if (status === 'cancelled') return 'overdue';
  return status;
};

interface Invoice {
  invoice_id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: string;
  amount: number;
  currency: string;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
}

interface Customer {
  customer_id: number;
  name: string;
  email?: string;
  phone?: string;
}

const InvoicesPage = () => {
  const { user } = useAuthStore();
  const currency = "RWF";
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  
  const [invoiceForm, setInvoiceForm] = useState({
    customer_id: "",
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    total_amount: "",
    currency: "RWF",
    notes: "",
    status: "draft",
  });

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<Invoice[]>("/accounting/invoices");
        if (response.error) {
          setError(response.error);
          setInvoices([]);
        } else {
          setInvoices(response.data || []);
        }
      } catch (err) {
        console.error("Error fetching invoices:", err);
        setError("Failed to load invoices");
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!showInvoiceForm) return;
      try {
        setLoadingCustomers(true);
        const response = await api.get<Customer[]>("/customers");
        if (response.data && Array.isArray(response.data)) {
          setCustomers(response.data.filter((c: any) => c.is_active !== 0));
        }
      } catch (err) {
        console.error("Error fetching customers:", err);
      } finally {
        setLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, [showInvoiceForm]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!invoiceForm.customer_id) {
      setFormError("Please select a customer");
      return;
    }

    if (!invoiceForm.total_amount || parseFloat(invoiceForm.total_amount) <= 0) {
      setFormError("Please enter a valid amount");
      return;
    }

    setSubmitting(true);

    try {
      // Create a sales order (which becomes an invoice)
      const salesOrderData = {
        customer_id: Number(invoiceForm.customer_id),
        order_date: invoiceForm.invoice_date,
        status: invoiceForm.status,
        total_amount: parseFloat(invoiceForm.total_amount),
        currency: invoiceForm.currency,
        notes: invoiceForm.notes || null,
      };

      const response = await api.post("/sales", salesOrderData);

      if (response.error) {
        setFormError(response.error);
      } else {
        setFormSuccess("Invoice created successfully!");
        setInvoiceForm({
          customer_id: "",
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          total_amount: "",
          currency: "RWF",
          notes: "",
          status: "draft",
        });
        setShowInvoiceForm(false);
        
        // Refresh invoices list
        const invoicesResponse = await api.get<Invoice[]>("/accounting/invoices");
        if (invoicesResponse.data) {
          setInvoices(invoicesResponse.data);
        }
        
        setTimeout(() => setFormSuccess(null), 3000);
      }
    } catch (err) {
      console.error("Error creating invoice:", err);
      setFormError("Failed to create invoice. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const invoiceStatus = getStatusFromSalesOrder(status);
    switch(invoiceStatus) {
      case 'paid': return 'text-emerald-600 bg-emerald-50';
      case 'pending': return 'text-amber-600 bg-amber-50';
      case 'overdue': return 'text-rose-600 bg-rose-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    const invoiceStatus = getStatusFromSalesOrder(status);
    switch(invoiceStatus) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'overdue': return <AlertCircle className="w-4 h-4" />;
      default: return null;
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
          {change !== undefined && (
            <div className="flex items-center mt-2 text-sm">
              <TrendingUp className={`w-4 h-4 mr-1 ${change > 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
              <span className={change > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {change > 0 ? '+' : ''}{change}% from last month
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

  // Filter invoices by search term
  const filteredInvoices = invoices.filter(inv => 
    !searchTerm || 
    inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals
  const totalInvoiced = filteredInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const paidInvoices = filteredInvoices.filter(inv => getStatusFromSalesOrder(inv.status) === 'paid').reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const outstanding = filteredInvoices.filter(inv => getStatusFromSalesOrder(inv.status) !== 'paid').reduce((sum, inv) => sum + (inv.amount || 0), 0);

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
          label="Total Invoiced" 
          value={totalInvoiced} 
          change={12.5} 
          color="bg-gradient-to-br from-blue-500 to-blue-600" 
        />
        <StatCard 
          icon={CheckCircle} 
          label="Paid Invoices" 
          value={paidInvoices} 
          change={8.3} 
          color="bg-gradient-to-br from-emerald-500 to-emerald-600" 
        />
        <StatCard 
          icon={Clock} 
          label="Outstanding" 
          value={outstanding} 
          change={-4.2} 
          color="bg-gradient-to-br from-amber-500 to-amber-600" 
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 md:p-6 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-gray-900">Invoices</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-auto pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filter</span>
              </button>
              <button 
                onClick={() => setShowInvoiceForm(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Invoice</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile: Card Layout */}
        <div className="block md:hidden divide-y divide-gray-100">
          {filteredInvoices.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No invoices found</div>
          ) : (
            filteredInvoices.map((invoice) => {
              const invoiceStatus = getStatusFromSalesOrder(invoice.status);
              return (
                <div key={invoice.invoice_id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{invoice.invoice_number || `INV-${invoice.invoice_id}`}</p>
                      <p className="text-sm text-gray-600">{invoice.client_name || 'No Client'}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {getStatusIcon(invoice.status)}
                      <span className="hidden sm:inline">{invoiceStatus.charAt(0).toUpperCase() + invoiceStatus.slice(1)}</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Amount</p>
                      <p className="font-semibold text-gray-900">{formatMoney(invoice.amount || 0, invoice.currency || currency)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date</p>
                      <p className="text-gray-700">{formatDate(invoice.invoice_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      Due: {formatDate(invoice.due_date)}
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop: Table Layout */}
        <div className="hidden md:block overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice ID</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Client</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No invoices found</td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice, idx) => {
                    const invoiceStatus = getStatusFromSalesOrder(invoice.status);
                    return (
                      <tr key={invoice.invoice_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.invoice_number || `INV-${invoice.invoice_id}`}</td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-700">{invoice.client_name || 'No Client'}</td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatMoney(invoice.amount || 0, invoice.currency || currency)}</td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(invoice.invoice_date)}</td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(invoice.due_date)}</td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                            {getStatusIcon(invoice.status)}
                            {invoiceStatus.charAt(0).toUpperCase() + invoiceStatus.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm">
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <MoreVertical className="w-4 h-4 text-gray-600" />
                          </button>
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

      {/* New Invoice Form Modal */}
      <Modal
        open={showInvoiceForm}
        onClose={() => {
          setShowInvoiceForm(false);
          setFormError(null);
          setFormSuccess(null);
        }}
        title="Create New Invoice"
        size="lg"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-6">
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{formError}</p>
            </div>
          )}

          {formSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">{formSuccess}</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label htmlFor="customer_id" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Customer *
              </Label>
              {loadingCustomers ? (
                <div className="flex items-center justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <select
                  id="customer_id"
                  required
                  value={invoiceForm.customer_id}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, customer_id: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={submitting}
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.customer_id} value={customer.customer_id}>
                      {customer.name} {customer.email ? `(${customer.email})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Invoice Date */}
            <div className="space-y-2">
              <Label htmlFor="invoice_date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Invoice Date *
              </Label>
              <Input
                id="invoice_date"
                type="date"
                required
                value={invoiceForm.invoice_date}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })}
                disabled={submitting}
              />
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="due_date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Due Date *
              </Label>
              <Input
                id="due_date"
                type="date"
                required
                value={invoiceForm.due_date}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                disabled={submitting}
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="total_amount" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Amount *
              </Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={invoiceForm.total_amount}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, total_amount: e.target.value })}
                disabled={submitting}
              />
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <select
                id="currency"
                required
                value={invoiceForm.currency}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, currency: e.target.value })}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={submitting}
              >
                <option value="RWF">RWF - Rwandan Franc</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="NGN">NGN - Nigerian Naira</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <select
                id="status"
                required
                value={invoiceForm.status}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value })}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={submitting}
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Additional notes about this invoice..."
              value={invoiceForm.notes}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={submitting}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowInvoiceForm(false);
                setFormError(null);
                setFormSuccess(null);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invoice
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

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

export default InvoicesPage;
