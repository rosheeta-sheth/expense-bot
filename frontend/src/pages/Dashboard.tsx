import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Plus, DollarSign, Activity, FileText, Loader2, Target, AlertTriangle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import ErrorBoundary from '../components/ErrorBoundary';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6'];

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, expensesRes, budgetsRes] = await Promise.all([
          api.get('/expenses/analytics'),
          api.get('/expenses'),
          api.get('/budgets')
        ]);
        
        setStats(statsRes.data);
        const allExpenses = expensesRes.data;
        setRecentExpenses(allExpenses.slice(0, 5));
        
        setBudgets(budgetsRes.data);
        
        const categoryTotals: Record<string, number> = {};
        allExpenses.forEach((exp: any) => {
          const cat = exp.category_name || 'Uncategorized';
          categoryTotals[cat] = (categoryTotals[cat] || 0) + (exp.total_amount / 100);
        });
        
        const cData = Object.keys(categoryTotals).map(key => ({
          name: key,
          value: categoryTotals[key]
        }));
        setChartData(cData);
        
      } catch (error: any) {
        console.error('Failed to load dashboard data', error);
        setError(error?.response?.data?.msg || error?.message || 'Unknown error loading dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-primary-500 animate-spin" /></div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-bold text-red-700 flex items-center mb-2">
            <AlertTriangle className="w-5 h-5 mr-2" /> Dashboard Failed to Load
          </h2>
          <p className="text-sm text-red-600 font-mono">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
            Try Again
          </button>
        </div>
      </Layout>
    );
  }

  let topCategory = 'None';
  if (chartData.length > 0) {
    const sorted = [...chartData].sort((a, b) => b.value - a.value);
    topCategory = sorted[0].name;
  }

  return (
    <Layout>
      <ErrorBoundary>
        <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <Link to="/expenses/new" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            New Expense
          </Link>
        </div>
        
        {/* Anomaly Alerts */}
        {stats?.anomalies && stats.anomalies.length > 0 && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <h3 className="text-sm font-medium text-amber-800">Unusual Spending Detected</h3>
                        <p className="mt-1 text-sm text-amber-700">
                            We noticed an unusually large transaction: <strong>{stats.anomalies[0].merchant} (${stats.anomalies[0].amount.toFixed(2)})</strong> on {stats.anomalies[0].date}.
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Spending</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ${((stats?.total_spending || 0) / 100).toFixed(2)}
                </p>
              </div>
              <div className="bg-primary-50 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Month Forecast</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ${((stats?.forecast || 0) / 100).toFixed(2)}
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Transactions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.transaction_count || 0}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-full">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Top Category</p>
                <p className="text-2xl font-bold text-gray-900 mt-2 truncate">{topCategory}</p>
              </div>
              <div className="bg-pink-50 p-3 rounded-full">
                <FileText className="w-6 h-6 text-pink-600" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Trend Chart (Full Width) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Spending Trends</h2>
            <div className="h-64">
                {stats?.trend_data && stats.trend_data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.trend_data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} tickFormatter={(value) => `$${value}`} dx={-10} />
                            <Tooltip 
                                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spent']}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} dot={{r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      Not enough data to calculate trends.
                    </div>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
          {/* Budgets Section */}
          {budgets.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center mb-6">
                <Target className="w-5 h-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Budget Goals</h2>
              </div>
              
              <div className="space-y-6">
                {budgets.map(budget => {
                  const spent = budget.spent_amount / 100;
                  const limit = budget.limit_amount / 100;
                  const percent = Math.min(Math.round((spent / limit) * 100) || 0, 100);
                  
                  let colorClass = 'bg-primary-500';
                  if (percent >= 100) colorClass = 'bg-red-500';
                  else if (percent >= 80) colorClass = 'bg-yellow-500';
                  
                  return (
                    <div key={budget.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{budget.category_name} Budget</span>
                        <span className="text-gray-500 font-medium">
                          ${spent.toFixed(2)} / ${limit.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${percent}%` }}></div>
                      </div>
                      {percent >= 100 && (
                          <p className="text-xs text-red-600 mt-1 font-medium">You have exceeded this budget!</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Expenses</h2>
              <Link to="/expenses" className="text-primary-600 hover:text-primary-700 text-sm font-medium">View all</Link>
            </div>
            <div className="space-y-4">
              {recentExpenses.length === 0 ? (
                <p className="text-gray-500 text-sm">No recent expenses found.</p>
              ) : (
                recentExpenses.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors border border-gray-50">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold uppercase">
                        {exp.merchant_name.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[150px] sm:max-w-xs">{exp.merchant_name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(exp.transaction_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-gray-900">${(exp.total_amount / 100).toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        </div>
      </ErrorBoundary>
    </Layout>
  );
}
