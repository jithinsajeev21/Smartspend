import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Expense, Category, AnalysisResult } from '../types';
import { SparklesIcon, BrainCircuitIcon, TrendingUpIcon, SearchIcon, StoreIcon, AlertCircleIcon, TrophyIcon } from 'lucide-react';
import { ShelfLifeInsights } from './ShelfLifeInsights';
import { SplitAnalysis } from './SplitAnalysis';
import { StorePlanner } from './StorePlanner';

interface DashboardProps {
  expenses: Expense[];
  analysis: AnalysisResult | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  people: string[];
}

const COLORS = [
  '#16a34a', '#ef4444', '#c2410c', '#3b82f6', '#eab308', '#78350f', 
  '#06b6d4', '#8b5cf6', '#0ea5e9', '#be123c', '#f97316', '#818cf8', 
  '#a8a29e', '#4b5563', '#db2777', '#9ca3af'
];

export const Dashboard: React.FC<DashboardProps> = ({ expenses, analysis, isAnalyzing, onAnalyze, people }) => {
  const [priceSearch, setPriceSearch] = useState('');
  
  const totalSpent = useMemo(() => {
    return expenses.reduce((sum, item) => sum + item.amount, 0);
  }, [expenses]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    Object.values(Category).forEach(c => data[c] = 0);
    expenses.forEach(e => {
      data[e.category] += e.amount;
    });
    return Object.entries(data)
      .filter(([, amount]) => amount > 0)
      .map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const storeData = useMemo(() => {
    const data: Record<string, number> = {};
    expenses.forEach(e => {
      const store = e.store || 'Unknown';
      data[store] = (data[store] || 0) + e.amount;
    });
    return Object.entries(data)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5) // Top 5 stores
      .map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const priceComparisonData = useMemo(() => {
    if (!priceSearch.trim() || expenses.length === 0) return [];
    
    const searchTerm = priceSearch.toLowerCase();
    const matches = expenses.filter(e => e.description.toLowerCase().includes(searchTerm));
    
    return matches.sort((a, b) => a.amount - b.amount); // Cheapest first
  }, [priceSearch, expenses]);

  return (
    <div className="grid grid-cols-1 gap-6">
      
      {/* Top Stats */}
      <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-lg shadow-indigo-200">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-indigo-100 text-sm font-medium mb-1">Total Spend</p>
            <h1 className="text-4xl font-bold">€{totalSpent.toFixed(2)}</h1>
          </div>
          <div className="bg-indigo-500/30 p-2 rounded-lg">
            <TrendingUpIcon className="text-white" size={24} />
          </div>
        </div>
        <div className="mt-4 flex gap-2 text-sm text-indigo-100">
           <span>{expenses.length} items tracked across {storeData.length} stores</span>
        </div>
      </div>

      {/* Split Analysis Section */}
      <SplitAnalysis expenses={expenses} people={people} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
          <h3 className="text-gray-700 font-semibold mb-4">Spend by Category</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                    formatter={(value: number) => `€${value.toFixed(2)}`}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 justify-center text-xs text-gray-500 max-h-20 overflow-y-auto">
            {categoryData.map((entry, index) => (
               <div key={entry.name} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <span className="truncate max-w-[100px]">{entry.name}</span>
               </div>
            ))}
          </div>
        </div>

        {/* Store Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
          <h3 className="text-gray-700 font-semibold mb-4">Top Stores by Spend</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={storeData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11, fill: '#4b5563'}} />
                <RechartsTooltip 
                    cursor={{ fill: '#f3f4f6' }}
                    formatter={(value: number) => [`€${value.toFixed(2)}`, 'Spent']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#818cf8" radius={[0, 4, 4, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Store Planner (New) */}
      <StorePlanner expenses={expenses} />

      {/* Shelf Life Section */}
      <ShelfLifeInsights expenses={expenses} />

      {/* Price Watch Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/30">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <SearchIcon size={20} className="text-indigo-600" />
                    Price Check
                </h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">Search for an item to compare prices across different supermarkets.</p>
            <div className="relative">
                <input 
                    type="text"
                    value={priceSearch}
                    onChange={(e) => setPriceSearch(e.target.value)}
                    placeholder="Search item (e.g., Milk, Eggs, Bread)..."
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none shadow-sm"
                />
                <SearchIcon className="absolute left-3 top-3.5 text-gray-400" size={18} />
            </div>
        </div>
        
        {priceSearch && (
            <div className="p-0">
                {priceComparisonData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Item</th>
                                    <th className="px-6 py-3">Store</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3 text-right">Price</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {priceComparisonData.map((item, idx) => (
                                    <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${idx === 0 ? 'bg-green-50/50' : ''}`}>
                                        <td className="px-6 py-3 font-medium text-gray-900 flex items-center gap-2">
                                            {idx === 0 && <TrophyIcon size={14} className="text-yellow-500 fill-yellow-500" />}
                                            {item.description}
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            <span className="flex items-center gap-1.5">
                                                <StoreIcon size={14} className="text-gray-400" />
                                                {item.store}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">{new Date(item.date).toLocaleDateString()}</td>
                                        <td className={`px-6 py-3 text-right font-semibold ${idx === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                            €{item.amount.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                        <AlertCircleIcon size={32} className="mb-2 opacity-20" />
                        <p>No matching items found in your history.</p>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* AI Analysis Section */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BrainCircuitIcon className="text-indigo-600" size={24} />
            <h3 className="text-indigo-900 font-bold text-lg">Smart Shopper Insights</h3>
          </div>
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing || expenses.length === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
              isAnalyzing || expenses.length === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200 shadow-sm hover:shadow-md'
            }`}
          >
            {isAnalyzing ? (
              <span className="animate-pulse">Analyzing...</span>
            ) : (
              <>
                <SparklesIcon size={16} />
                {analysis ? 'Refresh Insights' : 'Analyze Cart'}
              </>
            )}
          </button>
        </div>

        {analysis ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="bg-white/60 p-4 rounded-lg border border-indigo-100/50">
                    <h4 className="text-sm font-semibold text-indigo-900 mb-1 uppercase tracking-wide">Shopping Habits</h4>
                    <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
                </div>
                
                <div className="bg-white/60 p-4 rounded-lg border border-indigo-100/50">
                    <h4 className="text-sm font-semibold text-indigo-900 mb-2 uppercase tracking-wide">Savings & Tips</h4>
                    <ul className="space-y-2">
                        {analysis.tips.map((tip, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-gray-700">
                                <span className="flex-shrink-0 w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                                    {idx + 1}
                                </span>
                                <span>{tip}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex items-center gap-2 text-sm">
                     <span className="text-indigo-900 font-medium">Overall Sentiment:</span>
                     <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                         analysis.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                         analysis.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                         'bg-yellow-100 text-yellow-700'
                     }`}>
                         {analysis.sentiment}
                     </span>
                </div>
            </div>
        ) : (
            <div className="text-center py-8 text-gray-400">
                <p>Tap "Analyze Cart" to get AI-powered tips on your spending and nutrition.</p>
            </div>
        )}
      </div>
    </div>
  );
};