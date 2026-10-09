import { useMemo } from 'react';
import type { Project, Task, Expense, Member } from './types';
import { memberIdLabel } from './types';

type RetrospectiveViewProps = {
  project: Project;
  tasks: Task[];
  expenses: Expense[];
  members: Member[];
  onBack: () => void;
};

export default function RetrospectiveView({ project, tasks, expenses, members, onBack }: RetrospectiveViewProps) {
  
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.taskStatus === 'completed').length;
  const taskRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = project.budget - totalSpent;

  const memberContributions = useMemo(() => {
    return members.map(m => {
      const assigned = tasks.filter(t => t.assignees?.includes(m.id) || t.currentId === m.id);
      const completed = assigned.filter(t => t.taskStatus === 'completed');
      return { member: m, total: assigned.length, completed: completed.length };
    }).sort((a, b) => b.completed - a.completed);
  }, [members, tasks]);

  return (
    /* ▼ 修正: overflow-hidden から overflow-auto に変更してスクロールできるようにしました */
    <div className="flex-1 overflow-auto bg-gray-50 p-4 md:p-8 flex flex-col gap-6 items-center">
      <div className="w-full max-w-3xl flex items-center mb-2">
        <button onClick={onBack} className="text-gray-500 font-bold hover:text-gray-800 flex items-center gap-1">
          <span className="text-xl">←</span> 戻る
        </button>
      </div>

      <div className="w-full max-w-3xl bg-white rounded-2xl p-8 shadow-sm border border-gray-200 text-center relative overflow-auto">
        <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-blue-400 via-purple-500 to-pink-500"></div>
        <h1 className="text-3xl font-extrabold text-gray-800 mb-2">🎉 お疲れ様でした！</h1>
        <p className="text-gray-500 font-bold text-lg mb-6">プロジェクト「{project.name}」の振り返りレポート</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* タスクセクション */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 flex flex-col items-center justify-center">
            <h3 className="font-bold text-gray-600 mb-4">タスク達成率</h3>
            <div className="relative w-32 h-32 flex items-center justify-center rounded-full bg-gray-200" style={{ background: `conic-gradient(#22c55e ${taskRate}%, #e5e7eb ${taskRate}%)` }}>
               <div className="absolute w-24 h-24 bg-gray-50 rounded-full flex flex-col items-center justify-center">
                 <span className="text-2xl font-extrabold text-gray-800">{taskRate}%</span>
               </div>
            </div>
            <p className="mt-4 text-sm font-bold text-gray-500">{totalTasks}件中 {completedTasks}件完了</p>
          </div>

          {/* 予算セクション */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 flex flex-col justify-center gap-4">
            <h3 className="font-bold text-gray-600 text-center">予算利用状況</h3>
            <div className="flex justify-between items-end border-b pb-2">
              <span className="text-sm font-bold text-gray-500">全体予算</span>
              <span className="font-bold text-lg">{project.budget.toLocaleString()} 円</span>
            </div>
            <div className="flex justify-between items-end border-b pb-2">
              <span className="text-sm font-bold text-gray-500">最終支出額</span>
              <span className="font-bold text-lg text-orange-500">{totalSpent.toLocaleString()} 円</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-sm font-bold text-gray-500">残高</span>
              <span className={`font-bold text-xl ${balance < 0 ? 'text-red-500' : 'text-green-500'}`}>{balance.toLocaleString()} 円</span>
            </div>
          </div>
        </div>

        {/* メンバー貢献度 */}
        <div className="mt-8 text-left">
          <h3 className="font-bold text-gray-700 text-lg mb-4 flex items-center gap-2">👑 メンバー貢献度トップ</h3>
          <div className="flex flex-col gap-3">
            {memberContributions.map((mc, idx) => (
              <div key={mc.member.id} className="flex items-center gap-4 bg-white p-3 rounded-lg border shadow-sm">
                <span className="text-xl font-black text-gray-400 w-6 text-center">{idx + 1}</span>
                <div className={`${mc.member.color} w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-inner`}>
                  {mc.member.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800">{mc.member.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{memberIdLabel(mc.member)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-500">完了タスク</p>
                  <p className="font-extrabold text-blue-600">{mc.completed} <span className="text-xs text-gray-400">/ {mc.total}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}