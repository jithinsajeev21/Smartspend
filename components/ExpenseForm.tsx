import React, { useState, useRef, useEffect } from 'react';
import { Category, Expense } from '../types';
import { CameraIcon, Loader2Icon, StoreIcon, UserIcon, UsersIcon, PercentIcon, SaveIcon, ArrowRightIcon, XIcon, CalendarIcon, CheckIcon, UserPlusIcon, SplitSquareHorizontalIcon, AlertTriangleIcon, Edit3Icon, ChevronDownIcon } from 'lucide-react';
import { parseReceipt } from '../services/geminiService';

interface ExpenseFormProps {
  onAddExpenses: (expenses: Omit<Expense, 'id'>[]) => void;
  people: string[];
  onAddPerson: (name: string) => void;
}

type PendingItem = Omit<Expense, 'id' | 'payer' | 'owner'> & {
  tempId: string;
  owner: string; // Dynamic owner name or 'Shared'
};

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ onAddExpenses, people, onAddPerson }) => {
  // --- Mode State ---
  const [mode, setMode] = useState<'input' | 'review'>('input');
  
  // --- Input State ---
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<Category>(Category.Pantry);
  const [store, setStore] = useState('');
  
  // --- Receipt Scanning State ---
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Review/Split State ---
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [payer, setPayer] = useState<string>('Me'); 
  const [globalDiscount, setGlobalDiscount] = useState<string>('');
  
  // --- Unified Bill Settings ---
  const [billType, setBillType] = useState<'personal' | 'shared'>('shared');
  const [newPersonName, setNewPersonName] = useState('');
  const [isAddingPerson, setIsAddingPerson] = useState(false);

  // --- Handlers ---

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !date || !store) return;

    const newItem: PendingItem = {
      tempId: crypto.randomUUID(),
      description,
      amount: parseFloat(amount),
      date,
      category,
      store,
      owner: people.length > 1 ? 'Shared' : 'Me'
    };

    initializeReview([newItem]);
    
    // Reset input fields
    setDescription('');
    setAmount('');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const matches = base64String.match(/^data:(.+);base64,(.+)$/);
        
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          
          try {
            const result = await parseReceipt(base64Data, mimeType);
            
            if (result.items && result.items.length > 0) {
              const itemsWithTempIds: PendingItem[] = result.items.map(item => ({
                ...item,
                tempId: crypto.randomUUID(),
                owner: people.length > 1 ? 'Shared' : 'Me'
              }));
              
              if (result.totalDiscount) {
                setGlobalDiscount(result.totalDiscount.toString());
              }

              initializeReview(itemsWithTempIds);
            }
          } catch (err) {
            console.error("Failed to parse receipt", err);
            alert("Could not extract data from the image. Please try again or enter manually.");
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error reading file", error);
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  const initializeReview = (items: PendingItem[]) => {
    setPendingItems(items);
    // Default logic: If multiple people exist, default to Shared. Else Personal.
    const defaultType = people.length > 1 ? 'shared' : 'personal';
    setBillType(defaultType);
    setPayer('Me');
    setMode('review');
  };

  // --- Review Logic ---

  const handleAddPersonInline = () => {
    if (newPersonName.trim()) {
        onAddPerson(newPersonName.trim());
        setNewPersonName('');
        setIsAddingPerson(false);
    }
  };

  const updateItem = (tempId: string, updates: Partial<PendingItem>) => {
    setPendingItems(prev => prev.map(item => 
        item.tempId === tempId ? { ...item, ...updates } : item
    ));
  };

  const toggleOwner = (tempId: string) => {
    setPendingItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item;
      
      // Cycle logic: Shared -> Person 1 -> Person 2 ... -> Shared
      const cycle = ['Shared', ...people];
      const currentIndex = cycle.indexOf(item.owner);
      const nextIndex = (currentIndex + 1) % cycle.length;
      
      return { ...item, owner: cycle[nextIndex] };
    }));
  };

  const handleFinalSave = () => {
    const discountVal = parseFloat(globalDiscount) || 0;
    const totalBillAmount = pendingItems.reduce((sum, item) => sum + item.amount, 0);
    
    // Apply Bill Type Constraint
    // If Personal: Force everything to 'Me' payer and 'Me' owner
    const finalPayer = billType === 'personal' ? 'Me' : payer;
    
    const finalExpenses = pendingItems.map(item => {
      let finalAmount = item.amount;
      
      if (discountVal > 0 && totalBillAmount > 0) {
        const ratio = item.amount / totalBillAmount;
        const itemDiscountShare = discountVal * ratio;
        finalAmount = Math.max(0, item.amount - itemDiscountShare);
      }

      return {
        description: item.description,
        amount: parseFloat(finalAmount.toFixed(2)),
        originalAmount: item.amount,
        date: item.date,
        category: item.category,
        store: item.store,
        payer: finalPayer,
        owner: billType === 'personal' ? 'Me' : item.owner
      };
    });

    onAddExpenses(finalExpenses);
    cancelReview();
  };

  const cancelReview = () => {
    setMode('input');
    setPendingItems([]);
    setGlobalDiscount('');
    setBillType('shared');
    setPayer('Me');
  };

  // --- Validation Helpers (Used for UI flagging only) ---
  const isDateOld = (dateStr: string) => {
      const d = new Date(dateStr);
      const now = new Date();
      const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
      return diffDays > 30;
  };

  const isNameGeneric = (name: string) => {
      const GENERIC_TERMS = ['grocery', 'item', 'food', 'total', 'goods', 'shop', 'store', 'veg', 'fruit'];
      const n = name.toLowerCase();
      return GENERIC_TERMS.some(t => n.includes(t));
  };

  // --- Render: Input Mode (Step 1) ---
  if (mode === 'input') {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Add Expenses</h2>
          
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
            >
              {isScanning ? (
                <Loader2Icon size={16} className="animate-spin" />
              ) : (
                <CameraIcon size={16} />
              )}
              {isScanning ? 'Scanning...' : 'Scan Receipt'}
            </button>
          </div>
        </div>

        <form onSubmit={handleManualAdd} className="grid grid-cols-1 gap-4">
          {/* Simple Manual Entry Form */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Milk"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (€)</label>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none"
                    required
                />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none"
                    required
                />
            </div>
          </div>
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store</label>
            <div className="relative">
                <StoreIcon size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                    type="text"
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                    placeholder="e.g., Walmart"
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none"
                    required
                />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
             <div className="relative">
                 <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value as Category)}
                    className="w-full appearance-none px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none bg-white"
                 >
                     {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
                 <ChevronDownIcon size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
             </div>
          </div>

          <button
            type="submit"
            className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm"
          >
            <ArrowRightIcon size={18} />
            Continue
          </button>
        </form>
      </div>
    );
  }

  // --- Render: Review Mode (Step 2 - Unified) ---
  const totalAmount = pendingItems.reduce((sum, i) => sum + i.amount, 0);
  const discountNum = parseFloat(globalDiscount) || 0;
  const finalTotal = Math.max(0, totalAmount - discountNum);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100 relative animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-100">
        <div>
            <h2 className="text-xl font-bold text-gray-900">Review & Confirm</h2>
            <p className="text-sm text-gray-500">Step 2 of 2</p>
        </div>
        <button onClick={cancelReview} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
          <XIcon size={20} />
        </button>
      </div>

      {/* Bill Settings (Type & Payer) */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Bill Settings</label>
            {/* Bill Type Toggle */}
            <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                <button 
                    onClick={() => setBillType('personal')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${billType === 'personal' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Personal
                </button>
                <button 
                    onClick={() => setBillType('shared')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${billType === 'shared' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Shared
                </button>
            </div>
        </div>

        {billType === 'shared' && (
            <div className="space-y-3 animate-in fade-in zoom-in-95">
                {/* Payer Selector */}
                <div>
                    <span className="text-xs text-gray-500 font-medium block mb-2">Who paid?</span>
                    <div className="flex flex-wrap gap-2">
                        {people.map(p => (
                             <button
                                key={p}
                                onClick={() => setPayer(p)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                    payer === p 
                                    ? 'bg-white border-indigo-600 text-indigo-700 shadow-sm ring-1 ring-indigo-600' 
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                }`}
                             >
                                {p}
                             </button>
                        ))}
                         {/* Quick Add Person */}
                         {isAddingPerson ? (
                             <div className="flex items-center gap-1">
                                 <input 
                                    autoFocus
                                    className="w-24 px-2 py-1 text-sm border rounded outline-none"
                                    placeholder="Name"
                                    value={newPersonName}
                                    onChange={e => setNewPersonName(e.target.value)}
                                    onBlur={() => !newPersonName && setIsAddingPerson(false)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddPersonInline()}
                                 />
                                 <button onClick={handleAddPersonInline} className="bg-indigo-600 text-white p-1 rounded"><CheckIcon size={14}/></button>
                             </div>
                         ) : (
                             <button onClick={() => setIsAddingPerson(true)} className="px-2 py-1.5 rounded-lg text-sm border border-dashed border-gray-300 text-gray-400 hover:text-indigo-600 hover:border-indigo-300">
                                + Add
                             </button>
                         )}
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Items List (Editable) */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-sm font-bold text-gray-700">Items ({pendingItems.length})</span>
            {billType === 'shared' && <span className="text-xs text-gray-400">Tap badge to assign</span>}
        </div>
        
        <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100 max-h-80 overflow-y-auto bg-gray-50/30">
          {pendingItems.map((item) => {
             const isOld = isDateOld(item.date);
             const isGeneric = isNameGeneric(item.description);
             const needsAttention = isOld || isGeneric;

             return (
                <div key={item.tempId} className={`p-3 transition-colors ${needsAttention ? 'bg-orange-50/50' : 'hover:bg-gray-50'}`}>
                    {/* Warning Line */}
                    {needsAttention && (
                        <div className="flex gap-2 mb-2 text-[10px] font-bold uppercase tracking-wide">
                            {isOld && <span className="text-orange-600 flex items-center gap-1"><CalendarIcon size={10} /> Check Date</span>}
                            {isGeneric && <span className="text-yellow-600 flex items-center gap-1"><AlertTriangleIcon size={10} /> Check Name</span>}
                        </div>
                    )}

                    <div className="flex items-start gap-3">
                         {/* Inputs Section */}
                         <div className="flex-1 space-y-2">
                             <input 
                                className={`w-full bg-transparent text-sm font-medium text-gray-900 border-b border-transparent focus:border-indigo-300 focus:bg-white outline-none placeholder-gray-400 ${isGeneric ? 'text-yellow-700' : ''}`}
                                value={item.description}
                                onChange={e => updateItem(item.tempId, { description: e.target.value })}
                                placeholder="Item Name"
                             />
                             <div className="flex items-center gap-2">
                                <div className="relative w-20">
                                    <span className="absolute left-0 top-0 text-xs text-gray-400">€</span>
                                    <input 
                                        type="number" 
                                        className="w-full bg-transparent text-xs text-gray-600 pl-3 border-b border-transparent focus:border-indigo-300 outline-none"
                                        value={item.amount}
                                        onChange={e => updateItem(item.tempId, { amount: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <span className="text-xs text-gray-300">|</span>
                                <input 
                                    type="date"
                                    className={`bg-transparent text-xs border-b border-transparent focus:border-indigo-300 outline-none ${isOld ? 'text-orange-600 font-bold bg-white/50 px-1 rounded' : 'text-gray-500'}`}
                                    value={item.date}
                                    onChange={e => updateItem(item.tempId, { date: e.target.value })}
                                />
                             </div>
                         </div>

                         {/* Owner Toggle */}
                         {billType === 'shared' && (
                             <button 
                                onClick={() => toggleOwner(item.tempId)}
                                className={`shrink-0 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border transition-all w-16 text-center truncate ${
                                    item.owner === 'Shared' 
                                    ? 'bg-teal-50 text-teal-700 border-teal-200' 
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                }`}
                             >
                                {item.owner}
                             </button>
                         )}
                    </div>
                </div>
             );
          })}
        </div>
      </div>

      {/* Global Discount */}
      <div className="mb-6 flex items-center gap-3 bg-orange-50 p-3 rounded-lg border border-orange-100">
         <PercentIcon size={18} className="text-orange-500" />
         <div className="flex-1">
             <label className="block text-xs font-bold text-orange-800 uppercase">Coupon / Voucher</label>
             <input 
                type="number" 
                placeholder="0.00"
                value={globalDiscount}
                onChange={e => setGlobalDiscount(e.target.value)}
                className="bg-transparent text-sm font-medium text-orange-900 placeholder-orange-300 outline-none w-full"
             />
         </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex justify-between items-end mb-4">
            <div>
                <p className="text-xs text-gray-500">Total Items (Net)</p>
                <p className="text-lg font-bold text-gray-900">€{finalTotal.toFixed(2)}</p>
            </div>
             {discountNum > 0 && <span className="text-xs text-orange-600 font-medium">Includes €{discountNum} discount</span>}
        </div>

        <button
          onClick={handleFinalSave}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
        >
          <SaveIcon size={20} />
          Confirm Expenses
        </button>
      </div>
    </div>
  );
};