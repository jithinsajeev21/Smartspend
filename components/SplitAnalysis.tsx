import React, { useMemo } from 'react';
import { Expense } from '../types';
import { ScaleIcon, ArrowRightLeftIcon, CheckCircle2Icon } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface SplitAnalysisProps {
  expenses: Expense[];
  people: string[];
}

export const SplitAnalysis: React.FC<SplitAnalysisProps> = ({ expenses, people }) => {
  
  const stats = useMemo(() => {
    const data: Record<string, { paid: number, consumed: number }> = {};
    
    // Initialize data for all known people
    people.forEach(p => {
      data[p] = { paid: 0, consumed: 0 };
    });

    expenses.forEach(e => {
      // 1. Track Payment
      const payer = e.payer;
      if (!data[payer]) {
         // Handle unknown payer (e.g., old data or deleted person) by initializing
         data[payer] = { paid: 0, consumed: 0 };
      }
      data[payer].paid += e.amount;

      // 2. Track Consumption
      const owner = e.owner;
      if (owner === 'Shared') {
        // Divided equally among all active people
        // Note: If expense data includes people no longer in the list, 
        // dividing by current 'people.length' is the standard "House Split" behavior.
        const splitAmount = e.amount / people.length;
        people.forEach(p => {
           if(data[p]) data[p].consumed += splitAmount;
        });
      } else {
         // Specific owner
         if (!data[owner]) data[owner] = { paid: 0, consumed: 0 };
         data[owner].consumed += e.amount;
      }
    });

    // Calculate net balances
    // net > 0 means they paid MORE than their share (They are owed money)
    // net < 0 means they paid LESS than their share (They owe money)
    const result: Record<string, { paid: number, consumed: number, net: number }> = {};
    Object.keys(data).forEach(key => {
        result[key] = {
            paid: data[key].paid,
            consumed: data[key].consumed,
            net: data[key].paid - data[key].consumed
        };
    });

    return result;
  }, [expenses, people]);

  // Generate Chart Data
  const chartData = Object.keys(stats).map(name => ({
      name: name,
      paid: stats[name].paid,
      share: stats[name].consumed
  }));

  // Generate Settlement Text for 'Me'
  const settlementText = () => {
    const myStats = stats['Me'];
    if (!myStats) return "No data for 'Me' yet.";

    const bal = myStats.net;
    if (Math.abs(bal) < 0.01) return "You are all settled up!";
    
    if (bal > 0) {
        return `You are owed €${bal.toFixed(2)} in total`;
    } else {
        return `You owe €${Math.abs(bal).toFixed(2)} in total`;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-indigo-100 flex justify-between items-center">
        <div>
            <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
            <ScaleIcon size={20} />
            Split & Settlement
            </h3>
            <p className="text-indigo-700 text-sm">Track who paid vs. fair share</p>
        </div>
        <div className={`px-4 py-2 rounded-lg font-bold text-sm shadow-sm ${Math.abs(stats['Me']?.net || 0) < 0.01 ? 'bg-green-100 text-green-700' : 'bg-white text-indigo-600'}`}>
            {Math.abs(stats['Me']?.net || 0) < 0.01 ? <CheckCircle2Icon size={20} /> : <ArrowRightLeftIcon size={20} />}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        
        {/* Visual Chart */}
        <div className="h-56 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" barSize={20} margin={{ left: 20, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                    <Tooltip cursor={{fill: 'transparent'}} formatter={(val: number) => `€${val.toFixed(2)}`} />
                    <Bar dataKey="paid" name="Total Paid" fill="#818cf8" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="share" name="Fair Share" fill="#c7d2fe" radius={[0, 4, 4, 0]} />
                </BarChart>
             </ResponsiveContainer>
             <div className="flex justify-center gap-4 text-xs text-gray-500 mt-2">
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-indigo-400 rounded-sm"></span> Total Paid</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-indigo-200 rounded-sm"></span> Fair Consumption</div>
             </div>
        </div>

        {/* Stats & Action */}
        <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Your Net Position</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                    {settlementText()}
                </div>
                <p className="text-xs text-gray-400 mt-1">Calculated based on equal split of shared items.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {people.slice(0, 4).map(p => (
                     <div key={p} className="p-3 rounded-lg border border-gray-100 text-center">
                        <p className="text-xs text-gray-500 mb-1 truncate">{p} Share</p>
                        <p className="font-semibold text-gray-800">€{stats[p]?.consumed.toFixed(2) || '0.00'}</p>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};
