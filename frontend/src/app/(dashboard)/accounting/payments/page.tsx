"use client";

import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, TrendingUp, CheckCircle, Clock, AlertCircle, Search, Download, Plus, MoreVertical } from 'lucide-react';
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

interface Payment {
  payment_id: number;
  payment_number: string;
  payment_date: string;
  payment_type: 'received' | 'sent';
  received_amount: number;
  sent_amount: number;
  payment_method: string;
  status: string;
  reference: string | null;
  created_by_name: string | null;
}

const PaymentsPage = () => {
  const { user } = useAuthStore();
  const currency = "RWF";
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<Payment[]>("/accounting/payments");
        if (response.error) {
          setError(response.error);
          setPayments([]);
        } else {
          setPayments(response.data || []);
        }
      } catch (err) {
        console.error("Error fetching payments:", err);
        setError("Failed to load payments");
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'text-emerald-600 bg-emerald-50';
      case 'processing': return 'text-amber-600 bg-amber-50';
      case 'overdue': return 'text-rose-600 bg-rose-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Clock className="w-4 h-4" />;
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

  const filteredPayments = payments.filter(payment => 
    !searchTerm || 
    payment.payment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.created_by_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalReceived = filteredPayments.filter(p => p.payment_type === 'received').reduce((sum, p) => sum + (p.received_amount || 0), 0);
  const totalSent = filteredPayments.filter(p => p.payment_type === 'sent').reduce((sum, p) => sum + (p.sent_amount || 0), 0);
  const netCashFlow = totalReceived - totalSent;

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
          icon={DollarSign} 
          label="Total Received" 
          value={totalReceived} 
          change={18.2} 
          color="bg-gradient-to-br from-teal-500 to-teal-600" 
        />
        <StatCard 
          icon={CreditCard} 
          label="Total Sent" 
          value={totalSent} 
          change={-3.4} 
          color="bg-gradient-to-br from-indigo-500 to-indigo-600" 
        />
        <StatCard 
          icon={TrendingUp} 
          label="Net Cash Flow" 
          value={netCashFlow} 
          change={24.6} 
          color="bg-gradient-to-br from-emerald-500 to-emerald-600" 
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 md:p-6 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-gray-900">Payments</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-auto pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <button className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Payment</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="block md:hidden divide-y divide-gray-100">
          {filteredPayments.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No payments found</div>
          ) : (
            filteredPayments.map((payment) => {
              const amount = payment.payment_type === 'received' ? payment.received_amount : payment.sent_amount;
              return (
                <div key={payment.payment_id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{payment.payment_number || `PAY-${payment.payment_id}`}</p>
                      <p className="text-sm text-gray-600">{payment.reference || 'No Reference'}</p>
                    </div>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${payment.payment_type === 'received' ? 'bg-teal-50 text-teal-700' : 'bg-indigo-50 text-indigo-700'}`}>
                      {payment.payment_type === 'received' ? 'Received' : 'Sent'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Amount</p>
                      <p className={`font-semibold ${payment.payment_type === 'received' ? 'text-teal-600' : 'text-indigo-600'}`}>
                        {payment.payment_type === 'received' ? '+' : '-'}{formatMoney(amount || 0, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Method</p>
                      <p className="text-gray-700">{payment.payment_method || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      {formatDate(payment.payment_date)}
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                      {getStatusIcon(payment.status)}
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
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
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment ID</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reference</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Method</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">No payments found</td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => {
                    const amount = payment.payment_type === 'received' ? payment.received_amount : payment.sent_amount;
                    return (
                      <tr key={payment.payment_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.payment_number || `PAY-${payment.payment_id}`}</td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${payment.payment_type === 'received' ? 'bg-teal-50 text-teal-700' : 'bg-indigo-50 text-indigo-700'}`}>
                            {payment.payment_type === 'received' ? 'Received' : 'Sent'}
                          </span>
                        </td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-700">{payment.reference || 'No Reference'}</td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {payment.payment_type === 'received' ? '+' : '-'}{formatMoney(amount || 0, currency)}
                        </td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-600">{payment.payment_method || 'N/A'}</td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(payment.payment_date)}</td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                            {getStatusIcon(payment.status)}
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
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

export default PaymentsPage;
