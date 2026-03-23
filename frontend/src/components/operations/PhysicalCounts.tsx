"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, Package, AlertCircle, CheckCircle, Clock, Search, Camera, 
  FileText, TrendingUp, Plus, Eye, EyeOff, X, Printer
} from 'lucide-react';
import { api } from "@/lib/api";

const PhysicalCounts = () => {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('scheduled');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCountTypeInfo, setShowCountTypeInfo] = useState(false);
  const [blindCount, setBlindCount] = useState(true);
  const [viewingProgress, setViewingProgress] = useState<any>(null);

  // State for data from API
  const [scheduledCounts, setScheduledCounts] = useState<any[]>([]);
  const [ongoingCounts, setOngoingCounts] = useState<any[]>([]);
  const [completedCounts, setCompletedCounts] = useState<any[]>([]);
  const [variances, setVariances] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    lastCount: 'N/A',
    countAccuracy: '0%',
    accuracyChange: '0%',
    itemsCounted90d: 0,
    completedCounts: 0,
    pendingVariances: 0,
    avgCountTime: 'N/A'
  });
  const [loading, setLoading] = useState(false);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [loadingInProgress, setLoadingInProgress] = useState(false);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [loadingVariances, setLoadingVariances] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for locations and users
  const [locations, setLocations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [countForm, setCountForm] = useState({
    countType: 'cycle',
    location: '',
    scheduledDate: '',
    assignedTo: '',
    notes: '',
    categories: [],
    abcClass: '',
    lastCountedBefore: ''
  });

  // Load data on mount
  useEffect(() => {
    loadStats();
    loadLocations();
    loadUsers();
    // Load initial tab data
    loadTabData(activeTab);
  }, []);

  // Load data when tab changes
  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab]);

  const loadTabData = async (tab: string) => {
    switch (tab) {
      case 'scheduled':
        await loadScheduledCounts();
        break;
      case 'in-progress':
        await loadInProgressCounts();
        break;
      case 'completed':
        await loadCompletedCounts();
        break;
      case 'variances':
        await loadVariances();
        break;
    }
  };

  const loadScheduledCounts = async () => {
    setLoadingScheduled(true);
    setError(null);
    try {
      const response = await api.get<any[]>("/operations/physical-counts?status=scheduled");
      
      if (response.data) {
        setScheduledCounts(Array.isArray(response.data) ? response.data : []);
      } else {
        setScheduledCounts([]);
      }
    } catch (err: any) {
      console.error('Error loading scheduled counts:', err);
      setError(err.error || 'Failed to load scheduled counts');
      setScheduledCounts([]);
    } finally {
      setLoadingScheduled(false);
    }
  };

  const loadInProgressCounts = async () => {
    setLoadingInProgress(true);
    setError(null);
    try {
      const response = await api.get<any[]>("/operations/physical-counts?status=in_progress");
      
      if (response.data) {
        setOngoingCounts(Array.isArray(response.data) ? response.data : []);
      } else {
        setOngoingCounts([]);
      }
    } catch (err: any) {
      console.error('Error loading in-progress counts:', err);
      setError(err.error || 'Failed to load in-progress counts');
      setOngoingCounts([]);
    } finally {
      setLoadingInProgress(false);
    }
  };

  const loadCompletedCounts = async () => {
    setLoadingCompleted(true);
    setError(null);
    try {
      const response = await api.get<any[]>("/operations/physical-counts?status=completed");
      
      if (response.data) {
        setCompletedCounts(Array.isArray(response.data) ? response.data : []);
      } else {
        setCompletedCounts([]);
      }
    } catch (err: any) {
      console.error('Error loading completed counts:', err);
      setError(err.error || 'Failed to load completed counts');
      setCompletedCounts([]);
    } finally {
      setLoadingCompleted(false);
    }
  };

  const loadVariances = async () => {
    setLoadingVariances(true);
    setError(null);
    try {
      // Load completed counts and filter those with variances
      const response = await api.get<any[]>("/operations/physical-counts?status=completed");
      
      if (response.data && Array.isArray(response.data)) {
        const allVariances: any[] = [];
        response.data.forEach((count: any) => {
          // Check if count has variances (variances_count > 0 or variances > 0)
          const varianceCount = count.variances_count || count.variances || 0;
          if (varianceCount > 0) {
            // Extract numeric variance value (handle both raw number and formatted string)
            let varianceValue = 0;
            if (count.variance_value !== undefined && count.variance_value !== null) {
              varianceValue = typeof count.variance_value === 'number' 
                ? count.variance_value 
                : parseFloat(String(count.variance_value).replace(/[^0-9.-]/g, '')) || 0;
            } else if (count.varianceValue !== undefined && count.varianceValue !== null) {
              varianceValue = typeof count.varianceValue === 'number' 
                ? count.varianceValue 
                : parseFloat(String(count.varianceValue).replace(/[^0-9.-]/g, '')) || 0;
            }

            allVariances.push({
              id: `VAR-${count.id}`,
              count_id: count.id,
              location: count.location || count.location_name || 'Unknown',
              variances_count: varianceCount,
              variance_value: varianceValue
            });
          }
        });
        setVariances(allVariances);
      } else {
        setVariances([]);
      }
    } catch (err: any) {
      console.error('Error loading variances:', err);
      setError(err.error || 'Failed to load variances');
      setVariances([]);
    } finally {
      setLoadingVariances(false);
    }
  };

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const response = await api.get<any>("/operations/physical-counts/stats?days=90");
      
      if (response.data) {
        setStats(response.data);
      }
    } catch (err: any) {
      console.error('Error loading stats:', err);
      // Don't set error for stats, just use defaults
    } finally {
      setLoadingStats(false);
    }
  };

  const loadLocations = async () => {
    setLoadingLocations(true);
    try {
      const response = await api.get<any[]>("/inventory/locations");
      if (response.data) {
        setLocations(response.data);
      }
    } catch (err: any) {
      console.error('Error loading locations:', err);
    } finally {
      setLoadingLocations(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await api.get<any[]>("/auth/users");
      if (response.data) {
        setUsers(response.data);
      }
    } catch (err: any) {
      console.error('Error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleScheduleCount = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!countForm.scheduledDate || !countForm.assignedTo) {
      setError('Please fill in all required fields');
      return;
    }

    const assignedToNum = Number(countForm.assignedTo);
    if (isNaN(assignedToNum) || assignedToNum <= 0) {
      setError('Please select a valid user');
      return;
    }

    try {
      const payload = {
        count_type: countForm.countType,
        location_id: countForm.location && countForm.location !== 'all' ? Number(countForm.location) : null,
        scheduled_date: countForm.scheduledDate.split('T')[0], // Extract date from datetime-local
        assigned_to: assignedToNum,
        notes: countForm.notes || null
      };

      const response = await api.post("/operations/physical-counts", payload);
      
      if (response.error) {
        setError(response.error || 'Failed to schedule count');
        return;
      }

      setShowScheduleModal(false);
      setCountForm({
        countType: 'cycle',
        location: '',
        scheduledDate: '',
        assignedTo: '',
        notes: '',
        categories: [],
        abcClass: '',
        lastCountedBefore: ''
      });
      await loadScheduledCounts();
      await loadStats();
      alert('Physical count scheduled successfully!');
    } catch (err: any) {
      console.error('Error scheduling count:', err);
      setError(err.error || err.message || 'Failed to schedule count');
    }
  };

  const handleStartCount = async (countId: string) => {
    if (!confirm('Start this physical count now? This will change its status to "In Progress".')) {
      return;
    }

    try {
      const response = await api.put(`/operations/physical-counts/${encodeURIComponent(countId)}/start`, {});
      
      if (response.error) {
        setError(response.error || 'Failed to start count');
        return;
      }

      await loadScheduledCounts();
      await loadInProgressCounts();
      await loadStats();
      alert('Physical count started successfully!');
    } catch (err: any) {
      console.error('Error starting count:', err);
      setError(err.error || err.message || 'Failed to start count');
    }
  };

  const handleViewProgress = (count: any) => {
    setViewingProgress(count);
  };

  const handleCompleteCount = async (countId: string) => {
    if (!confirm('Complete this physical count? This will mark it as finished and calculate final variances.')) {
      return;
    }

    try {
      const response = await api.put(`/operations/physical-counts/${encodeURIComponent(countId)}/complete`, {});
      
      if (response.error) {
        setError(response.error || 'Failed to complete count');
        return;
      }

      await loadInProgressCounts();
      await loadCompletedCounts();
      await loadVariances();
      await loadStats();
      alert('Physical count completed successfully!');
    } catch (err: any) {
      console.error('Error completing count:', err);
      setError(err.error || err.message || 'Failed to complete count');
    }
  };

  const handleContinueCounting = (count: any) => {
    router.push(`/operations/physical-counts/${encodeURIComponent(count.id)}/count`);
  };

  const handlePrintSheet = (count: any) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Physical Count Sheet - ${count.id}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>Physical Count Sheet</h1>
            <p><strong>Count ID:</strong> ${count.id}</p>
            <p><strong>Type:</strong> ${count.type.toUpperCase()}</p>
            <p><strong>Location:</strong> ${count.location}</p>
            <p><strong>Scheduled Date:</strong> ${new Date(count.scheduledDate).toLocaleDateString()}</p>
            <p><strong>Assigned To:</strong> ${count.assignedTo}</p>
            ${count.notes ? `<p><strong>Notes:</strong> ${count.notes}</p>` : ''}
            <hr>
            <p><em>Use this sheet to record physical inventory counts. Fill in the actual quantities below.</em></p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Stats are now loaded from backend via loadStats()

  const CountTypeInfoModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Understanding Count Types</h2>
            <button onClick={() => setShowCountTypeInfo(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="space-y-6">
            <div className="border border-blue-200 rounded-lg p-5 bg-blue-50">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Cycle Count</h3>
                  <p className="text-sm text-blue-600 font-medium">Recommended for regular operations</p>
                </div>
              </div>
              <div className="ml-13 space-y-2 text-sm text-gray-700">
                <p><strong>What:</strong> Count a small portion of inventory on a rotating schedule</p>
                <p><strong>When:</strong> Daily, weekly, or monthly - count different items each time</p>
                <p><strong>Best for:</strong> High-value items (A-class), fast movers, or problem items</p>
                <p><strong>Example:</strong> Count 20% of inventory every week = full count every 5 weeks</p>
                <div className="mt-3 bg-white rounded p-3 border border-blue-200">
                  <p className="font-medium text-blue-900 mb-2">Advantages:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>No business disruption - done during normal hours</li>
                    <li>Catches errors quickly before they grow</li>
                    <li>Staff become experts at counting</li>
                    <li>Better accuracy than annual counts</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="border border-purple-200 rounded-lg p-5 bg-purple-50">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Full Physical Count</h3>
                  <p className="text-sm text-purple-600 font-medium">Year-end or major audit</p>
                </div>
              </div>
              <div className="ml-13 space-y-2 text-sm text-gray-700">
                <p><strong>What:</strong> Count ALL inventory at once - every single item</p>
                <p><strong>When:</strong> Year-end, after major events, or for audits</p>
                <p><strong>Best for:</strong> Financial reporting, audit requirements, major reconciliations</p>
                <p><strong>Example:</strong> Close the warehouse on Sunday and count everything</p>
                <div className="mt-3 bg-white rounded p-3 border border-purple-200">
                  <p className="font-medium text-purple-900 mb-2">Important Notes:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Usually requires operations to stop</li>
                    <li>Takes significant time and staff</li>
                    <li>Often done annually or bi-annually</li>
                    <li>Required by auditors for financial statements</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="border border-orange-200 rounded-lg p-5 bg-orange-50">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Spot Check</h3>
                  <p className="text-sm text-orange-600 font-medium">Random verification</p>
                </div>
              </div>
              <div className="ml-13 space-y-2 text-sm text-gray-700">
                <p><strong>What:</strong> Random, unscheduled counts of specific items</p>
                <p><strong>When:</strong> When you suspect issues or need quick verification</p>
                <p><strong>Best for:</strong> Investigating discrepancies, verifying complaints, theft prevention</p>
                <p><strong>Example:</strong> Customer says item is out of stock but system shows 10 in stock</p>
                <div className="mt-3 bg-white rounded p-3 border border-orange-200">
                  <p className="font-medium text-orange-900 mb-2">Use Cases:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>After receiving a customer complaint</li>
                    <li>When system shows stock but cannot fulfill order</li>
                    <li>Investigating suspected theft or damage</li>
                    <li>Verifying high-value items randomly</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-5 border border-green-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Pro Tip: ABC Analysis for Cycle Counts
              </h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white rounded p-3 border border-green-200">
                  <p className="font-semibold text-green-700 mb-1">A-Class (20% of items)</p>
                  <p className="text-gray-600 text-xs">High-value items = 80% of inventory value</p>
                  <p className="text-green-600 font-medium mt-2">Count: Monthly or weekly</p>
                </div>
                <div className="bg-white rounded p-3 border border-blue-200">
                  <p className="font-semibold text-blue-700 mb-1">B-Class (30% of items)</p>
                  <p className="text-gray-600 text-xs">Medium-value items = 15% of value</p>
                  <p className="text-blue-600 font-medium mt-2">Count: Quarterly</p>
                </div>
                <div className="bg-white rounded p-3 border border-gray-300">
                  <p className="font-semibold text-gray-700 mb-1">C-Class (50% of items)</p>
                  <p className="text-gray-600 text-xs">Low-value items = 5% of value</p>
                  <p className="text-gray-600 font-medium mt-2">Count: Annually</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowCountTypeInfo(false)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Got It!
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const ScheduleModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Schedule New Count</h2>
            <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          <form onSubmit={handleScheduleCount} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Count Type *</label>
                <button
                  type="button"
                  onClick={() => setShowCountTypeInfo(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3" />
                  What do these mean?
                </button>
              </div>
              <select
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                value={countForm.countType}
                onChange={(e) => setCountForm({...countForm, countType: e.target.value})}
                required
              >
                <option value="cycle">Cycle Count (Regular rotating count)</option>
                <option value="full">Full Physical Count (Count everything)</option>
                <option value="spot">Spot Check (Random verification)</option>
              </select>
            </div>
            {countForm.countType === 'cycle' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-3">Cycle Count Options</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ABC Class</label>
                    <select 
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                      value={countForm.abcClass}
                      onChange={(e) => setCountForm({...countForm, abcClass: e.target.value})}
                    >
                      <option value="">All Classes</option>
                      <option value="A">A-Class (High Value - Count Monthly)</option>
                      <option value="B">B-Class (Medium Value - Count Quarterly)</option>
                      <option value="C">C-Class (Low Value - Count Annually)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Items Not Counted Since</label>
                    <input 
                      type="date" 
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                      value={countForm.lastCountedBefore}
                      onChange={(e) => setCountForm({...countForm, lastCountedBefore: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                value={countForm.location}
                onChange={(e) => setCountForm({...countForm, location: e.target.value})}
                required
              >
                <option value="">Select Location</option>
                <option value="all">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc.location_id} value={loc.location_id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Date *</label>
              <input 
                type="datetime-local" 
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                value={countForm.scheduledDate}
                onChange={(e) => setCountForm({...countForm, scheduledDate: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign To *</label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                value={countForm.assignedTo}
                onChange={(e) => setCountForm({...countForm, assignedTo: e.target.value})}
                required
              >
                <option value="">Select User</option>
                {users.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <input
                  type="checkbox"
                  checked={blindCount}
                  onChange={(e) => setBlindCount(e.target.checked)}
                  className="rounded"
                />
                <span>Blind Count (Recommended)</span>
                {blindCount ? <EyeOff className="w-4 h-4 text-blue-600" /> : <Eye className="w-4 h-4 text-gray-400" />}
              </label>
              <p className="text-xs text-gray-500 ml-6">
                Hides expected quantities during counting to prevent bias and improve accuracy
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                rows={3}
                placeholder="Add any special instructions or notes..."
                value={countForm.notes}
                onChange={(e) => setCountForm({...countForm, notes: e.target.value})}
              />
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Schedule Count
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  const VarianceInvestigation = ({ variance }: { variance: any }) => (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">Variance from Count: {variance.count_id}</h4>
          <p className="text-sm text-gray-500">Location: {variance.location}</p>
        </div>
        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
          {variance.variances_count} variance(s)
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-gray-500">Variance Count</p>
          <p className="font-semibold text-gray-900">{variance.variances_count}</p>
        </div>
        <div>
          <p className="text-gray-500">Value Impact</p>
          <p className={`font-semibold ${(variance.variance_value || 0) > 0 ? 'text-green-600' : (variance.variance_value || 0) < 0 ? 'text-red-600' : 'text-gray-600'}`}>
            {(variance.variance_value || 0) > 0 ? '+' : ''}RWF {Math.abs(variance.variance_value || 0).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button 
          onClick={() => router.push(`/operations/physical-counts/${encodeURIComponent(variance.count_id)}/count`)}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          View Details
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {showScheduleModal && <ScheduleModal />}
      {showCountTypeInfo && <CountTypeInfoModal />}

      {/* View Progress Modal */}
      {viewingProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Count Progress: {viewingProgress.id}
              </h3>
              <button
                onClick={() => setViewingProgress(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{viewingProgress.location}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{viewingProgress.type.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Assigned To</p>
                  <p className="font-medium">{viewingProgress.assignedTo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Started Date</p>
                  <p className="font-medium">
                    {viewingProgress.startedDate 
                      ? new Date(viewingProgress.startedDate).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-gray-700">Progress</p>
                  <p className="text-sm font-medium text-gray-900">
                    {viewingProgress.progress}%
                  </p>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${viewingProgress.progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {viewingProgress.countedItems} of {viewingProgress.items} items counted
                </p>
              </div>
              {viewingProgress.notes && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Notes</p>
                  <p className="text-sm text-gray-600">{viewingProgress.notes}</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  onClick={() => setViewingProgress(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Physical Counts</h1>
              <p className="text-gray-600 mt-1">Maintain inventory accuracy through systematic counting</p>
            </div>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Schedule Count
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Last Count</p>
            <p className="text-lg font-semibold text-gray-900">{stats.lastCount}</p>
            <p className="text-xs text-gray-500 mt-1">
              {completedCounts.length > 0 ? 'Recently completed' : 'No counts yet'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Count Accuracy</p>
            <p className="text-lg font-semibold text-green-600">{stats.countAccuracy}</p>
            <p className="text-xs text-green-600 mt-1">{stats.accuracyChange} vs last period</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Items Counted (90d)</p>
            <p className="text-lg font-semibold text-gray-900">{stats.itemsCounted90d}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.completedCounts} completed counts</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Pending Variances</p>
            <p className="text-lg font-semibold text-orange-600">{stats.pendingVariances}</p>
            <p className="text-xs text-orange-600 mt-1">Need investigation</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Avg Count Time</p>
            <p className="text-lg font-semibold text-gray-900">{stats.avgCountTime}</p>
            <p className="text-xs text-gray-500 mt-1">Per location</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex">
              {['scheduled', 'in-progress', 'completed', 'variances'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
                  {tab === 'in-progress' && ongoingCounts.length > 0 && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                      {ongoingCounts.length}
                    </span>
                  )}
                  {tab === 'variances' && variances.length > 0 && (
                    <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                      {variances.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="p-6">
            {(() => {
              const isLoading = 
                (activeTab === 'scheduled' && loadingScheduled) ||
                (activeTab === 'in-progress' && loadingInProgress) ||
                (activeTab === 'completed' && loadingCompleted) ||
                (activeTab === 'variances' && loadingVariances);

              if (isLoading) {
                return (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading {activeTab.replace('-', ' ')}...</p>
                  </div>
                ) as React.ReactNode;
              }

              return (
                <>
                  {activeTab === 'scheduled' && (
                  <div>
                    {scheduledCounts.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Scheduled Counts</h3>
                        <p className="text-gray-600 mb-4">Schedule your first count to start maintaining inventory accuracy</p>
                        <button
                          onClick={() => setShowScheduleModal(true)}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Schedule Count
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {scheduledCounts.map((count) => (
                          <div key={count.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{count.id}</h3>
                                <p className="text-sm text-gray-600">{count.location} • {count.type.toUpperCase()}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Scheduled: {new Date(count.scheduledDate).toLocaleDateString()} • By: {count.assignedTo}
                                </p>
                              </div>
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                SCHEDULED
                              </span>
                            </div>
                            <div className="flex gap-3">
                              <button 
                                onClick={() => handleStartCount(count.id)}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                              >
                                Start Count Now
                              </button>
                              <button 
                                onClick={() => handlePrintSheet(count)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Printer className="w-4 h-4" />
                                Print Sheet
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'in-progress' && (
                  <div className="space-y-4">
                    {ongoingCounts.length === 0 ? (
                      <div className="text-center py-12">
                        <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Counts in Progress</h3>
                        <p className="text-gray-600 mb-4">Start a scheduled count to begin counting</p>
                      </div>
                    ) : (
                      ongoingCounts.map((count) => (
                        <div key={count.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{count.id}</h3>
                              <p className="text-sm text-gray-600">{count.location} • {count.type.toUpperCase()}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Started: {count.startedDate ? new Date(count.startedDate).toLocaleDateString() : 'N/A'} • By: {count.assignedTo}
                              </p>
                            </div>
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                              IN PROGRESS
                            </span>
                          </div>
                          <div className="mb-4">
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                              <span>Progress: {count.countedItems || 0} / {count.items || 0} items</span>
                              <span>{count.progress || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${count.progress || 0}%` }}
                              />
                            </div>
                          </div>
                          {(count.variances || 0) > 0 && (
                            <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-4">
                              <p className="text-sm text-orange-800">
                                <AlertCircle className="w-4 h-4 inline mr-1" />
                                {count.variances} variance(s) detected during counting
                              </p>
                            </div>
                          )}
                          <div className="flex gap-3">
                            <button 
                              onClick={() => handleContinueCounting(count)}
                              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              Continue Counting
                            </button>
                            <button 
                              onClick={() => handleViewProgress(count)}
                              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                              View Progress
                            </button>
                            <button 
                              onClick={() => handleCompleteCount(count.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              Complete Count
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'completed' && (
                  <div>
                    {completedCounts.length === 0 ? (
                      <div className="text-center py-12">
                        <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Completed Counts</h3>
                        <p className="text-gray-600 mb-4">Complete your first count to see results here</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {completedCounts.map((count) => (
                          <div key={count.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{count.id}</h3>
                                <p className="text-sm text-gray-600">{count.location} • {count.type.toUpperCase()}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Completed: {count.completedDate ? new Date(count.completedDate).toLocaleDateString() : 'N/A'}
                                </p>
                              </div>
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                COMPLETED
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500">Items Counted</p>
                                <p className="font-semibold text-gray-900">{count.countedItems || 0}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Variances</p>
                                <p className="font-semibold text-orange-600">{count.variances || 0}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Variance Value</p>
                                <p className="font-semibold text-gray-900">
                                  RWF {Math.abs(count.variance_value || count.varianceValue || 0).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'variances' && (
                  <div>
                    <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">Variance Investigation Required</h3>
                          <p className="text-sm text-gray-700">
                            Review each variance, determine the cause, and approve adjustments. Variances must be 
                            investigated within 24 hours to maintain inventory accuracy.
                          </p>
                        </div>
                      </div>
                    </div>
                    {variances.length === 0 ? (
                      <div className="text-center py-12">
                        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Variances</h3>
                        <p className="text-gray-600">All variances have been resolved</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {variances.map((variance) => (
                          <VarianceInvestigation key={variance.id} variance={variance} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhysicalCounts;
