"use client";

import React, { useState } from 'react';

import { 

  BarChart3, TrendingUp, Package, DollarSign,

  Calendar, Download, Filter, Printer, FileText,

  PieChart, Activity, Clock, AlertTriangle, RefreshCw

} from 'lucide-react';



const InventoryReports = () => {

  const [activeReport, setActiveReport] = useState('valuation');

  const [dateRange, setDateRange] = useState('month');



  const reports = [

    {

      id: 'valuation',

      name: 'Inventory Valuation',

      description: 'Current stock value by category and location',

      icon: DollarSign,

      color: 'blue'

    },

    {

      id: 'movement',

      name: 'Stock Movement',

      description: 'Track ins, outs, and net changes',

      icon: Activity,

      color: 'green'

    },

    {

      id: 'aging',

      name: 'Stock Aging',

      description: 'Identify slow-moving and obsolete items',

      icon: Clock,

      color: 'orange'

    },

    {

      id: 'turnover',

      name: 'Turnover Analysis',

      description: 'Inventory velocity and efficiency',

      icon: RefreshCw,

      color: 'purple'

    },

    {

      id: 'abc',

      name: 'ABC Analysis',

      description: 'Classify items by value contribution',

      icon: BarChart3,

      color: 'indigo'

    },

    {

      id: 'reorder',

      name: 'Reorder Status',

      description: 'Items below reorder points',

      icon: AlertTriangle,

      color: 'red'

    }

  ];



  // Mock data

  const valuationData = {

    totalValue: 'RWF 2,450,000',

    byCategory: [

      { category: 'Raw Materials', value: 800000, percentage: 33, items: 145 },

      { category: 'Finished Goods', value: 1200000, percentage: 49, items: 89 },

      { category: 'Packaging Materials', value: 180000, percentage: 7, items: 34 },

      { category: 'WIP (Manufacturing)', value: 270000, percentage: 11, items: 12 }

    ],

    byLocation: [

      { location: 'Main Warehouse', value: 1800000, percentage: 73, items: 198 },

      { location: 'Downtown Store', value: 420000, percentage: 17, items: 67 },

      { location: 'Factory Storage', value: 230000, percentage: 10, items: 45 }

    ]

  };



  const movementData = {

    period: 'This Month',

    received: { qty: 450, value: 'RWF 380,000' },

    issued: { qty: 520, value: 'RWF 485,000' },

    adjusted: { qty: -15, value: '-RWF 12,000' },

    net: { qty: -85, value: '-RWF 117,000' },

    topMoving: [

      { sku: 'MLK', name: 'Milk', in: 200, out: 180, net: 20 },

      { sku: 'F-CRM', name: 'Fresh Cream', in: 80, out: 95, net: -15 },

      { sku: 'C-GH', name: 'Cow Ghee', in: 60, out: 75, net: -15 },

      { sku: 'CEM', name: 'Cocktail Eggless Mayonnaise', in: 50, out: 85, net: -35 },

      { sku: 'LEM', name: 'Lemon Eggless Mayonnaise', in: 40, out: 65, net: -25 }

    ]

  };



  const agingData = {

    categories: [

      { range: '0-30 days', value: 1200000, percentage: 49, items: 145, status: 'good' },

      { range: '31-60 days', value: 680000, percentage: 28, items: 89, status: 'ok' },

      { range: '61-90 days', value: 340000, percentage: 14, items: 34, status: 'warning' },

      { range: '90+ days', value: 230000, percentage: 9, items: 12, status: 'danger' }

    ],

    slowMoving: [

      { sku: 'C-CHZ', name: 'Cream Cheese', age: 120, value: 135000, lastMovement: '92 days ago' },

      { sku: 'LEM', name: 'Lemon Eggless Mayonnaise', age: 95, value: 78000, lastMovement: '95 days ago' },

      { sku: 'F-CRM', name: 'Fresh Cream', age: 87, value: 42000, lastMovement: '87 days ago' }

    ]

  };



  const turnoverData = {

    overall: { rate: 4.2, target: 5.0, status: 'below' },

    byCategory: [

      { category: 'Raw Materials', turnover: 6.2, days: 58, status: 'good' },

      { category: 'Finished Goods', turnover: 3.8, days: 95, status: 'slow' },

      { category: 'Packaging Materials', turnover: 8.1, days: 45, status: 'excellent' },

      { category: 'WIP', turnover: 5.5, days: 66, status: 'good' }

    ]

  };



  const abcData = {

    classA: { items: 28, percentage: 10, value: 1715000, valuePercent: 70 },

    classB: { items: 84, percentage: 30, value: 612500, valuePercent: 25 },

    classC: { items: 168, percentage: 60, value: 122500, valuePercent: 5 }

  };



  return (

    <div className="h-screen flex flex-col bg-gray-50">

      {/* Header */}

      <div className="bg-white border-b border-gray-200 px-6 py-4">

        <div className="flex items-center justify-between">

          <div>

            <h1 className="text-2xl font-bold text-gray-900">Inventory Reports & Analytics</h1>

            <p className="text-sm text-gray-500">Comprehensive inventory performance insights</p>

          </div>

          <div className="flex gap-3">

            <select

              value={dateRange}

              onChange={(e) => setDateRange(e.target.value)}

              className="px-4 py-2 border border-gray-300 rounded-lg"

            >

              <option value="today">Today</option>

              <option value="week">This Week</option>

              <option value="month">This Month</option>

              <option value="quarter">This Quarter</option>

              <option value="year">This Year</option>

              <option value="custom">Custom Range</option>

            </select>

            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">

              <Download className="w-4 h-4" />

              Export

            </button>

            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">

              <Printer className="w-4 h-4" />

              Print

            </button>

          </div>

        </div>

      </div>



      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar - Report Types */}

        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">

          <div className="p-4 border-b border-gray-200">

            <h2 className="font-semibold text-gray-900">Report Types</h2>

          </div>

          <div className="p-2">

            {reports.map((report) => {

              const Icon = report.icon;

              return (

                <button

                  key={report.id}

                  onClick={() => setActiveReport(report.id)}

                  className={`w-full flex items-start gap-3 p-3 rounded-lg mb-1 transition-colors ${

                    activeReport === report.id

                      ? 'bg-blue-50 border border-blue-200'

                      : 'hover:bg-gray-50'

                  }`}

                >

                  <div className={`p-2 rounded ${
                    report.color === 'blue' ? 'bg-blue-100' :
                    report.color === 'green' ? 'bg-green-100' :
                    report.color === 'orange' ? 'bg-orange-100' :
                    report.color === 'purple' ? 'bg-purple-100' :
                    report.color === 'indigo' ? 'bg-indigo-100' :
                    'bg-red-100'
                  }`}>

                    <Icon className={`w-5 h-5 ${
                      report.color === 'blue' ? 'text-blue-600' :
                      report.color === 'green' ? 'text-green-600' :
                      report.color === 'orange' ? 'text-orange-600' :
                      report.color === 'purple' ? 'text-purple-600' :
                      report.color === 'indigo' ? 'text-indigo-600' :
                      'text-red-600'
                    }`} />

                  </div>

                  <div className="flex-1 text-left">

                    <p className={`text-sm font-medium ${

                      activeReport === report.id ? 'text-blue-900' : 'text-gray-900'

                    }`}>

                      {report.name}

                    </p>

                    <p className="text-xs text-gray-500 mt-0.5">{report.description}</p>

                  </div>

                </button>

              );

            })}

          </div>

        </div>



        {/* Main Content - Report Display */}

        <div className="flex-1 overflow-y-auto p-6">

          {activeReport === 'valuation' && (

            <div className="space-y-6">

              <div className="bg-white border border-gray-200 rounded-lg p-6">

                <h2 className="text-xl font-bold text-gray-900 mb-6">Inventory Valuation Report</h2>

                

                <div className="mb-8">

                  <p className="text-sm text-gray-600 mb-2">Total Inventory Value</p>

                  <p className="text-4xl font-bold text-gray-900">{valuationData.totalValue}</p>

                </div>



                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* By Category */}

                  <div>

                    <h3 className="font-semibold text-gray-900 mb-4">Value by Category</h3>

                    <div className="space-y-3">

                      {valuationData.byCategory.map((cat, idx) => (

                        <div key={idx}>

                          <div className="flex items-center justify-between mb-1">

                            <span className="text-sm font-medium text-gray-900">{cat.category}</span>

                            <span className="text-sm text-gray-600">

                              RWF {cat.value.toLocaleString()} ({cat.percentage}%)

                            </span>

                          </div>

                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">

                            <div

                              className="h-full bg-blue-600"

                              style={{ width: `${cat.percentage}%` }}

                            />

                          </div>

                          <p className="text-xs text-gray-500 mt-1">{cat.items} items</p>

                        </div>

                      ))}

                    </div>

                  </div>



                  {/* By Location */}

                  <div>

                    <h3 className="font-semibold text-gray-900 mb-4">Value by Location</h3>

                    <div className="space-y-3">

                      {valuationData.byLocation.map((loc, idx) => (

                        <div key={idx}>

                          <div className="flex items-center justify-between mb-1">

                            <span className="text-sm font-medium text-gray-900">{loc.location}</span>

                            <span className="text-sm text-gray-600">

                              RWF {loc.value.toLocaleString()} ({loc.percentage}%)

                            </span>

                          </div>

                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">

                            <div

                              className="h-full bg-green-600"

                              style={{ width: `${loc.percentage}%` }}

                            />

                          </div>

                          <p className="text-xs text-gray-500 mt-1">{loc.items} items</p>

                        </div>

                      ))}

                    </div>

                  </div>

                </div>

              </div>

            </div>

          )}



          {activeReport === 'movement' && (

            <div className="space-y-6">

              <div className="bg-white border border-gray-200 rounded-lg p-6">

                <h2 className="text-xl font-bold text-gray-900 mb-6">Stock Movement Report</h2>

                

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">

                  <div className="border border-gray-200 rounded-lg p-4">

                    <p className="text-sm text-gray-600 mb-1">Received</p>

                    <p className="text-2xl font-bold text-green-600">{movementData.received.qty}</p>

                    <p className="text-sm text-gray-500">{movementData.received.value}</p>

                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">

                    <p className="text-sm text-gray-600 mb-1">Issued</p>

                    <p className="text-2xl font-bold text-blue-600">{movementData.issued.qty}</p>

                    <p className="text-sm text-gray-500">{movementData.issued.value}</p>

                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">

                    <p className="text-sm text-gray-600 mb-1">Adjusted</p>

                    <p className="text-2xl font-bold text-orange-600">{movementData.adjusted.qty}</p>

                    <p className="text-sm text-gray-500">{movementData.adjusted.value}</p>

                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">

                    <p className="text-sm text-gray-600 mb-1">Net Change</p>

                    <p className="text-2xl font-bold text-red-600">{movementData.net.qty}</p>

                    <p className="text-sm text-gray-500">{movementData.net.value}</p>

                  </div>

                </div>



                <h3 className="font-semibold text-gray-900 mb-4">Top Moving Items</h3>

                <div className="border border-gray-200 rounded-lg overflow-hidden">

                  <table className="w-full">

                    <thead className="bg-gray-50">

                      <tr>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">SKU</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Item</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Received</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Issued</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Net</th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-gray-200">

                      {movementData.topMoving.map((item, idx) => (

                        <tr key={idx} className="hover:bg-gray-50">

                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.sku}</td>

                          <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>

                          <td className="px-4 py-3 text-sm text-green-600">+{item.in}</td>

                          <td className="px-4 py-3 text-sm text-blue-600">-{item.out}</td>

                          <td className="px-4 py-3 text-sm font-medium">

                            <span className={item.net >= 0 ? 'text-green-600' : 'text-red-600'}>

                              {item.net > 0 ? '+' : ''}{item.net}

                            </span>

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              </div>

            </div>

          )}



          {activeReport === 'aging' && (

            <div className="space-y-6">

              <div className="bg-white border border-gray-200 rounded-lg p-6">

                <h2 className="text-xl font-bold text-gray-900 mb-6">Stock Aging Report</h2>

                

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

                  {agingData.categories.map((cat, idx) => (

                    <div key={idx} className={`border-2 rounded-lg p-4 ${

                      cat.status === 'danger' ? 'border-red-200 bg-red-50' :

                      cat.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :

                      'border-gray-200'

                    }`}>

                      <p className="text-sm text-gray-600 mb-1">{cat.range}</p>

                      <p className="text-2xl font-bold text-gray-900">

                        RWF {(cat.value / 1000).toFixed(0)}K

                      </p>

                      <p className="text-sm text-gray-500">{cat.items} items • {cat.percentage}%</p>

                    </div>

                  ))}

                </div>



                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">

                  <AlertTriangle className="w-5 h-5 text-orange-600" />

                  Slow-Moving Items (90+ days)

                </h3>

                <div className="border border-gray-200 rounded-lg overflow-hidden">

                  <table className="w-full">

                    <thead className="bg-gray-50">

                      <tr>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">SKU</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Item</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Age (days)</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Value</th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Last Movement</th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-gray-200">

                      {agingData.slowMoving.map((item, idx) => (

                        <tr key={idx} className="hover:bg-gray-50">

                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.sku}</td>

                          <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>

                          <td className="px-4 py-3 text-sm">

                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">

                              {item.age} days

                            </span>

                          </td>

                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">

                            RWF {item.value.toLocaleString()}

                          </td>

                          <td className="px-4 py-3 text-sm text-gray-600">{item.lastMovement}</td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              </div>

            </div>

          )}



          {activeReport === 'turnover' && (

            <div className="space-y-6">

              <div className="bg-white border border-gray-200 rounded-lg p-6">

                <h2 className="text-xl font-bold text-gray-900 mb-6">Inventory Turnover Analysis</h2>

                

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">

                  <p className="text-sm text-gray-600 mb-2">Overall Inventory Turnover</p>

                  <div className="flex items-end gap-4">

                    <p className="text-4xl font-bold text-gray-900">{turnoverData.overall.rate}x</p>

                    <p className="text-lg text-gray-600 mb-1">

                      Target: {turnoverData.overall.target}x

                    </p>

                  </div>

                  <p className="text-sm text-orange-600 mt-2">

                    ⚠️ Below target - consider improving stock velocity

                  </p>

                </div>



                <h3 className="font-semibold text-gray-900 mb-4">Turnover by Category</h3>

                <div className="space-y-4">

                  {turnoverData.byCategory.map((cat, idx) => (

                    <div key={idx} className="border border-gray-200 rounded-lg p-4">

                      <div className="flex items-center justify-between mb-2">

                        <h4 className="font-medium text-gray-900">{cat.category}</h4>

                        <span className={`px-2 py-1 text-xs font-medium rounded ${

                          cat.status === 'excellent' ? 'bg-green-100 text-green-700' :

                          cat.status === 'good' ? 'bg-blue-100 text-blue-700' :

                          'bg-yellow-100 text-yellow-700'

                        }`}>

                          {cat.status.toUpperCase()}

                        </span>

                      </div>

                      <div className="grid grid-cols-2 gap-4">

                        <div>

                          <p className="text-sm text-gray-600">Turnover Rate</p>

                          <p className="text-2xl font-bold text-gray-900">{cat.turnover}x</p>

                        </div>

                        <div>

                          <p className="text-sm text-gray-600">Avg Days in Stock</p>

                          <p className="text-2xl font-bold text-gray-900">{cat.days}</p>

                        </div>

                      </div>

                    </div>

                  ))}

                </div>

              </div>

            </div>

          )}



          {activeReport === 'abc' && (

            <div className="space-y-6">

              <div className="bg-white border border-gray-200 rounded-lg p-6">

                <h2 className="text-xl font-bold text-gray-900 mb-6">ABC Analysis</h2>

                

                <p className="text-sm text-gray-600 mb-6">

                  Classify inventory items based on their value contribution using the Pareto principle

                </p>



                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  <div className="border-2 border-green-200 bg-green-50 rounded-lg p-6">

                    <div className="flex items-center justify-between mb-2">

                      <h3 className="text-lg font-bold text-green-900">Class A</h3>

                      <span className="text-2xl">★</span>

                    </div>

                    <p className="text-sm text-gray-600 mb-4">High Value Items</p>

                    <div className="space-y-2">

                      <div>

                        <p className="text-xs text-gray-600">Items</p>

                        <p className="text-xl font-bold text-gray-900">

                          {abcData.classA.items} ({abcData.classA.percentage}%)

                        </p>

                      </div>

                      <div>

                        <p className="text-xs text-gray-600">Value Contribution</p>

                        <p className="text-xl font-bold text-green-600">

                          {abcData.classA.valuePercent}%

                        </p>

                        <p className="text-sm text-gray-600">

                          RWF {(abcData.classA.value / 1000).toFixed(0)}K

                        </p>

                      </div>

                    </div>

                    <p className="text-xs text-gray-600 mt-4">

                      💡 Focus: Tight inventory control, frequent reviews

                    </p>

                  </div>



                  <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-6">

                    <div className="flex items-center justify-between mb-2">

                      <h3 className="text-lg font-bold text-blue-900">Class B</h3>

                      <span className="text-2xl">○</span>

                    </div>

                    <p className="text-sm text-gray-600 mb-4">Medium Value Items</p>

                    <div className="space-y-2">

                      <div>

                        <p className="text-xs text-gray-600">Items</p>

                        <p className="text-xl font-bold text-gray-900">

                          {abcData.classB.items} ({abcData.classB.percentage}%)

                        </p>

                      </div>

                      <div>

                        <p className="text-xs text-gray-600">Value Contribution</p>

                        <p className="text-xl font-bold text-blue-600">

                          {abcData.classB.valuePercent}%

                        </p>

                        <p className="text-sm text-gray-600">

                          RWF {(abcData.classB.value / 1000).toFixed(0)}K

                        </p>

                      </div>

                    </div>

                    <p className="text-xs text-gray-600 mt-4">

                      💡 Focus: Moderate control, regular reviews

                    </p>

                  </div>



                  <div className="border-2 border-gray-200 bg-gray-50 rounded-lg p-6">

                    <div className="flex items-center justify-between mb-2">

                      <h3 className="text-lg font-bold text-gray-900">Class C</h3>

                      <span className="text-2xl">·</span>

                    </div>

                    <p className="text-sm text-gray-600 mb-4">Low Value Items</p>

                    <div className="space-y-2">

                      <div>

                        <p className="text-xs text-gray-600">Items</p>

                        <p className="text-xl font-bold text-gray-900">

                          {abcData.classC.items} ({abcData.classC.percentage}%)

                        </p>

                      </div>

                      <div>

                        <p className="text-xs text-gray-600">Value Contribution</p>

                        <p className="text-xl font-bold text-gray-600">

                          {abcData.classC.valuePercent}%

                        </p>

                        <p className="text-sm text-gray-600">

                          RWF {(abcData.classC.value / 1000).toFixed(0)}K

                        </p>

                      </div>

                    </div>

                    <p className="text-xs text-gray-600 mt-4">

                      💡 Focus: Simple controls, periodic reviews

                    </p>

                  </div>

                </div>

              </div>

            </div>

          )}



          {activeReport === 'reorder' && (

            <div className="bg-white border border-gray-200 rounded-lg p-6">

              <h2 className="text-xl font-bold text-gray-900 mb-4">Reorder Status Report</h2>

              <div className="p-8 text-center">

                <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />

                <p className="text-gray-600">This report shows items below reorder points</p>

                <p className="text-sm text-gray-500 mt-2">Placeholder - implement with actual reorder data</p>

              </div>

            </div>

          )}

        </div>

      </div>

    </div>

  );

};



export default InventoryReports;


