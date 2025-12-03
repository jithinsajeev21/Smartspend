import React, { useState, useEffect } from 'react';
import { Expense } from '../types';
import { XIcon, CalendarIcon, StoreIcon, UserIcon, UsersIcon, TagIcon, CreditCardIcon, DollarSignIcon, ShoppingBagIcon, Edit2Icon, SaveIcon, CheckIcon, RefreshCwIcon } from 'lucide-react';

interface BillDetailModalProps {
  billIdentifier: { store: string; date: string } | null;
  expenses: Expense[];
  onClose: () => void;
  onUpdateBill: (store: string, date: string, updates: Partial<Expense>) => void;
  onUpdateExpense: (id: string, updates: Partial<Expense>) => void;
  people: string[];
}

interface ItemDetailModalProps {
  item: Expense | null;
  onClose: () => void;
  onUpdateExpense: (id: string, updates: Partial<Expense>) => void;
  people: string[];
}

export const BillDetailModal: React.FC<BillDetailModalProps> = ({ billIdentifier, expenses, onClose, onUpdateBill, onUpdateExpense, people }) => {
  const [isEditing, setIsEditing] = useState(false);

  // Reset editing state when bill changes
  useEffect(() => {
    setIsEditing(false);
  }, [billIdentifier]);

  if (!billIdentifier) return null;

  const billItems = expenses.filter(
    e => e.store === billIdentifier.store && e.date === billIdentifier.date
  );

  const total = billItems.reduce((sum, e) => sum + e.amount, 0);
  // Calculate distinct payers and owners to guess current status
  const payers = Array.from(new Set(billItems.map(e => e.payer)));
  const owners = Array.from(new Set(billItems.map(e => e.owner)));
  
  const isPersonalBill = owners.length === 1 && owners[0] === 'Me';

  const handleSetPersonal = () => {
    onUpdateBill(billIdentifier.store, billIdentifier.date, { owner: 'Me', payer: 'Me' });
  };

  const handleSetShared = () => {
    onUpdateBill(billIdentifier.store, billIdentifier.date, { owner: 'Shared' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-white flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 opacity-90 mb-1">
               <StoreIcon size={18} />
               <span className="text-sm font-medium uppercase tracking-wide">Bill Details</span>
            </div>
            <h2 className="text-2xl font-bold">{billIdentifier.store}</h2>
            <div className="flex items-center gap-2 mt-2 opacity-90 text-sm">
                <CalendarIcon size={16} />
                {new Date(billIdentifier.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-white text-indigo-600 shadow-sm' : 'bg-white/20 hover:bg-white/30 text-white'}`}
                title="Edit Bill"
            >
                <Edit2Icon size={20} />
            </button>
            <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white">
                <XIcon size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
            {/* Edit Controls */}
            {isEditing && (
                <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100 animate-in slide-in-from-top-2">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-3">Bulk Actions</p>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleSetPersonal}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border flex items-center justify-center gap-2 ${isPersonalBill ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 hover:bg-indigo-50 border-gray-200'}`}
                        >
                            <UserIcon size={16} />
                            Make Personal (Me)
                        </button>
                        <button 
                            onClick={handleSetShared}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border flex items-center justify-center gap-2 ${!isPersonalBill ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 hover:bg-purple-50 border-gray-200'}`}
                        >
                            <UsersIcon size={16} />
                            Make Shared
                        </button>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="flex justify-between items-end mb-6 border-b border-gray-100 pb-4">
                <div>
                    <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                    <p className="text-3xl font-bold text-gray-900">€{total.toFixed(2)}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">Paid By</p>
                    <div className="flex items-center justify-end gap-1">
                        {payers.map(p => (
                            <span key={p} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-md border border-indigo-100">
                                {p}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                <ShoppingBagIcon size={16} />
                Items ({billItems.length})
            </h3>
            
            <div className="space-y-2 pr-1">
                {billItems.map(item => (
                    <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isEditing ? 'bg-white border-indigo-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex-1 mr-4">
                            {isEditing ? (
                                <input 
                                    className="w-full text-sm font-medium text-gray-900 border-b border-gray-300 focus:border-indigo-500 outline-none pb-1 bg-transparent"
                                    value={item.description}
                                    onChange={(e) => onUpdateExpense(item.id, { description: e.target.value })}
                                    placeholder="Item name"
                                />
                            ) : (
                                <p className="font-medium text-gray-900 text-sm">{item.description}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">{item.category}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="font-bold text-gray-900 text-sm">€{item.amount.toFixed(2)}</p>
                             <button 
                                onClick={() => {
                                    if(isEditing) {
                                        const cycle = ['Shared', ...people];
                                        const nextIdx = (cycle.indexOf(item.owner) + 1) % cycle.length;
                                        onUpdateExpense(item.id, { owner: cycle[nextIdx] });
                                    }
                                }}
                                disabled={!isEditing}
                                className={`text-[10px] px-1.5 py-0.5 rounded-full mt-1 flex items-center justify-end gap-1 ml-auto transition-all ${
                                    item.owner === 'Shared' ? 'bg-teal-100 text-teal-800' : 'bg-gray-200 text-gray-700'
                                } ${isEditing ? 'cursor-pointer hover:ring-2 ring-indigo-300' : 'cursor-default'}`}
                             >
                                {item.owner === 'Shared' ? <UsersIcon size={10} /> : <UserIcon size={10} />}
                                {item.owner}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, onClose, onUpdateExpense, people }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  
  useEffect(() => {
    if (item) setEditName(item.description);
    setIsEditing(false);
  }, [item]);

  if (!item) return null;

  const handleSave = () => {
    onUpdateExpense(item.id, { description: editName });
    setIsEditing(false);
  };

  const toggleOwner = () => {
    const cycle = ['Shared', ...people];
    const nextIdx = (cycle.indexOf(item.owner) + 1) % cycle.length;
    onUpdateExpense(item.id, { owner: cycle[nextIdx] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 pb-0 flex justify-between items-start">
             <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-4">
                <TagIcon size={24} />
             </div>
             <div className="flex gap-2">
                 {isEditing ? (
                    <button onClick={handleSave} className="text-green-600 hover:text-green-700 p-1 bg-green-50 rounded-full">
                        <CheckIcon size={20} />
                    </button>
                 ) : (
                    <button onClick={() => setIsEditing(true)} className="text-indigo-600 hover:text-indigo-700 p-1 hover:bg-indigo-50 rounded-full">
                        <Edit2Icon size={20} />
                    </button>
                 )}
                 <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                    <XIcon size={24} />
                 </button>
             </div>
        </div>
       
        <div className="px-6 pb-6">
            {isEditing ? (
                <div className="mb-6">
                    <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Item Name</label>
                    <input 
                        autoFocus
                        value={editName} 
                        onChange={e => setEditName(e.target.value)}
                        className="w-full text-xl font-bold text-gray-900 border-b-2 border-indigo-500 outline-none pb-1"
                    />
                </div>
            ) : (
                <div className="mb-6">
                     <h2 className="text-xl font-bold text-gray-900 mb-1 break-words">{item.description}</h2>
                     <p className="text-gray-500 text-sm">{item.category}</p>
                </div>
            )}

            <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 text-gray-600">
                        <DollarSignIcon size={18} />
                        <span className="text-sm font-medium">Price</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">€{item.amount.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 text-gray-600">
                        <CalendarIcon size={18} />
                        <span className="text-sm font-medium">Date</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{new Date(item.date).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 text-gray-600">
                        <StoreIcon size={18} />
                        <span className="text-sm font-medium">Store</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{item.store}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="p-3 border border-indigo-100 bg-indigo-50/50 rounded-lg text-center">
                        <span className="text-xs text-indigo-600 font-bold uppercase block mb-1">Paid By</span>
                        <div className="flex items-center justify-center gap-1 text-indigo-900 font-bold">
                            <CreditCardIcon size={14} />
                            {item.payer}
                        </div>
                    </div>
                    <button 
                        onClick={isEditing ? toggleOwner : undefined}
                        className={`p-3 border rounded-lg text-center transition-all ${
                            isEditing 
                            ? 'border-purple-300 bg-purple-100 hover:bg-purple-200 cursor-pointer shadow-sm' 
                            : 'border-purple-100 bg-purple-50/50 cursor-default'
                        }`}
                    >
                        <span className="text-xs text-purple-600 font-bold uppercase block mb-1">
                            Owned By {isEditing && <span className="text-[10px] lowercase">(tap to change)</span>}
                        </span>
                        <div className="flex items-center justify-center gap-1 text-purple-900 font-bold">
                            {item.owner === 'Shared' ? <UsersIcon size={14} /> : <UserIcon size={14} />}
                            {item.owner}
                        </div>
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
