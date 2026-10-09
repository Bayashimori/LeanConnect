import { useState } from 'react';
import type { Project, Task, Member, User, ConfirmOptions } from './types';

type HomeViewProps = {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  tasks: Task[];
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  onSelectProject: (id: string, view: 'gantt' | 'retrospective', mode?: 'prep' | 'day') => void;
  currentUser: User;
  onLogout: () => void;
  onOpenProfile?: () => void;
  requestConfirm: (options: ConfirmOptions) => void;
};

export default function HomeView({
  projects,
  setProjects,
  tasks,
  onSelectProject,
  currentUser,
  onLogout,
  onOpenProfile,
  requestConfirm
}: HomeViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectBudget, setNewProjectBudget] = useState('');
  const [newProjectEventDate, setNewProjectEventDate] = useState('');

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const newProject: Project = {
      id: `p_${Date.now()}`,
      name: newProjectName.trim(),
      status: 'active',
      budget: Number(newProjectBudget) || 0,
      eventDate: newProjectEventDate || undefined,
      memberIds: [currentUser.id],
      createdAt: Date.now()
    };

    setProjects([...projects, newProject]);
    setNewProjectName('');
    setNewProjectBudget('');
    setNewProjectEventDate('');
    setIsModalOpen(false);
  };

  const handleToggleStatus = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = project.status === 'active' ? 'completed' : 'active';
    const actionText = nextStatus === 'completed' ? '完了（振り返りモード）' : '進行中';

    requestConfirm({
      title: 'ステータスの変更',
      message: `プロジェクト「${project.name}」を「${actionText}」に変更しますか？`,
      confirmText: '変更する',
      onConfirm: () => {
        setProjects(projects.map(p => p.id === project.id ? { ...p, status: nextStatus } : p));
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden font-sans">
      {/* ヘッダー */}
      <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-base shadow-sm">
            LC
          </div>
          <span className="font-black text-xl text-gray-800 tracking-tight">
            Lean<span className="text-blue-600">Connect</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* ユーザー情報（クリックでプロフィール画面へ） */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full hover:bg-gray-100 transition-colors cursor-pointer group"
            title="プロフィール設定を開く"
          >
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="avatar" className="w-8 h-8 rounded-full border object-cover" />
            ) : (
              <div className={`w-8 h-8 rounded-full ${currentUser.color || 'bg-blue-600'} text-white font-bold flex items-center justify-center text-xs shadow-xs`}>
                {currentUser.name.charAt(0)}
              </div>
            )}
            <div className="text-left hidden sm:block">
              <p className="font-extrabold text-xs text-gray-800 group-hover:text-blue-600 transition-colors">{currentUser.name}</p>
              {currentUser.username && <p className="text-[10px] text-gray-400 font-mono leading-none">@{currentUser.username}</p>}
            </div>
          </button>

          {/* ログアウトボタン */}
          <button
            onClick={onLogout}
            className="text-xs font-bold text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 p-2 sm:px-3 rounded-xl transition-colors cursor-pointer"
            title="ログアウト"
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
        <div className="w-full max-w-4xl flex flex-col gap-6">
          
          <div className="flex justify-between items-end gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-gray-800">プロジェクト一覧</h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">参加中のプロジェクトを管理・選択してください</p>
            </div>
            {/* スマホでは幅が足りず文字が折り返してボタンが大きく崩れるため、短い表記にして折り返さないようにする */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="shrink-0 whitespace-nowrap bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>＋</span>
              <span className="sm:hidden">新規</span>
              <span className="hidden sm:inline">新規プロジェクト</span>
            </button>
          </div>

          {/* プロジェクト一覧グリッド */}
          {projects.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center flex flex-col items-center gap-4 shadow-xs">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl">
                📂
              </div>
              <div>
                <h3 className="font-extrabold text-gray-800 text-lg">プロジェクトがありません</h3>
                <p className="text-xs text-gray-400 mt-1">「新規プロジェクト」を作成するか、メンバーに招待してもらいましょう！</p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                プロジェクトを作成する
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p) => {
                // 準備タスクの進捗計算
                const prepTasks = tasks.filter(t => t.projectId === p.id && (!t.taskMode || t.taskMode === 'prep'));
                const compPrepTasks = prepTasks.filter(t => t.taskStatus === 'completed').length;
                const prepProgress = prepTasks.length > 0 ? Math.round((compPrepTasks / prepTasks.length) * 100) : 0;

                // 当日タスクの進捗計算
                const dayTasks = tasks.filter(t => t.projectId === p.id && t.taskMode === 'day');
                const compDayTasks = dayTasks.filter(t => t.taskStatus === 'completed').length;
                const dayProgress = dayTasks.length > 0 ? Math.round((compDayTasks / dayTasks.length) * 100) : 0;

                const isCompleted = p.status === 'completed';

                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectProject(p.id, isCompleted ? 'retrospective' : 'gantt')}
                    className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between gap-4 group"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isCompleted ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {isCompleted ? '✓ 完了・振り返り' : '進行中'}
                        </span>
                        
                        <button
                          onClick={(e) => handleToggleStatus(p, e)}
                          className="text-[11px] font-bold text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded-lg border transition-colors cursor-pointer"
                        >
                          {isCompleted ? '進行中に戻す' : '完了にする'}
                        </button>
                      </div>

                      <h3 className="font-black text-lg text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {p.name}
                      </h3>
                      {p.eventDate && (
                        <p className="text-xs text-gray-400 font-bold mt-1">🗓 イベント当日: {p.eventDate}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 pt-3 border-t border-gray-100">
                      {/* 準備モード進捗 */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                          <span>準備進捗 ({compPrepTasks}/{prepTasks.length})</span>
                          <span className="text-blue-600 font-extrabold">{prepProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${isCompleted ? 'bg-green-500' : 'bg-blue-600'}`}
                            style={{ width: `${prepProgress}%` }}
                          />
                        </div>
                      </div>

                      {/* 当日モード進捗 */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                          <span>当日進捗 ({compDayTasks}/{dayTasks.length})</span>
                          <span className="text-orange-500 font-extrabold">{dayProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${isCompleted ? 'bg-green-500' : 'bg-orange-500'}`}
                            style={{ width: `${dayProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>

      {/* 新規プロジェクト作成モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden p-6 flex flex-col gap-4 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-lg text-gray-800">新規プロジェクト作成</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none cursor-pointer">&times;</button>
            </div>
            
            <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">プロジェクト名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-800"
                  placeholder="例: 学園祭 模擬店出店"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">全体予算 (円)</label>
                <input
                  type="number"
                  value={newProjectBudget}
                  onChange={e => setNewProjectBudget(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-800"
                  placeholder="例: 50000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">イベント当日日付</label>
                <input
                  type="date"
                  value={newProjectEventDate}
                  onChange={e => setNewProjectEventDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-800"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  作成する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}