import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { Search, Download, Trash2, Loader2, ArrowUpDown, Tag, X, ChevronDown, Store, DollarSign, FolderOpen, Calendar, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

type FilterType = 'merchant' | 'amount' | 'category' | 'date';

interface ActiveFilter {
  type: FilterType;
  // For merchant/category: value string
  value?: string;
  // For amount: min/max
  amountMin?: string;
  amountMax?: string;
  // For date: single date or range
  dateFrom?: string;
  dateTo?: string;
}

const FILTER_OPTIONS: { type: FilterType; label: string; icon: React.ElementType }[] = [
  { type: 'merchant',  label: 'Merchant',  icon: Store },
  { type: 'amount',    label: 'Amount',    icon: DollarSign },
  { type: 'category',  label: 'Category',  icon: FolderOpen },
  { type: 'date',      label: 'Date',      icon: Calendar },
];

export default function Expenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  const [draftFilter, setDraftFilter] = useState<ActiveFilter>({ type: 'merchant' });
  const filterPanelRef = useRef<HTMLDivElement>(null);

  // Sorting state
  const [sortField, setSortField] = useState<'transaction_date' | 'merchant_name' | 'total_amount'>('transaction_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchExpenses = async () => {
    try {
      const [expRes, catRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/categories'),
      ]);
      setExpenses(expRes.data);
      setCategories(catRes.data);
    } catch (error) {
      console.error('Failed to fetch expenses', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpenses(); }, []);

  // Close filter panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setActiveFilter(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openFilter = (type: FilterType) => {
    setDraftFilter({ type });
    setActiveFilter(type);
  };

  const applyFilter = () => {
    if (!draftFilter) return;
    // Remove existing filter of same type, then add new one
    const withoutSame = filters.filter(f => f.type !== draftFilter.type);
    setFilters([...withoutSame, draftFilter]);
    setActiveFilter(null);
  };

  const removeFilter = (type: FilterType) => {
    setFilters(filters.filter(f => f.type !== type));
  };

  const clearAllFilters = () => setFilters([]);

  // Check if a filter type is already active
  const hasFilter = (type: FilterType) => filters.some(f => f.type === type);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      setExpenses(expenses.filter(e => e.id !== id));
      const ns = new Set(selectedIds); ns.delete(id); setSelectedIds(ns);
    } catch { alert('Failed to delete expense.'); }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} expenses?`)) return;
    try {
      await Promise.all(Array.from(selectedIds).map(id => api.delete(`/expenses/${id}`)));
      setExpenses(expenses.filter(e => !selectedIds.has(e.id)));
      setSelectedIds(new Set());
    } catch { alert('Failed to delete some expenses.'); }
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const toggleSelection = (id: string) => {
    const ns = new Set(selectedIds);
    ns.has(id) ? ns.delete(id) : ns.add(id);
    setSelectedIds(ns);
  };

  // Apply all active filters
  const filteredAndSortedExpenses = expenses
    .filter(e => {
      for (const f of filters) {
        if (f.type === 'merchant' && f.value) {
          if (!e.merchant_name.toLowerCase().includes(f.value.toLowerCase())) return false;
        }
        if (f.type === 'category' && f.value) {
          const cat = (e.category_name || 'Uncategorized').toLowerCase();
          if (!cat.includes(f.value.toLowerCase())) return false;
        }
        if (f.type === 'amount') {
          const amount = e.total_amount / 100;
          if (f.amountMin && amount < parseFloat(f.amountMin)) return false;
          if (f.amountMax && amount > parseFloat(f.amountMax)) return false;
        }
        if (f.type === 'date') {
          const d = new Date(e.transaction_date);
          if (f.dateFrom && d < new Date(f.dateFrom)) return false;
          if (f.dateTo) {
            const to = new Date(f.dateTo);
            to.setHours(23, 59, 59);
            if (d > to) return false;
          }
        }
      }
      return true;
    })
    .sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === 'transaction_date') { valA = new Date(valA).getTime(); valB = new Date(valB).getTime(); }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const toggleAll = () => {
    selectedIds.size === filteredAndSortedExpenses.length
      ? setSelectedIds(new Set())
      : setSelectedIds(new Set(filteredAndSortedExpenses.map(e => e.id)));
  };

  const exportToCSV = () => {
    const csv = Papa.unparse(filteredAndSortedExpenses.map(e => ({
      Date: new Date(e.transaction_date).toLocaleDateString(),
      Merchant: e.merchant_name,
      Category: e.category_name || 'Uncategorized',
      Amount: (e.total_amount / 100).toFixed(2),
      Method: e.payment_method || 'N/A',
    })));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.setAttribute('download', 'expenses_export.csv');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Expense Report', 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Date', 'Merchant', 'Category', 'Amount']],
      body: filteredAndSortedExpenses.map(e => [
        new Date(e.transaction_date).toLocaleDateString(),
        e.merchant_name,
        e.category_name || 'Uncategorized',
        `$${(e.total_amount / 100).toFixed(2)}`,
      ]),
    });
    doc.save('expenses_report.pdf');
  };

  // Helper: display label for an active filter chip
  const filterLabel = (f: ActiveFilter) => {
    if (f.type === 'merchant') return `Merchant: "${f.value}"`;
    if (f.type === 'category') return `Category: "${f.value}"`;
    if (f.type === 'amount') {
      if (f.amountMin && f.amountMax) return `$${f.amountMin} – $${f.amountMax}`;
      if (f.amountMin) return `≥ $${f.amountMin}`;
      if (f.amountMax) return `≤ $${f.amountMax}`;
      return 'Amount';
    }
    if (f.type === 'date') {
      if (f.dateFrom && f.dateTo) return `${f.dateFrom} → ${f.dateTo}`;
      if (f.dateFrom) return `From ${f.dateFrom}`;
      if (f.dateTo) return `Until ${f.dateTo}`;
      return 'Date';
    }
    return f.type;
  };

  return (
    <Layout>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h1 className="text-xl font-bold text-gray-900">All Expenses</h1>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <div className="flex items-center space-x-2 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100">
                  <span className="text-sm text-primary-700 font-medium">{selectedIds.size} selected</span>
                  <button onClick={handleBulkDelete} className="text-red-500 hover:text-red-700 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                  <button className="text-primary-500 hover:text-primary-700 p-1 rounded"><Tag className="w-4 h-4" /></button>
                </div>
              )}
              <button onClick={exportToCSV} className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center transition-colors text-sm font-medium gap-1">
                <Download className="w-4 h-4" /> <span className="hidden sm:inline">CSV</span>
              </button>
              <button onClick={exportToPDF} className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center transition-colors text-sm font-medium gap-1">
                <Download className="w-4 h-4" /> <span className="hidden sm:inline">PDF</span>
              </button>
            </div>
          </div>

          {/* Filter Pills Row */}
          <div className="flex flex-wrap items-center gap-2" ref={filterPanelRef}>
            <span className="text-sm text-gray-500 font-medium">Filter by:</span>

            {FILTER_OPTIONS.map(({ type, label, icon: Icon }) => (
              <div key={type} className="relative">
                <button
                  onClick={() => activeFilter === type ? setActiveFilter(null) : openFilter(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                    hasFilter(type)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : activeFilter === type
                      ? 'bg-primary-50 border-primary-400 text-primary-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-primary-400 hover:text-primary-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  <ChevronDown className={`w-3 h-3 transition-transform ${activeFilter === type ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown panel */}
                {activeFilter === type && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{label}</p>

                    {type === 'merchant' && (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          autoFocus
                          type="text"
                          placeholder="e.g. Walmart, Amazon..."
                          value={draftFilter.value || ''}
                          onChange={e => setDraftFilter({ ...draftFilter, value: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    )}

                    {type === 'category' && (
                      <select
                        autoFocus
                        value={draftFilter.value || ''}
                        onChange={e => setDraftFilter({ ...draftFilter, value: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                      >
                        <option value="">All categories</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        <option value="Uncategorized">Uncategorized</option>
                      </select>
                    )}

                    {type === 'amount' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                            <input
                              autoFocus
                              type="number"
                              placeholder="Min"
                              value={draftFilter.amountMin || ''}
                              onChange={e => setDraftFilter({ ...draftFilter, amountMin: e.target.value })}
                              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <span className="text-gray-400 text-sm">to</span>
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                            <input
                              type="number"
                              placeholder="Max"
                              value={draftFilter.amountMax || ''}
                              onChange={e => setDraftFilter({ ...draftFilter, amountMax: e.target.value })}
                              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">Leave either blank for open-ended range.</p>
                      </div>
                    )}

                    {type === 'date' && (
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">From</label>
                          <input
                            autoFocus
                            type="date"
                            value={draftFilter.dateFrom || ''}
                            onChange={e => setDraftFilter({ ...draftFilter, dateFrom: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">To</label>
                          <input
                            type="date"
                            value={draftFilter.dateTo || ''}
                            onChange={e => setDraftFilter({ ...draftFilter, dateTo: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <p className="text-xs text-gray-400">Leave either blank for open-ended range.</p>
                      </div>
                    )}

                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        onClick={() => setActiveFilter(null)}
                        className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={applyFilter}
                        className="text-sm bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Active filter chips */}
            {filters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 ml-1">
                <div className="w-px h-5 bg-gray-200" />
                {filters.map(f => (
                  <span
                    key={f.type}
                    className="flex items-center gap-1 bg-primary-50 border border-primary-200 text-primary-700 text-xs font-medium px-2.5 py-1 rounded-full"
                  >
                    {filterLabel(f)}
                    <button onClick={() => removeFilter(f.type)} className="ml-0.5 hover:text-primary-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>
        ) : filteredAndSortedExpenses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {filters.length > 0 ? 'No expenses match your filters.' : 'No expenses found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      checked={selectedIds.size === filteredAndSortedExpenses.length && filteredAndSortedExpenses.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('transaction_date')}>
                    <div className="flex items-center">Date <ArrowUpDown className="ml-1 w-3 h-3" /></div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('merchant_name')}>
                    <div className="flex items-center">Merchant <ArrowUpDown className="ml-1 w-3 h-3" /></div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('total_amount')}>
                    <div className="flex items-center">Amount <ArrowUpDown className="ml-1 w-3 h-3" /></div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedExpenses.map(exp => (
                  <tr key={exp.id} className={`hover:bg-gray-50 ${selectedIds.has(exp.id) ? 'bg-primary-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer" checked={selectedIds.has(exp.id)} onChange={() => toggleSelection(exp.id)} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(exp.transaction_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold uppercase">
                          {exp.merchant_name.charAt(0)}
                        </div>
                        <div className="ml-4 text-sm font-medium text-gray-900">{exp.merchant_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {exp.category_name || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      ${(exp.total_amount / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.payment_method || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/expenses/edit/${exp.id}`} className="text-gray-400 hover:text-primary-600 inline-block mr-3">
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button onClick={() => handleDelete(exp.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
