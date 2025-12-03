import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Expense } from '../types';
import { SearchIcon, XIcon, FileTextIcon, ChevronRightIcon, PackageIcon } from 'lucide-react';

interface GlobalSearchProps {
  expenses: Expense[];
  onSelectBill: (bill: { store: string; date: string }) => void;
  onSelectItem: (item: Expense) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ expenses, onSelectBill, onSelectItem }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return { bills: [], items: [] };

    const lowerQuery = query.toLowerCase();

    // 1. Filter Individual Items
    const items = expenses.filter(e => 
        e.description.toLowerCase().includes(lowerQuery) || 
        e.category.toLowerCase().includes(lowerQuery)
    ).slice(0, 5); // Limit to 5

    // 2. Filter Bills (Group by Store + Date)
    const billsMap = new Map<string, { store: string, date: string, total: number, count: number }>();
    
    expenses.forEach(e => {
        const key = `${e.store}|${e.date}`;
        if (!billsMap.has(key)) {
            billsMap.set(key, { store: e.store, date: e.date, total: 0, count: 0 });
        }
        const bill = billsMap.get(key)!;
        bill.total += e.amount;
        bill.count += 1;
    });

    const bills = Array.from(billsMap.values()).filter(b => 
        b.store.toLowerCase().includes(lowerQuery) || 
        b.date.includes(lowerQuery)
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);

    return { bills, items };
  }, [query, expenses]);

  const hasResults = results.bills.length > 0 || results.items.length > 0;

  const handleBillClick = (b: { store: string, date: string }) => {
    onSelectBill(b);
    setIsOpen(false);
    setQuery('');
  };

  const handleItemClick = (i: Expense) => {
    onSelectItem(i);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="relative w-full max-w-md mx-auto" ref={containerRef}>
      <div className="relative">
        <input
            type="text"
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
            }}
            placeholder="Search items, stores, or bills..."
            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm"
        />
        <SearchIcon className="absolute left-3 top-2.5 text-gray-400" size={18} />
        {query && (
            <button 
                onClick={() => { setQuery(''); setIsOpen(false); }}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
                <XIcon size={18} />
            </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
            {!hasResults ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                    No results found for "{query}"
                </div>
            ) : (
                <div className="max-h-[400px] overflow-y-auto">
                    {/* Bills Section */}
                    {results.bills.length > 0 && (
                        <div className="border-b border-gray-100">
                            <div className="bg-gray-50/80 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <FileTextIcon size={12} /> Bills & Visits
                            </div>
                            {results.bills.map((bill, idx) => (
                                <button 
                                    key={`${bill.store}-${bill.date}-${idx}`}
                                    onClick={() => handleBillClick(bill)}
                                    className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors flex justify-between items-center group"
                                >
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">{bill.store}</p>
                                        <p className="text-xs text-gray-500">{new Date(bill.date).toLocaleDateString()} • {bill.count} items</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-900 text-sm">€{bill.total.toFixed(2)}</span>
                                        <ChevronRightIcon size={16} className="text-gray-300 group-hover:text-indigo-400" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Items Section */}
                    {results.items.length > 0 && (
                        <div>
                             <div className="bg-gray-50/80 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <PackageIcon size={12} /> Items
                            </div>
                            {results.items.map(item => (
                                <button 
                                    key={item.id}
                                    onClick={() => handleItemClick(item)}
                                    className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors flex justify-between items-center group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="font-medium text-gray-900 text-sm">{item.description}</p>
                                            <p className="text-xs text-gray-500">{item.store}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900 text-sm">€{item.amount.toFixed(2)}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
      )}
    </div>
  );
};
