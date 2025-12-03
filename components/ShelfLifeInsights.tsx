import React, { useMemo } from 'react';
import { Expense, Category } from '../types';
import { ClockIcon, RefreshCwIcon, AlertTriangleIcon, CheckCircleIcon, ShoppingBagIcon, CalendarIcon, AlertCircleIcon } from 'lucide-react';

interface ShelfLifeInsightsProps {
  expenses: Expense[];
}

// Generic shelf life estimates in days
export const SHELF_LIFE_DAYS: Record<Category, number> = {
  [Category.Vegetables]: 7,
  [Category.Fruits]: 7,
  [Category.MeatSeafood]: 3,
  [Category.DairyEggs]: 14,
  [Category.Bakery]: 5,
  [Category.Pantry]: 90,
  [Category.Frozen]: 30,
  [Category.Snacks]: 21,
  [Category.Beverages]: 14,
  [Category.Alcohol]: 365,
  [Category.Deli]: 4,
  [Category.Baby]: 14,
  [Category.Pet]: 30,
  [Category.Household]: 60,
  [Category.PersonalCare]: 45,
  [Category.Other]: 14,
};

interface ItemStat {
  name: string;
  category: Category;
  lastPurchased: Date;
  daysSinceLastPurchase: number;
  avgCycle: number | null;
  purchaseCount: number;
  genericShelfLife: number;
  status: 'Stock Up' | 'Running Low' | 'Good' | 'Likely Expired' | 'Unknown';
}

