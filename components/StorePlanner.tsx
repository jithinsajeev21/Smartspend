import React, { useMemo, useState, useEffect } from 'react';
import { Expense, Category } from '../types';
import { StoreIcon, TrendingDownIcon, StarIcon, ShoppingCartIcon, AlertCircleIcon, CheckIcon, MapPinIcon } from 'lucide-react';
import { SHELF_LIFE_DAYS } from './ShelfLifeInsights';

interface StorePlannerProps {
  expenses: Expense[];
}

interface PlannedItem {
  name: string;
  category: Category;
  reason: 'Exclusive' | 'Best Price' | 'Needed';
  avgPriceHere: number;
  cheapestStore?: string;
  savings?: number;
  isNeeded: boolean; // Stock Up or Running Low
}

export const StorePlanner: React.FC<StorePlannerProps> = ({ expenses }) => {
  const [selectedStore, setSelectedStore] = useState('');

  const stores = useMemo(() => {
    const s = new Set<string>();
    expenses.forEach(e => { if (e.store) s.add(e.store) });
    return Array.from(s).sort();
  }, [expenses]);

  // Default selection
  useEffect(() => {
    if (!selectedStore && stores.length > 0) {
      setSelectedStore(stores[0]);
    }
  }, [stores]);

  const plan = useMemo(() => {
    if (!selectedStore) return { smartBuys: [], otherNeeds: [] };

    // 1. Identify Item Shortages (Logic duplicated from ShelfLifeInsights for self-containment/consistency)
    const itemGroups: Record<string, { dates: string[], category: Category, name: string }> = {};
    expenses.forEach(e => {
      const normName = e.description.trim().toLowerCase();
      if (!itemGroups[normName]) itemGroups[normName] = { dates: [], category: e.category, name: e.description };
      itemGroups[normName].dates.push(e.date);
      // Update name casing to most recent
      if (new Date(e.date) > new Date(itemGroups[normName].dates[0])) itemGroups[normName].name = e.description;
    });

    const neededItems = new Set<string>();
    const now = new Date();

    Object.entries(itemGroups).forEach(([normName, data]) => {
      const sortedDates = data.dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      const lastDate = new Date(sortedDates[0]);
      const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let avgCycle: number | null = null;
      if (sortedDates.length >= 2) {
        let totalDays = 0;
        for (let i = 0; i < sortedDates.length - 1; i++) {
          totalDays += new Date(sortedDates[i]).getTime() - new Date(sortedDates[i+1]).getTime();
        }
        avgCycle = Math.round((totalDays / (sortedDates.length - 1)) / (1000 * 60 * 60 * 24));
      }

      const shelfLife = SHELF_LIFE_DAYS[data.category] || 14;
      
      // Determine if Needed
      // Synced with ShelfLifeInsights: 
      // Warning starts at 10% remaining (0.9 used). 
      // So we consider it "Needed" for the list if >= 0.9 used.
      let isNeeded = false;
      if (avgCycle !== null) {
        if (daysSince >= avgCycle * 0.9) isNeeded = true;
      } else {
        if (daysSince >= shelfLife * 0.9) isNeeded = true;
      }
      
      if (isNeeded) neededItems.add(normName);
    });

    // 2. Analyze Prices & Exclusivity
    const smartBuys: PlannedItem[] = [];
    const otherNeeds: PlannedItem[] = [];

    Object.keys(itemGroups).forEach(normName => {
      if (!neededItems.has(normName)) return;

      const itemData = itemGroups[normName];
      // Find all purchases of this item
      const itemExpenses = expenses.filter(e => e.description.trim().toLowerCase() === normName);
      
      // Calc stats per store
      const storeStats: Record<string, { sum: number, count: number }> = {};
      itemExpenses.forEach(e => {
        const s = e.store || 'Unknown';
        if (!storeStats[s]) storeStats[s] = { sum: 0, count: 0 };
        storeStats[s].sum += e.amount;
        storeStats[s].count += 1;
      });

      let cheapestStore = '';
      let minAvg = Infinity;
      let uniqueStore: string | null = Object.keys(storeStats).length === 1 ? Object.keys(storeStats)[0] : null;

      Object.entries(storeStats).forEach(([s, stats]) => {
        const avg = stats.sum / stats.count;
        if (avg < minAvg) {
          minAvg = avg;
          cheapestStore = s;
        }
      });

      const avgAtSelected = storeStats[selectedStore] 
        ? storeStats[selectedStore].sum / storeStats[selectedStore].count 
        : null;

      if (avgAtSelected !== null) {
        // We sell it here. Is it a smart buy?
        if (uniqueStore === selectedStore) {
          smartBuys.push({
            name: itemData.name,
            category: itemData.category,
            reason: 'Exclusive',
            avgPriceHere: avgAtSelected,
            isNeeded: true
          });
        } else if (cheapestStore === selectedStore) {
           smartBuys.push({
            name: itemData.name,
            category: itemData.category,
            reason: 'Best Price',
            avgPriceHere: avgAtSelected,
            isNeeded: true
          });
        } else {
          // It is cheaper elsewhere
          otherNeeds.push({
            name: itemData.name,
            category: itemData.category,
            reason: 'Needed',
            avgPriceHere: avgAtSelected,
            cheapestStore: cheapestStore,
            savings: avgAtSelected - minAvg,
            isNeeded: true
          });
        }
      } else {
        // Needed, but never bought at selected store. 
        // Still show in "Other Needs" so user doesn't forget, but mark as "New/Unknown here".
        otherNeeds.push({
            name: itemData.name,
            category: itemData.category,
            reason: 'Needed',
            avgPriceHere: 0, // Unknown
            cheapestStore: cheapestStore, // Where we usually buy it
            isNeeded: true
        });
      }
    });

    return { smartBuys, otherNeeds };

  }, [expenses, selectedStore]);

  if (stores.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <MapPinIcon size={20} />
              Trip Planner
            </h3>
            <p className="text-blue-100 text-sm">Optimize your shopping list based on store prices</p>
          </div>
          
          <div className="relative w-full sm:w-auto">
             <select 
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="appearance-none w-full sm:w-48 bg-white/10 border border-white/20 text-white placeholder-white/50 rounded-lg pl-4 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-white/30 font-medium"
             >
                {stores.map(s => <option key={s} value={s} className="text-gray-900">{s}</option>)}
             </select>
             <StoreIcon className="absolute right-3 top-2.5 text-white/70 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Column 1: Smart Buys */}
        <div>
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <StarIcon size={18} className="text-yellow-500 fill-yellow-500" />
                Best Buys at {selectedStore}
            </h4>
            {plan.smartBuys.length > 0 ? (
                <ul className="space-y-3">
                    {plan.smartBuys.map((item, idx) => (
                        <li key={idx} className="bg-green-50/50 border border-green-100 rounded-lg p-3 flex justify-between items-center">
                            <div>
                                <p className="font-medium text-gray-900">{item.name}</p>
                                <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                                    {item.reason === 'Exclusive' ? '★ Unique to this store' : '✔ Best price here'}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-gray-900">€{item.avgPriceHere.toFixed(2)}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-gray-400 text-sm">No needed items are uniquely cheap here.</p>
                </div>
            )}
        </div>

        {/* Column 2: Other Needs */}
        <div>
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <ShoppingCartIcon size={18} className="text-gray-400" />
                Other Needed Items
            </h4>
            {plan.otherNeeds.length > 0 ? (
                <ul className="space-y-3">
                    {plan.otherNeeds.map((item, idx) => (
                        <li key={idx} className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex justify-between items-center opacity-90">
                            <div>
                                <p className="font-medium text-gray-700">{item.name}</p>
                                {item.cheapestStore ? (
                                    <p className="text-xs text-orange-600 flex items-center gap-1">
                                        <TrendingDownIcon size={12} /> 
                                        Save €{item.savings?.toFixed(2)} at {item.cheapestStore}
                                    </p>
                                ) : (
                                    <p className="text-xs text-gray-400">Price here unknown</p>
                                )}
                            </div>
                            <div className="text-right">
                                {item.avgPriceHere > 0 && (
                                    <span className="block font-medium text-gray-600">€{item.avgPriceHere.toFixed(2)}</span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-gray-400 text-sm">No other pending items.</p>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};