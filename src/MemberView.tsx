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
  members, 
  tasks, 
  isReadOnly = false, 
  requestConfirm 
}: MemberViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // ▼ 修正: 選択されたメンバーのタスクを保持するステートを正常に有効化
  const [selectedMemberTasks, setSelectedMemberTasks] = useState<{member: Member, tasks: Task[]} | null>(null);

  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [searchFeedback, setSearchFeedback] = useState<string>('');

  const resetSearchState = () => {
    setMatchedUser(null);
    setSearchFeedback('');
  };

  const handleOpenAddMemberPanel = () => {
    if (isReadOnly) return;
    setNewMemberEmail('');
    resetSearchState();
    setIsAddPanelOpen(true);
  };

  useEffect(() => {
    const email = newMemberEmail.trim();
    if (!email || !email.includes('@')) return;

    const timer = setTimeout(async () => {
      const currentEmail = email;
      setIsSearching(true);
      setSearchFeedback('');
      try {
        const found = await findUserByEmail(currentEmail);
        if (newMemberEmail.trim() !== currentEmail) return;
        if (found) {
          setMatchedUser(found);
          setSearchFeedback('');
        } else {
          setMatchedUser(null);
          setSearchFeedback('ユーザーが見つかりませんでした。Googleログイン済みのアドレスを入力してください。');
        }
      } catch (error) {
        console.error('ユーザー検索エラー:', error);
        if (newMemberEmail.trim() === currentEmail) {
          setSearchFeedback('検索中にエラーが発生しました。');
        }
      } finally {
        if (newMemberEmail.trim() === currentEmail) {
          setIsSearching(false);
        }
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [newMemberEmail]);

  const handleAddMember = () => {
    if (!matchedUser) return;
    const currentMemberIds = project.memberIds || [];
    if (currentMemberIds.includes(matchedUser.id)) {
      alert('すでにこのプロジェクトに参加しています。');
      return;
    }

    const updatedMemberIds = [...currentMemberIds, matchedUser.id];
    setProjects(projects.map(p => p.id === activeProjectId ? { ...p, memberIds: updatedMemberIds } : p));
    setIsAddPanelOpen(false);
  };

  const handleDeleteMember = (member: Member) => {
    if (isReadOnly) return;
    const memberName = member.name || member.username;
    requestConfirm({
      title: 'メンバーの削除',
      message: `${memberName}さんをプロジェクトから削除しますか？\n（相手の画面からこのプロジェクトが表示されなくなります）`,
      confirmText: '削除する',
      isDanger: true,
      onConfirm: () => {
        const updatedMemberIds = (project.memberIds || []).filter(uid => uid !== member.id);
        setProjects(projects.map(p => p.id === activeProjectId ? { ...p, memberIds: updatedMemberIds } : p));
      }
    });
  };

  const showMemberTasks = (member: Member) => {
    const mTasks = tasks.filter(t => t.assignees?.includes(member.id) || t.currentId === member.id);
    setSelectedMemberTasks({ member, tasks: mTasks });
  };

  const filteredMembers = members.filter(m => {
    const nameMatch = (m.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const usernameMatch = (m.username || '').toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || usernameMatch;
  });

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
            placeholder="名前やユーザーIDで検索" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-sm font-medium p-1"
          />
        </div>

        <div className="flex flex-col gap-3">
          {filteredMembers.length === 0 ? (
            <p className="text-gray-400 text-center font-bold mt-4">該当するメンバーがいません</p>
          ) : (
            filteredMembers.map(m => {
              const memberName = m.name || m.username || '名前未設定';
              const username = m.username ? `@${m.username}` : '';
              return (
                <div key={m.id} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-4">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt={memberName} className="w-11 h-11 rounded-full border border-gray-200 object-cover shadow-xs" />
                    ) : (
                      <div className={`${m.color || 'bg-blue-600'} w-11 h-11 rounded-full flex items-center justify-center text-white text-base font-bold shadow-inner`}>
                        {memberName.charAt(0)}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800 text-base">{memberName}</span>
                      {username && <span className="text-xs text-gray-400 font-mono">{username}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => showMemberTasks(m)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer">
                      担当タスク
                    </button>
                    {!isReadOnly && members.length > 1 && (
                      <button onClick={() => handleDeleteMember(m)} className="text-gray-300 hover:text-red-500 px-2 font-bold text-lg cursor-pointer">&times;</button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {!isReadOnly && (
        <div className="absolute bottom-20 md:bottom-8 right-4 md:right-8 z-30">
          <button 
            onClick={handleOpenAddMemberPanel}
            className="bg-blue-600 hover:bg-blue-700 transition-all text-white font-bold p-4 md:py-3.5 md:px-6 rounded-full shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="text-xl">+</span>
            <span className="hidden md:inline">メンバー招待</span>
          </button>
        </div>
      )}

      {/* 担当タスク一覧表示用モーダル */}
      {selectedMemberTasks && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMemberTasks(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 flex flex-col gap-4 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-lg text-gray-800">
                {selectedMemberTasks.member.name || selectedMemberTasks.member.username} さんの担当タスク
              </h3>
              <button onClick={() => setSelectedMemberTasks(null)} className="text-gray-400 hover:text-gray-600 text-2xl cursor-pointer">&times;</button>
            </div>

            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {selectedMemberTasks.tasks.length === 0 ? (
                <p className="text-gray-400 text-center font-bold py-6">担当しているタスクはありません</p>
              ) : (
                selectedMemberTasks.tasks.map(t => (
                  <div key={t.taskId} className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-gray-800">{t.taskName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.taskStatus === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {t.taskStatus === 'completed' ? '完了' : '進行中'}
                      </span>
                    </div>
                    {t.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">{t.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button onClick={() => setSelectedMemberTasks(null)} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors cursor-pointer">
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* メンバー招待モーダル */}
      {isAddPanelOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsAddPanelOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 flex flex-col gap-4 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-lg text-gray-800">メンバー招待</h3>
              <button onClick={() => setIsAddPanelOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl cursor-pointer">&times;</button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">メールアドレス</label>
                <input 
                  type="email" 
                  value={newMemberEmail}
                  onChange={e => setNewMemberEmail(e.target.value)}
                  placeholder="example@domain.com"
                  className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                />
              </div>

              {isSearching && <p className="text-xs text-gray-500">ユーザーを検索中...</p>}
              {searchFeedback && <p className="text-xs text-red-500 font-bold">{searchFeedback}</p>}

              {matchedUser && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                      {(matchedUser.username || matchedUser.name).charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-800">{matchedUser.username || matchedUser.name}</p>
                      <p className="text-[10px] text-gray-500">{matchedUser.email}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600">見つかりました</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t flex gap-3">
              <button onClick={() => setIsAddPanelOpen(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 cursor-pointer">キャンセル</button>
              <button 
                onClick={handleAddMember} 
                disabled={!matchedUser}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-40 transition-colors shadow-sm cursor-pointer"
              >
                追加する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}