export const ShelfLifeInsights: React.FC<ShelfLifeInsightsProps> = ({ expenses }) => {
  
  const itemStats = useMemo(() => {
    const items: Record<string, { dates: string[], category: Category, name: string }> = {};

    // 1. Group expenses by normalized name
    expenses.forEach(e => {
      const normName = e.description.trim().toLowerCase();
      if (!items[normName]) {
        items[normName] = { dates: [], category: e.category, name: e.description };
      }
      items[normName].dates.push(e.date);
      // Keep the most recent casing/name
      if (new Date(e.date) > new Date(items[normName].dates[0])) {
         items[normName].name = e.description;
      }
    });

    // 2. Calculate stats for each item
    const now = new Date();
    const stats: ItemStat[] = Object.values(items).map(item => {
      // Sort dates descending (newest first)
      const sortedDates = item.dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      const lastDate = new Date(sortedDates[0]);
      const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate Average Cycle (Purchased Life)
      let avgCycle: number | null = null;
      if (sortedDates.length >= 2) {
        let totalDays = 0;
        for (let i = 0; i < sortedDates.length - 1; i++) {
          const diff = new Date(sortedDates[i]).getTime() - new Date(sortedDates[i+1]).getTime();
          totalDays += diff;
        }
        avgCycle = Math.round((totalDays / (sortedDates.length - 1)) / (1000 * 60 * 60 * 24));
      }

      const shelfLife = SHELF_LIFE_DAYS[item.category] || 14;

      // Determine Status
      let status: ItemStat['status'] = 'Good';

      if (avgCycle !== null) {
        // We have user data to predict
        if (daysSince >= avgCycle) {
          status = 'Stock Up';
        } else if (daysSince >= avgCycle * 0.8) {
          status = 'Running Low';
        }
      } else {
        // Fallback to generic shelf life if average purchase data is not available.
        // Logic: 
        // - If 0% remaining (daysSince >= shelfLife) -> Red (Buy)
        // - If 10% remaining (daysSince >= 0.9 * shelfLife) -> Yellow (Warning)
        
        if (daysSince >= shelfLife) {
          status = 'Stock Up'; // Maps to "Buy" (Red)
        } else if (daysSince >= shelfLife * 0.9) {
          status = 'Running Low'; // Maps to "Warning" (Yellow)
        }
      }

      return {
        name: item.name,
        category: item.category,
        lastPurchased: lastDate,
        daysSinceLastPurchase: daysSince,
        avgCycle: avgCycle,
        purchaseCount: sortedDates.length,
        genericShelfLife: shelfLife,
        status
      };
    });

    // Sort by urgency
    return stats.sort((a, b) => {
        // Priority: Stock Up > Running Low > Good
        const score = (s: string) => {
            if (s === 'Stock Up') return 4;
            if (s === 'Running Low') return 3;
            if (s === 'Good') return 2;
            return 1; 
        };
        return score(b.status) - score(a.status);
    });

  }, [expenses]);

  const shoppingList = itemStats.filter(i => i.status === 'Stock Up' || i.status === 'Running Low');

  return (
    <div className="space-y-6">
        {/* Shopping List Recommendation */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <div className="bg-emerald-100 p-2 rounded-lg">
                    <ShoppingBagIcon className="text-emerald-700" size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-emerald-900">Smart Shopping List</h3>
                    <p className="text-emerald-700 text-sm">Based on your purchase history and shelf life</p>
                </div>
            </div>
            
            {shoppingList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {shoppingList.map((item, idx) => (
                        <div key={idx} className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-emerald-100 flex items-center justify-between shadow-sm">
                            <div>
                                <p className="font-medium text-gray-800">{item.name}</p>
                                <p className="text-xs text-gray-500">
                                    {item.avgCycle ? `Cycle: ${item.avgCycle}d` : `Shelf: ${item.genericShelfLife}d`}
                                </p>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.status === 'Stock Up' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {item.status === 'Stock Up' ? 'Buy Now' : 'Warning'}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-emerald-600 italic text-sm bg-white/50 p-3 rounded-lg inline-block">
                   🎉 Your pantry looks well-stocked! No immediate items due for purchase.
                </p>
            )}
        </div>

        {/* Detailed Tracker Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <ClockIcon size={20} className="text-indigo-600" />
                    Shelf Life & Usage Tracker
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Item Name</th>
                            <th className="px-6 py-3">Last Bought</th>
                            <th className="px-6 py-3">
                                <div className="flex items-center gap-1">
                                    Generic Shelf Life
                                    <span title="Estimated shelf life based on category" className="cursor-help text-gray-400">ⓘ</span>
                                </div>
                            </th>
                            <th className="px-6 py-3">
                                <div className="flex items-center gap-1">
                                    Avg. Purchased Life
                                    <span title="How often you personally buy this item (needs 2+ purchases)" className="cursor-help text-gray-400">ⓘ</span>
                                </div>
                            </th>
                            <th className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {itemStats.slice(0, 10).map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-3 font-medium text-gray-900">{item.name}</td>
                                <td className="px-6 py-3 text-gray-600 flex items-center gap-2">
                                    {item.lastPurchased.toLocaleDateString()}
                                    <span className="text-xs text-gray-400">({item.daysSinceLastPurchase}d ago)</span>
                                </td>
                                <td className="px-6 py-3 text-gray-600">
                                    <div className="flex items-center gap-1.5">
                                        <CalendarIcon size={14} className="text-gray-400" />
                                        {item.genericShelfLife} days
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    {item.avgCycle ? (
                                        <div className="flex items-center gap-1.5 text-indigo-600 font-medium">
                                            <RefreshCwIcon size={14} />
                                            Every {item.avgCycle} days
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 text-xs italic">Not enough data</span>
                                    )}
                                </td>
                                <td className="px-6 py-3">
                                    {item.status === 'Stock Up' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                            <AlertTriangleIcon size={12} /> Buy
                                        </span>
                                    )}
                                    {item.status === 'Running Low' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                                            <AlertCircleIcon size={12} /> Warning
                                        </span>
                                    )}
                                    {item.status === 'Good' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <CheckCircleIcon size={12} /> Good
                                        </span>
                                    )}
                                    {item.status === 'Likely Expired' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                            Check
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {itemStats.length > 10 && (
                    <div className="p-3 text-center text-xs text-gray-500 border-t border-gray-100">
                        Showing top 10 items by urgency
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};