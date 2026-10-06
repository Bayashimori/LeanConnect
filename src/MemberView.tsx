import { useState, useEffect } from 'react';
import type { Member, Task, Group, Project, ConfirmOptions, User } from './types';
import { findUserByEmail } from './firestoreService';

type MemberViewProps = {
  activeProjectId: string;
  project: Project;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  projects: Project[];
  groups: Group[];
  members: Member[];
  tasks: Task[];
  isReadOnly?: boolean;
  requestConfirm: (options: ConfirmOptions) => void;
};

export default function MemberView({ 
  activeProjectId, 
  project, 
  setProjects, 
  projects, 
  groups, 
  members, 
  tasks, 
  isReadOnly = false, 
  requestConfirm 
}: MemberViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberTasks, setSelectedMemberTasks] = useState<{member: Member, tasks: Task[]} | null>(null);

  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [searchFeedback, setSearchFeedback] = useState<string>('');

  const handleOpenAddMemberPanel = () => {
    if (isReadOnly) return;
    setNewMemberEmail('');
    setMatchedUser(null);
    setSearchFeedback('');
    setIsAddPanelOpen(true);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMemberEmail(val);
    if (!val.trim() || !val.includes('@')) {
      setMatchedUser(null);
      setSearchFeedback('');
    }
  };

  useEffect(() => {
    const email = newMemberEmail.trim();
    if (!email || !email.includes('@')) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchFeedback('');
      try {
        const found = await findUserByEmail(email);
        if (found) {
          setMatchedUser(found);
          setSearchFeedback('');
        } else {
          setMatchedUser(null);
          setSearchFeedback('ユーザーが見つかりませんでした。Googleログイン済みのアドレスを入力してください。');
        }
      } catch (error) {
        console.error('ユーザー検索エラー:', error);
        setSearchFeedback('検索中にエラーが発生しました。');
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [newMemberEmail]);

  const handleInviteUser = (user: User) => {
    if (project.memberIds?.includes(user.id)) {
      alert('このユーザーは既にプロジェクトに参加しています。');
      return;
    }

    const updatedMemberIds = [...(project.memberIds || []), user.id];
    setProjects(projects.map(p => p.id === activeProjectId ? { ...p, memberIds: updatedMemberIds } : p));

    setNewMemberEmail('');
    setMatchedUser(null);
    setIsAddPanelOpen(false);
  };

  const handleDeleteMember = (member: Member) => {
    if (isReadOnly) return;
    requestConfirm({
      title: 'メンバーの削除',
      message: `${member.name}さんをプロジェクトから削除しますか？\n（相手の画面からこのプロジェクトが表示されなくなります）`,
      confirmText: '削除する',
      isDanger: true,
      onConfirm: () => {
        const updatedMemberIds = (project.memberIds || []).filter(uid => uid !== member.id);
        setProjects(projects.map(p => p.id === activeProjectId ? { ...p, memberIds: updatedMemberIds } : p));
      }
    });
  };

  const showMemberTasks = (member: Member) => {
    const mTasks = tasks.filter(t => t.assignees?.includes(member.name) || t.currentId === member.name);
    setSelectedMemberTasks({ member, tasks: mTasks });
  };

  const filteredMembers = members.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-4 md:p-6 mb-16 md:mb-0 relative font-sans">
      <div className="flex items-center gap-2 mb-4 text-xl font-bold text-gray-800">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        メンバー一覧 ({members.length}名)
      </div>

      <div className="max-w-md mx-auto flex flex-col gap-6">
        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl p-2 shadow-sm">
          <div className="pl-2 text-gray-400">🔍</div>
          <input 
            type="text" 
            placeholder="名前を検索" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-base font-medium p-1"
          />
        </div>

        <div className="flex flex-col gap-3">
          {filteredMembers.length === 0 ? (
            <p className="text-gray-400 text-center font-bold mt-4">該当するメンバーがいません</p>
          ) : (
            filteredMembers.map(m => (
              <div key={m.id} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4">
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt={m.name} className="w-11 h-11 rounded-full border border-gray-200 object-cover shadow-xs" />
                  ) : (
                    <div className={`${m.color} w-11 h-11 rounded-full flex items-center justify-center text-white text-base font-bold shadow-inner`}>
                      {m.name.charAt(0)}
                    </div>
                  )}
                  <span className="font-bold text-gray-800 text-base">
                    {m.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => showMemberTasks(m)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-base font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer">
                    担当タスク
                  </button>
                  {!isReadOnly && members.length > 1 && (
                    <button onClick={() => handleDeleteMember(m)} className="text-gray-300 hover:text-red-500 px-2 font-bold text-lg cursor-pointer">&times;</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {!isReadOnly && (
        <div className="absolute bottom-20 md:bottom-8 right-4 md:right-8 z-30">
          <button 
            onClick={handleOpenAddMemberPanel}
            className="bg-blue-600 hover:bg-blue-700 transition-all text-white font-bold p-4 md:py-3.5 md:px-6 rounded-full shadow-lg flex items-center justify-center gap-2 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
          >
            <span className="hidden md:inline">メンバーを招待</span>
            <span className="text-2xl font-light leading-none">＋</span>
          </button>
        </div>
      )}

      {/* メンバー招待パネル */}
      {isAddPanelOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setIsAddPanelOpen(false)} />
      )}

      <div className={`fixed top-0 right-0 h-full w-full lg:w-96 bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 z-50 flex flex-col ${isAddPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-gray-50 shrink-0">
          <div>
            <h3 className="font-extrabold text-lg text-gray-800">メンバーを招待</h3>
            <p className="text-base text-gray-400 font-medium">LeanConnectに登録済みのユーザーを検索</p>
          </div>
          <button onClick={() => setIsAddPanelOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none cursor-pointer">&times;</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          <div>
            <label className="block text-base font-bold text-gray-500 mb-1">相手のGoogleメールアドレス</label>
            <input 
              type="email" 
              autoFocus
              value={newMemberEmail} 
              onChange={handleEmailChange} 
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base font-medium" 
              placeholder="example@gmail.com" 
            />
          </div>

          {isSearching && (
            <div className="flex items-center gap-2 text-base font-bold text-gray-400 py-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              ユーザーを検索中...
            </div>
          )}

          {matchedUser && (
            <div className="bg-blue-50/60 border-2 border-blue-200 rounded-2xl p-4 flex flex-col gap-3 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center gap-3">
                {matchedUser.avatarUrl ? (
                  <img src={matchedUser.avatarUrl} alt={matchedUser.name} className="w-12 h-12 rounded-full border border-blue-200 object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-sm">
                    {matchedUser.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="font-extrabold text-gray-800 text-base truncate">{matchedUser.name}</p>
                  <p className="text-base text-gray-500 font-medium truncate">{matchedUser.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleInviteUser(matchedUser)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>＋</span> このユーザーをプロジェクトに追加
              </button>
            </div>
          )}

          {searchFeedback && !matchedUser && !isSearching && (
            <div className="bg-orange-50 border border-orange-200 text-orange-700 p-3 rounded-xl text-base font-bold leading-relaxed">
              {searchFeedback}
            </div>
          )}
        </div>
      </div>

      {selectedMemberTasks && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMemberTasks(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-6 flex flex-col gap-4 max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3 shrink-0">
              <div className="flex items-center gap-2">
                {selectedMemberTasks.member.avatarUrl ? (
                  <img src={selectedMemberTasks.member.avatarUrl} alt={selectedMemberTasks.member.name} className="w-8 h-8 rounded-full border object-cover" />
                ) : (
                  <div className={`${selectedMemberTasks.member.color} w-8 h-8 rounded-full flex items-center justify-center text-white text-base font-bold`}>
                    {selectedMemberTasks.member.name.charAt(0)}
                  </div>
                )}
                <h3 className="font-extrabold text-lg text-gray-800">{selectedMemberTasks.member.name} さんのタスク</h3>
              </div>
              <button onClick={() => setSelectedMemberTasks(null)} className="text-gray-400 hover:text-gray-600 text-2xl cursor-pointer">&times;</button>
            </div>
            <div className="overflow-y-auto flex flex-col gap-3">
              {selectedMemberTasks.tasks.length === 0 ? (
                 <p className="text-gray-400 text-center font-bold text-base my-4">担当タスクはありません</p>
              ) : (
                selectedMemberTasks.tasks.map(t => (
                  <div key={t.taskId} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.taskMode === 'prep' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                        {t.taskMode === 'prep' ? '準備' : '当日'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                        {groups.find(g => g.id === t.group)?.name || '未設定'}
                      </span>
                    </div>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-gray-800 text-base">{t.taskName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.taskStatus === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {t.taskStatus === 'completed' ? '完了' : '進行中'}
                      </span>
                    </div>
                    <p className="text-base font-bold text-gray-500">
                      {t.taskMode === 'prep' ? `${t.startDate} 〜 ${t.endDate}` : `${t.startTime} 〜 ${t.endTime}`}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="pt-2 shrink-0">
              <button onClick={() => setSelectedMemberTasks(null)} className="w-full py-2.5 border rounded-xl font-bold text-gray-700 hover:bg-gray-50 cursor-pointer">閉じる</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}