import React, { useState, useEffect, useCallback } from 'react';
import { Expense, AnalysisResult, Category } from './types';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { Dashboard } from './components/Dashboard';
import { GlobalSearch } from './components/GlobalSearch';
import { BillDetailModal, ItemDetailModal } from './components/DetailModals';
import { analyzeExpenses } from './services/geminiService';
import { PieChartIcon, ListIcon, ShoppingCartIcon } from 'lucide-react';

const STORAGE_KEY = 'smartSpend_expenses_v5'; // Updated version to reset data

// Demo data generator for comprehensive grocery context with Stores and Splitting
const generateDummyData = (): Expense[] => [
  { id: '1', date: '2023-10-25', description: 'Fresh Spinach', amount: 3.50, category: Category.Vegetables, store: 'Whole Foods', payer: 'Me', owner: 'Shared' },
  { id: '2', date: '2023-10-25', description: 'Ribeye Steaks', amount: 24.20, category: Category.MeatSeafood, store: 'Whole Foods', payer: 'Me', owner: 'Shared' },
  { id: '3', date: '2023-10-25', description: 'Vegan Cookies', amount: 5.50, category: Category.Bakery, store: 'Whole Foods', payer: 'Me', owner: 'Partner' }, // Partner's personal item, I paid
  
  { id: '4', date: '2023-10-26', description: 'Organic Milk', amount: 5.99, category: Category.DairyEggs, store: 'Trader Joes', payer: 'Partner', owner: 'Shared' },
  { id: '5', date: '2023-10-26', description: 'Olive Oil', amount: 8.99, category: Category.Pantry, store: 'Trader Joes', payer: 'Partner', owner: 'Shared' },
  { id: '6', date: '2023-10-27', description: 'Protein Powder', amount: 45.00, category: Category.PersonalCare, store: 'GNC', payer: 'Me', owner: 'Me' }, // My personal item
  { id: '7', date: '2023-10-28', description: 'Potato Chips', amount: 4.50, category: Category.Snacks, store: '7-Eleven', payer: 'Partner', owner: 'Shared' },
  
  { id: '8', date: '2023-10-28', description: 'Laundry Detergent', amount: 14.99, category: Category.Household, store: 'Target', payer: 'Me', owner: 'Shared' },
  { id: '9', date: '2023-10-29', description: 'Cat Food (12 pack)', amount: 18.50, category: Category.Pet, store: 'PetSmart', payer: 'Me', owner: 'Shared' },
  
  { id: '10', date: '2023-10-29', description: 'Frozen Pizza', amount: 8.99, category: Category.Frozen, store: 'Costco', payer: 'Partner', owner: 'Shared' },
  { id: '11', date: '2023-10-30', description: 'Cabernet Sauvignon', amount: 12.00, category: Category.Alcohol, store: 'Costco', payer: 'Partner', owner: 'Shared' }, 
  { id: '12', date: '2023-10-30', description: 'Rotisserie Chicken', amount: 4.99, category: Category.Deli, store: 'Costco', payer: 'Partner', owner: 'Shared' },
];

const App: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');
  
  // State for search and details
  const [selectedBill, setSelectedBill] = useState<{ store: string; date: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<Expense | null>(null);
  
  // State for people management
  const [people, setPeople] = useState<string[]>(['Me', 'Partner']);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setExpenses(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load expenses", e);
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (expenses.length > 0 || localStorage.getItem(STORAGE_KEY)) {
       localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    }
  }, [expenses]);

  const handleAddExpenses = (newExpenses: Omit<Expense, 'id'>[]) => {
    const expensesWithIds: Expense[] = newExpenses.map(e => ({
      ...e,
      id: crypto.randomUUID()
    }));
    setExpenses(prev => [...expensesWithIds, ...prev]);
    if (analysis) setAnalysis(null);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    if (analysis) setAnalysis(null);
  };

  const handleUpdateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    // Update the selected item reference if it's currently open
    if (selectedItem && selectedItem.id === id) {
        setSelectedItem(prev => prev ? { ...prev, ...updates } : null);
    }
    if (analysis) setAnalysis(null);
  };

  const handleBulkUpdateBill = (store: string, date: string, updates: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => {
        if (e.store === store && e.date === date) {
            return { ...e, ...updates };
        }
        return e;
    }));
    if (analysis) setAnalysis(null);
  };

  const handleAddPerson = (name: string) => {
    if (!people.includes(name)) {
      setPeople(prev => [...prev, name]);
    }
  };

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeExpenses(expenses);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [expenses]);

  const loadDemoData = () => {
    setExpenses(generateDummyData());
    setAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo - Hidden on very small screens if search is active could be an enhancement, but keeping it simple */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <ShoppingCartIcon className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight hidden sm:block">GroceryOptimizer</span>
          </div>
          
          {/* Global Search Bar - Centered */}
          <div className="flex-1 max-w-lg">
             <GlobalSearch 
                expenses={expenses}
                onSelectBill={setSelectedBill}
                onSelectItem={setSelectedItem}
             />
          </div>
          
          {/* Navigation Controls */}
          <div className="flex gap-2 shrink-0">
            {expenses.length === 0 && (
                <button onClick={loadDemoData} className="text-xs text-indigo-600 hover:underline mr-4 hidden sm:block">
                    Load Demo Cart
                </button>
            )}
            <nav className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <PieChartIcon size={16} />
                    <span className="hidden sm:inline">Dashboard</span>
                </button>
                <button 
                    onClick={() => setActiveTab('list')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <ListIcon size={16} />
                    <span className="hidden sm:inline">Items</span>
                </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Sidebar / Form Area - Takes 4 columns on large screens */}
          <div className="lg:col-span-4 space-y-6">
            <ExpenseForm 
              onAddExpenses={handleAddExpenses} 
              people={people}
              onAddPerson={handleAddPerson}
            />
            
            {/* On desktop, show recent list here if on dashboard tab */}
            <div className="hidden lg:block">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Additions</h3>
                <ExpenseList expenses={expenses.slice(0, 5)} onDeleteExpense={handleDeleteExpense} />
            </div>
          </div>

          {/* Right Main Area - Takes 8 columns */}
          <div className="lg:col-span-8">
            {activeTab === 'dashboard' ? (
              <Dashboard 
                expenses={expenses} 
                analysis={analysis} 
                isAnalyzing={isAnalyzing}
                onAnalyze={handleAnalyze} 
                people={people}
              />
            ) : (
              <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-gray-900">All Items</h2>
                  <ExpenseList expenses={expenses} onDeleteExpense={handleDeleteExpense} />
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Detail Modals */}
      <BillDetailModal 
        billIdentifier={selectedBill} 
        expenses={expenses} 
        onClose={() => setSelectedBill(null)} 
        onUpdateBill={handleBulkUpdateBill}
        onUpdateExpense={handleUpdateExpense}
        people={people}
      />
      <ItemDetailModal 
        item={selectedItem} 
        onClose={() => setSelectedItem(null)} 
        onUpdateExpense={handleUpdateExpense}
        people={people}
      />
    </div>
  );
};

export default App;
