import React from 'react';
import { Expense, Category } from '../types';
import { 
  Trash2Icon, CarrotIcon, AppleIcon, DrumstickIcon, CroissantIcon, MilkIcon, 
  PackageIcon, CookieIcon, CupSodaIcon, HomeIcon, SparklesIcon, HelpCircleIcon,
  WineIcon, SnowflakeIcon, SandwichIcon, BabyIcon, BoneIcon, StoreIcon, UserIcon, UsersIcon
} from 'lucide-react';

interface ExpenseListProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
}

const getCategoryIcon = (category: Category) => {
  switch (category) {
    case Category.Vegetables: return <CarrotIcon size={18} className="text-green-600" />;
    case Category.Fruits: return <AppleIcon size={18} className="text-red-500" />;
    case Category.MeatSeafood: return <DrumstickIcon size={18} className="text-orange-700" />;
    case Category.Bakery: return <CroissantIcon size={18} className="text-yellow-600" />;
    case Category.DairyEggs: return <MilkIcon size={18} className="text-blue-400" />;
    case Category.Pantry: return <PackageIcon size={18} className="text-amber-700" />;
    case Category.Frozen: return <SnowflakeIcon size={18} className="text-cyan-400" />;
    case Category.Snacks: return <CookieIcon size={18} className="text-purple-500" />;
    case Category.Beverages: return <CupSodaIcon size={18} className="text-sky-500" />;
    case Category.Alcohol: return <WineIcon size={18} className="text-rose-800" />;
    case Category.Deli: return <SandwichIcon size={18} className="text-orange-500" />;
    case Category.Baby: return <BabyIcon size={18} className="text-indigo-400" />;
    case Category.Pet: return <BoneIcon size={18} className="text-stone-500" />;
    case Category.Household: return <HomeIcon size={18} className="text-gray-600" />;
    case Category.PersonalCare: return <SparklesIcon size={18} className="text-pink-500" />;
    default: return <HelpCircleIcon size={18} className="text-gray-400" />;
  }
};

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onDeleteExpense }) => {
  if (expenses.length === 0) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center h-64">
        <div className="bg-gray-50 p-4 rounded-full mb-3">
          <PackageIcon size={32} className="text-gray-300" />
        </div>
        <p className="text-gray-500 font-medium">No items recorded yet</p>
        <p className="text-gray-400 text-sm">Scan a receipt or add items manually.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h2 className="text-lg font-semibold text-gray-800">Recent Items</h2>
        <span className="text-xs font-medium text-gray-500 bg-gray-200/50 px-2 py-1 rounded-full">
          {expenses.length} Items
        </span>
      </div>
      <div className="overflow-y-auto max-h-[500px]">
        <ul className="divide-y divide-gray-100">
          {expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((expense) => (
            <li key={expense.id} className="p-4 hover:bg-gray-50 transition-colors group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 shrink-0">
                    {getCategoryIcon(expense.category)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{expense.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1">
                         <StoreIcon size={10} /> {expense.store}
                      </span>
                      <span>•</span>
                      <span>{new Date(expense.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="font-semibold text-gray-900 text-sm block">
                        €{expense.amount.toFixed(2)}
                    </span>
                    <div className="flex items-center justify-end gap-1 mt-1">
                        <span className={`text-[10px] px-1 rounded border ${expense.payer === 'J' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-purple-50 border-purple-100 text-purple-600'}`}>
                            Paid by {expense.payer}
                        </span>
                        <span className={`text-[10px] px-1 rounded border flex items-center gap-0.5 ${expense.owner === 'Shared' ? 'bg-teal-50 border-teal-100 text-teal-600' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                            {expense.owner === 'Shared' ? <UsersIcon size={8} /> : <UserIcon size={8} />}
                            {expense.owner}
                        </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteExpense(expense.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
                    title="Delete"
                  >
                    <Trash2Icon size={16} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};