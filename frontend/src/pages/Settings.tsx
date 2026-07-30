import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Settings as SettingsIcon, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import api from '../api/axios';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [categories, setCategories] = useState<any[]>([]);
  
  // Budget States
  const [overallBudget, setOverallBudget] = useState('');
  const [overallBudgetId, setOverallBudgetId] = useState<string | null>(null);
  const [categoryBudgets, setCategoryBudgets] = useState<{id?: string, categoryId: string, limit: string}[]>([]);
  const [deletedBudgetIds, setDeletedBudgetIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catRes = await api.get('/categories');
        setCategories(catRes.data);
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }

      try {
        const budgetRes = await api.get('/budgets');
        const loadedBudgets = budgetRes.data;
        
        // Find overall
        const overall = loadedBudgets.find((b: any) => !b.category_id);
        if (overall) {
            setOverallBudgetId(overall.id);
            setOverallBudget((overall.limit_amount / 100).toString());
        }
        
        // Find category specific
        const catB = loadedBudgets
            .filter((b: any) => b.category_id && b.category_name !== 'Overall')
            .map((b: any) => ({
                id: b.id,
                categoryId: b.category_id.toString(),
                limit: (b.limit_amount / 100).toString()
            }));
            
        setCategoryBudgets(catB);
      } catch (err) {
        console.error("Failed to fetch budgets", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveBudgets = async () => {
    setSaving(true);
    try {
        // Save overall
        if (overallBudget) {
            await api.post('/budgets', {
                limit_amount: Math.round(parseFloat(overallBudget) * 100)
            });
        } else if (overallBudgetId) {
            await api.delete(`/budgets/${overallBudgetId}`);
            setOverallBudgetId(null);
        }
        
        // Save category specific
        for (const cb of categoryBudgets) {
            if (cb.categoryId && cb.limit) {
                await api.post('/budgets', {
                    category_id: cb.categoryId,
                    limit_amount: Math.round(parseFloat(cb.limit) * 100)
                });
            }
        }
        // Delete removed budgets
        for (const id of deletedBudgetIds) {
            await api.delete(`/budgets/${id}`);
        }
        
        alert("Budgets saved successfully!");
        setDeletedBudgetIds([]);
    } catch (err) {
        console.error("Failed to save budgets", err);
        alert("Failed to save some budgets.");
    } finally {
        setSaving(false);
    }
  };

  const addCategoryBudget = () => {
      setCategoryBudgets([...categoryBudgets, { categoryId: '', limit: '' }]);
  };

  const removeCategoryBudget = (index: number) => {
      const newB = [...categoryBudgets];
      const removed = newB.splice(index, 1)[0];
      if (removed.id) {
          setDeletedBudgetIds([...deletedBudgetIds, removed.id]);
      }
      setCategoryBudgets(newB);
  };

  const updateCategoryBudget = (index: number, field: 'categoryId'|'limit', value: string) => {
      const newB = [...categoryBudgets];
      newB[index][field] = value;
      setCategoryBudgets(newB);
  };

  if (loading) {
      return (
          <Layout>
              <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-primary-500 animate-spin" /></div>
          </Layout>
      );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <SettingsIcon className="w-6 h-6 mr-2 text-gray-500" />
              Settings
          </h1>
          <p className="text-gray-500 mt-1">Manage your budget limits and application preferences.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-medium text-gray-900">Monthly Budgets</h2>
                <p className="text-sm text-gray-500 mt-1">Set limits to track your spending on the Dashboard.</p>
            </div>
            
            <div className="p-6 space-y-8">
                {/* Overall Budget */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Overall Monthly Budget</label>
                    <div className="mt-2 relative rounded-lg shadow-sm max-w-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input 
                            type="number" 
                            step="0.01"
                            value={overallBudget}
                            onChange={(e) => setOverallBudget(e.target.value)}
                            placeholder="5000.00"
                            className="block w-full pl-7 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                        />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">This applies to all your spending combined.</p>
                </div>

                <hr className="border-gray-100" />

                {/* Category Budgets */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <label className="block text-sm font-medium text-gray-700">Category-Specific Budgets</label>
                        <button 
                            onClick={addCategoryBudget}
                            className="flex items-center text-sm text-primary-600 font-medium hover:text-primary-700"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Category Budget
                        </button>
                    </div>
                    
                    {categoryBudgets.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <p className="text-sm text-gray-500">No category-specific budgets set.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {categoryBudgets.map((cb, idx) => (
                                <div key={idx} className="flex items-end space-x-4">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                                        <select 
                                            value={cb.categoryId}
                                            onChange={(e) => updateCategoryBudget(idx, 'categoryId', e.target.value)}
                                            className="block w-full bg-white border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                        >
                                            <option value="">Select a category...</option>
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Monthly Limit</label>
                                        <div className="relative rounded-lg shadow-sm">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-gray-500 sm:text-sm">$</span>
                                            </div>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                value={cb.limit}
                                                onChange={(e) => updateCategoryBudget(idx, 'limit', e.target.value)}
                                                placeholder="0.00"
                                                className="block w-full pl-7 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                                            />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => removeCategoryBudget(idx)}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                                        title="Remove"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end">
                <button 
                    onClick={handleSaveBudgets}
                    disabled={saving}
                    className="flex items-center bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-70"
                >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Settings
                </button>
            </div>
        </div>

      </div>
    </Layout>
  );
}
