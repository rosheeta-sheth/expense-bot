import React, { useCallback, useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Camera, Loader2, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

export default function AddExpense() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [categories, setCategories] = useState<any[]>([]);
  
  // Current form state
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Custom Category State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        setCategories(res.data);
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    };
    fetchCategories();
    
    if (isEditMode && id) {
      const fetchExpense = async () => {
        try {
          const res = await api.get(`/expenses/${id}`);
          const exp = res.data;
          setMerchant(exp.merchant_name);
          setAmount((exp.total_amount / 100).toFixed(2));
          setTaxAmount(exp.tax_amount ? (exp.tax_amount / 100).toFixed(2) : '');
          setPaymentMethod(exp.payment_method || '');
          setCategoryId(exp.category_id || '');
          if (exp.transaction_date) {
            setTransactionDate(new Date(exp.transaction_date).toISOString().slice(0,16)); // YYYY-MM-DDTHH:MM
          }
          if (exp.items) {
             setLineItems(exp.items);
          }
          // Wrap in a mock result so the form shows
          setResults([{
            filename: 'Editing Expense',
            is_duplicate: false,
            ai_suggestion: { confidence_score: 1.0 },
            extracted_data: { transaction_date: exp.transaction_date }
          }]);
        } catch (err) {
          console.error("Failed to load expense", err);
          alert("Expense not found.");
          navigate('/expenses');
        }
      };
      fetchExpense();
    }
  }, [id, isEditMode, navigate]);

  // When carousel index changes, prepopulate the form
  useEffect(() => {
      if (!isEditMode && results.length > 0 && results[currentIndex]) {
          const data = results[currentIndex];
          setMerchant(data.extracted_data.merchant_name || '');
          setAmount(data.extracted_data.total_amount ? (data.extracted_data.total_amount / 100).toFixed(2) : '');
          setTaxAmount(data.extracted_data.tax_amount ? (data.extracted_data.tax_amount / 100).toFixed(2) : '');
          setPaymentMethod(data.extracted_data.payment_method || '');
          if (data.extracted_data.transaction_date) {
              setTransactionDate(data.extracted_data.transaction_date.slice(0, 16));
          }

          
          // Map overall category name to ID
          const overallCategoryMatch = categories.find(c => c.name.toLowerCase() === data.ai_suggestion.suggested_category?.toLowerCase());
          setCategoryId(overallCategoryMatch?.id || '');
          
          if (data.extracted_data.line_items) {
              setLineItems(data.extracted_data.line_items.map((i: any) => ({
                  ...i,
                  // Try to match suggested_category string to an actual category ID, or leave blank
                  category_id: categories.find(c => c.name.toLowerCase() === i.suggested_category?.toLowerCase())?.id || ''
              })));
          } else {
              setLineItems([]);
          }
      }
  }, [currentIndex, results, categories]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setIsProcessing(true);
      
      const formData = new FormData();
      acceptedFiles.forEach(file => {
          formData.append('receipts', file);
      });
      
      try {
        const response = await api.post('/receipts/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        setResults(response.data);
        setCurrentIndex(0);
        
      } catch (error) {
        console.error("Failed to process receipt", error);
        alert("Error processing receipts. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf']
    }
    // Removed maxFiles to allow batch uploads!
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const currentResult = results[currentIndex];
    
    try {
      const payload = {
        merchant_name: merchant,
        total_amount: Math.round((parseFloat(amount) || 0) * 100), 
        tax_amount: taxAmount ? Math.round((parseFloat(taxAmount) || 0) * 100) : 0,
        category_id: categoryId,
        payment_method: paymentMethod,
        ai_confidence_score: currentResult?.ai_suggestion?.confidence_score,
        receipt_image_url: currentResult?.receipt_image_url,
        transaction_date: transactionDate ? new Date(transactionDate).toISOString() : (currentResult?.extracted_data?.transaction_date || new Date().toISOString()),
        items: lineItems.map(i => ({
            product_name: i.product_name,
            quantity: i.quantity,
            total_price: i.total_price,
            category_id: i.category_id
        }))
      };

      if (isEditMode && id) {
        await api.put(`/expenses/${id}`, payload);
        navigate('/expenses');
        return;
      } else {
        await api.post('/expenses', payload);
      }
      
      // Move to next in batch, or navigate away if done
      if (currentIndex < results.length - 1) {
          setCurrentIndex(currentIndex + 1);
      } else {
          navigate('/expenses');
      }
    } catch (error) {
      console.error("Failed to save expense", error);
      alert("Failed to save expense");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSkip = () => {
      if (currentIndex < results.length - 1) {
          setCurrentIndex(currentIndex + 1);
      } else {
          navigate('/expenses');
      }
  };

  const handleLineItemCategoryChange = (index: number, val: string) => {
      const newItems = [...lineItems];
      newItems[index].category_id = val;
      setLineItems(newItems);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setIsSavingCategory(true);
    try {
      const res = await api.post('/categories', { name: newCategoryName });
      const newCat = res.data.category;
      
      // Add to local state
      setCategories([...categories, newCat]);
      
      // Auto-select for Overall Category
      setCategoryId(newCat.id);
      
      // Reset state
      setNewCategoryName('');
      setIsAddingCategory(false);
    } catch (error) {
      console.error("Failed to create category", error);
      alert("Failed to create category");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const currentResult = results[currentIndex];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Expense' : 'Add Expenses'}</h1>
          {!isEditMode && <p className="text-gray-500 mt-1">Upload multiple receipts at once. Our AI will extract data, split line items, and detect duplicates.</p>}
        </div>

        {results.length === 0 ? (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Batch Processing...</h3>
                <p className="text-gray-500 mt-1 text-sm text-center max-w-sm">
                  Our mock AI is reading your receipts, splitting items, and checking for duplicates.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div 
                    {...getRootProps()} 
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center ${
                      isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <UploadCloud className="w-10 h-10 text-gray-400 mb-3" />
                    <p className="font-medium text-gray-900">Upload Receipts</p>
                    <p className="text-gray-500 mt-1 text-sm">Drag & drop JPGs/PDFs</p>
                  </div>
                  
                  <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 hover:bg-gray-50 transition-colors flex flex-col items-center justify-center group overflow-hidden">
                    <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        onChange={(e) => { if (e.target.files) onDrop(Array.from(e.target.files)); }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Camera className="w-10 h-10 text-gray-400 mb-3 group-hover:text-primary-500 transition-colors" />
                    <p className="font-medium text-gray-900">Take Photo</p>
                    <p className="text-gray-500 mt-1 text-sm">Use your device camera</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Carousel Header */}
            <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-500">Reviewing Receipt {currentIndex + 1} of {results.length}</span>
                </div>
                <div className="flex space-x-2">
                    <button 
                        type="button" 
                        onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                        disabled={currentIndex === 0}
                        className="p-1 rounded-full hover:bg-gray-200 disabled:opacity-50"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setCurrentIndex(Math.min(results.length - 1, currentIndex + 1))}
                        disabled={currentIndex === results.length - 1}
                        className="p-1 rounded-full hover:bg-gray-200 disabled:opacity-50"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>
            
            {/* Alerts */}
            {isEditMode ? null : currentResult.is_duplicate ? (
                <div className="bg-red-50 p-4 border-b border-red-100 flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Duplicate Detected</h3>
                    <p className="text-red-700 mt-1 text-sm">
                      This receipt looks identical to one you've already uploaded. Are you sure you want to save it again?
                    </p>
                  </div>
                </div>
            ) : (
                <div className="bg-primary-50 p-4 border-b border-primary-100 flex items-start overflow-hidden">
                  <CheckCircle2 className="w-5 h-5 text-primary-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-primary-900 truncate">Successfully Extracted: {currentResult.filename}</h3>
                    <p className="text-primary-700 mt-1 text-sm">
                      AI Confidence: {Math.round(currentResult.ai_suggestion.confidence_score * 100)}%
                    </p>
                  </div>
                </div>
            )}
            
            <form className="p-6 space-y-6" onSubmit={handleSave}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Merchant</label>
                  <input 
                    type="text" 
                    required
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                  <div className="mt-1 relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="block w-full pl-7 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tax Amount</label>
                  <div className="mt-1 relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input 
                      type="number" 
                      step="0.01"
                      value={taxAmount}
                      onChange={(e) => setTaxAmount(e.target.value)}
                      placeholder="0.00"
                      className="block w-full pl-7 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <select 
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mt-1 block w-full bg-white border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="">Unknown</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Cash">Cash</option>
                      <option value="Mobile Payment">Mobile Payment</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-700">
                      Overall Category
                    </label>
                    <button 
                      type="button" 
                      onClick={() => setIsAddingCategory(!isAddingCategory)}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700"
                    >
                      {isAddingCategory ? 'Cancel' : '+ New Category'}
                    </button>
                  </div>
                  
                  {isAddingCategory ? (
                    <div className="mt-1 flex space-x-2">
                      <input 
                        type="text" 
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Category name..."
                        className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                      <button 
                        type="button" 
                        onClick={handleCreateCategory}
                        disabled={isSavingCategory}
                        className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        {isSavingCategory ? '...' : 'Create'}
                      </button>
                    </div>
                  ) : (
                    <select 
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      required
                      className="mt-1 block w-full bg-white border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="">Select a category...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              
              {/* Line Items Section */}
              {lineItems.length > 0 && (
                  <div className="mt-8">
                      <div className="flex items-center mb-4">
                          <List className="w-5 h-5 text-gray-400 mr-2" />
                          <h3 className="text-sm font-medium text-gray-900">Detected Line Items</h3>
                      </div>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                  <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                  </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                  {lineItems.map((item, idx) => (
                                      <tr key={idx}>
                                          <td className="px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                                          <td className="px-4 py-2 text-sm text-gray-900">${(item.total_price / 100).toFixed(2)}</td>
                                          <td className="px-4 py-2">
                                              <select 
                                                value={item.category_id}
                                                onChange={(e) => handleLineItemCategoryChange(idx, e.target.value)}
                                                className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                              >
                                                <option value="">Default</option>
                                                {categories.map((cat) => (
                                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                              </select>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}
              
              <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={handleSkip} 
                  className="bg-white py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none transition-colors"
                >
                  {isEditMode ? 'Cancel' : (currentIndex < results.length - 1 ? 'Skip' : 'Cancel')}
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className={`${currentResult.is_duplicate ? 'bg-amber-600 hover:bg-amber-700' : 'bg-primary-600 hover:bg-primary-700'} border border-transparent rounded-lg shadow-sm py-2 px-4 text-sm font-medium text-white focus:outline-none transition-colors disabled:opacity-70`}
                >
                  {isSaving ? 'Saving...' : (isEditMode ? 'Save Changes' : (currentIndex < results.length - 1 ? 'Save & Next' : 'Save Expense'))}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
