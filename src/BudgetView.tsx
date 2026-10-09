import { useMemo, useState } from 'react';
import type { Expense, ConfirmOptions } from './types';

type BudgetViewProps = {
  activeProjectId: string;
  totalBudget: number;
  setTotalBudget: (amount: number) => void;
  expenses: Expense[];
  setExpenses: (expenses: Expense[]) => void;
  isReadOnly?: boolean;
  requestConfirm: (options: ConfirmOptions) => void;
};

export default function BudgetView({ activeProjectId, totalBudget, setTotalBudget, expenses, setExpenses, isReadOnly = false, requestConfirm }: BudgetViewProps) {
  
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editBudgetValue, setEditBudgetValue] = useState('');

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseMemo, setExpenseMemo] = useState('');
  const [expenseColor, setExpenseColor] = useState('#ef4444');

  const totalExpenseAmount = useMemo(() => (expenses || []).reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const balance = totalBudget - totalExpenseAmount;

  // ▼ 修正: 金額の大きい順（降順）に並び替えた支出リストを作成
  const sortedExpenses = useMemo(() => {
    return [...(expenses || [])].sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const pieChartData = useMemo(() => {
    if (totalExpenseAmount === 0) return { background: '#e5e7eb', labels: [] };
    let currentPercent = 0;
    const gradientStops: string[] = [];
    const labels: { id: string; x: number; y: number; text: string }[] = [];
    
    // ▼ 修正: 並び替え済みの配列を使って円グラフの割合を計算
    sortedExpenses.forEach((e) => {
      const percent = (e.amount / totalExpenseAmount) * 100;
      if (percent > 0) {
        const start = currentPercent;
        const end = currentPercent + percent;
        gradientStops.push(`${e.color} ${start}% ${end}%`);
        const middleAngle = (start + percent / 2) * 360 / 100; 
        const rad = (middleAngle - 90) * (Math.PI / 180);
        const radius = 35;
        labels.push({ id: e.id, x: 50 + radius * Math.cos(rad), y: 50 + radius * Math.sin(rad), text: `${Math.round(percent)}%` });
        currentPercent = end;
      }
    });
    return { background: `conic-gradient(${gradientStops.join(', ')})`, labels };
  }, [sortedExpenses, totalExpenseAmount]);

  const saveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const val = Number(editBudgetValue);
    if (!isNaN(val)) {
      setTotalBudget(val);
      setIsBudgetModalOpen(false);
    }
  };

  const openAddExpenseModal = () => {
    if (isReadOnly) return;
    setEditingExpense(null);
    setExpenseCategory('');
    setExpenseAmount('');
    setExpenseMemo('');
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
    setExpenseColor(colors[(expenses || []).length % colors.length]);
    setIsExpenseModalOpen(true);
  };

  const openEditExpenseModal = (expense: Expense, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnly) return;
    setEditingExpense(expense);
    setExpenseCategory(expense.category);
    setExpenseAmount(String(expense.amount));
    setExpenseMemo(expense.memo || '');
    setExpenseColor(expense.color);
    setIsExpenseModalOpen(true);
  };

  const saveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const amt = Number(expenseAmount);
    if (!expenseCategory.trim() || isNaN(amt)) return;

    if (editingExpense) {
      setExpenses((expenses || []).map(exp => exp.id === editingExpense.id ? { ...exp, category: expenseCategory, amount: amt, memo: expenseMemo, color: expenseColor } : exp));
    } else {
      setExpenses([...(expenses || []), { id: `e_${Date.now()}`, projectId: activeProjectId, category: expenseCategory, amount: amt, memo: expenseMemo, color: expenseColor }]);
    }
    setIsExpenseModalOpen(false);
  };

  const deleteExpense = () => {
    if (isReadOnly || !editingExpense) return;
    requestConfirm({
      title: '支出記録の削除',
      message: 'この支出記録を削除しますか？',
      confirmText: '削除する',
      isDanger: true,
      onConfirm: () => {
        setExpenses((expenses || []).filter(e => e.id !== editingExpense.id));
        setIsExpenseModalOpen(false);
      }
    });
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-4 md:p-6 mb-16 md:mb-0 relative">
      <div className="flex items-center gap-2 mb-4 text-xl font-bold text-gray-800">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        予算管理
      </div>

      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <section>
          <h2 className="font-bold text-gray-800 mb-2">予算</h2>
          <div className="bg-white rounded-xl border border-gray-300 shadow-sm p-4">
            <div className="flex justify-between items-center text-center">
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-800 mb-1">全体予算</p>
                <p className="font-bold text-blue-600"><span className="text-lg">{totalBudget.toLocaleString()}</span> <span className="text-sm text-gray-800">円</span></p>
              </div>
              <div className="w-px h-10 bg-gray-400"></div>
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-800 mb-1">支出額</p>
                <p className="font-bold text-orange-500"><span className="text-lg">{totalExpenseAmount.toLocaleString()}</span> <span className="text-sm text-gray-800">円</span></p>
              </div>
              <div className="w-px h-10 bg-gray-400"></div>
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-800 mb-1">残高</p>
                <p className={`font-bold ${balance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  <span className="text-lg">{balance.toLocaleString()}</span> <span className="text-sm text-gray-800">円</span>
                </p>
              </div>
            </div>
            {!isReadOnly && (
              <div className="mt-4 flex justify-end">
                <button 
                  onClick={() => { setEditBudgetValue(String(totalBudget)); setIsBudgetModalOpen(true); }} 
                  className="bg-blue-600/90 text-white text-xs font-bold px-6 py-1.5 rounded hover:bg-blue-700"
                >
                  編集
                </button>
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="font-bold text-gray-800 mb-2">支出履歴</h2>
          <div className="bg-white rounded-xl border border-gray-300 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row items-center gap-8 mb-4">
              
              <div className="relative w-40 h-40 shrink-0 rounded-full shadow-sm" style={{ background: pieChartData.background }}>
                <div className="absolute inset-0 m-auto w-20 h-20 bg-white rounded-full"></div>
                {pieChartData.labels.map(l => (
                  <span key={l.id} className="absolute text-[11px] font-extrabold text-white" style={{ left: `${l.x}%`, top: `${l.y}%`, transform: 'translate(-50%, -50%)', textShadow: '0px 0px 3px rgba(0,0,0,0.8)' }}>
                    {l.text}
                  </span>
                ))}
              </div>

              <div className="flex-1 w-full text-sm flex flex-col gap-2">
                {(!sortedExpenses || sortedExpenses.length === 0) ? (
                  <p className="text-gray-400 text-center font-bold">データがありません</p>
                ) : (
                  // ▼ 修正: 金額の高い順に並び替えられた配列をリスト表示
                  sortedExpenses.map(e => (
                    <div 
                      key={e.id} 
                      className={`group ${!isReadOnly ? 'cursor-pointer hover:bg-gray-50' : ''} p-3 rounded-xl border border-transparent hover:border-gray-200 transition-all`}
                      onClick={(ev) => !isReadOnly && openEditExpenseModal(e, ev)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shadow-sm mt-0.5" style={{ backgroundColor: e.color }}></span>
                          <span className="font-bold text-gray-800">{e.category}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-gray-800">{e.amount.toLocaleString()} <span className="text-xs font-normal">円</span></span>
                          {!isReadOnly && <span className="text-xs text-gray-400 md:opacity-0 group-hover:opacity-100 transition-opacity">✎ 編集</span>}
                        </div>
                      </div>
                      {e.memo && <p className="text-xs text-gray-500 ml-5 line-clamp-2 leading-relaxed">{e.memo}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>

            {!isReadOnly && (
              <div className="flex justify-start items-center mt-6">
                <button onClick={openAddExpenseModal} className="bg-gray-600 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 hover:bg-gray-700 transition-colors">
                  支出を記録する <span className="text-[10px] font-extrabold leading-none bg-white text-gray-600 rounded-full w-3.5 h-3.5 flex items-center justify-center">＋</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {isBudgetModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4" onClick={() => setIsBudgetModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">全体予算の編集</h3>
              <button onClick={() => setIsBudgetModalOpen(false)} className="text-gray-400">&times;</button>
            </div>
            <form onSubmit={saveBudget} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">金額 (円)</label>
                <input type="number" value={editBudgetValue} onChange={(e) => setEditBudgetValue(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 font-bold outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
                <button type="button" onClick={() => setIsBudgetModalOpen(false)} className="flex-1 py-2.5 border rounded-lg font-bold">キャンセル</button>
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4" onClick={() => setIsExpenseModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">{editingExpense ? '支出の編集' : '新規支出の記録'}</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-gray-400 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={saveExpense} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">カテゴリ名 (例: 備品費)</label>
                <input type="text" value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 font-bold outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">金額 (円)</label>
                <input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 font-bold outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">メモ (何を買った？)</label>
                <textarea value={expenseMemo} onChange={(e) => setExpenseMemo(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="画用紙、ペンなど..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500 mb-2">カテゴリカラー</label>
                <div className="flex gap-3">
                  {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'].map(c => (
                    <button key={c} type="button" onClick={() => setExpenseColor(c)} className={`w-8 h-8 rounded-full shadow-sm transition-transform ${expenseColor === c ? 'ring-2 ring-offset-2 ring-gray-800 scale-110' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
                {editingExpense && <button type="button" onClick={deleteExpense} className="flex-1 py-2.5 bg-white border border-red-200 text-red-500 font-bold rounded-lg hover:bg-red-50">削除</button>}
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}