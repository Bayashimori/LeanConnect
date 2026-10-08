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
  const [, setSelectedMemberTasks] = useState<{member: Member, tasks: Task[]} | null>(null);

  const [, setIsAddPanelOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [, setIsSearching] = useState(false);
  const [, setMatchedUser] = useState<User | null>(null);
  const [, setSearchFeedback] = useState<string>('');

  const handleOpenAddMemberPanel = () => {
    if (isReadOnly) return;
    setNewMemberEmail('');
    setMatchedUser(null);
    setSearchFeedback('');
    setIsAddPanelOpen(true);
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


  const handleDeleteMember = (member: Member) => {
    if (isReadOnly) return;
    const memberName = member.username || member.name;
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

  const filteredMembers = members.filter(m => 
    (m.username || m.name).toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            placeholder="ユーザーIDで検索" 
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
              const displayName = m.username || m.name;
              return (
                <div key={m.id} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-4">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt={displayName} className="w-11 h-11 rounded-full border border-gray-200 object-cover shadow-xs" />
                    ) : (
                      <div className={`${m.color} w-11 h-11 rounded-full flex items-center justify-center text-white text-base font-bold shadow-inner`}>
                        {displayName.charAt(0)}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800 text-base">{displayName}</span>
                      <span className="text-xs text-gray-400 font-mono">@{m.username || 'id_none'}</span>
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
            className="bg-blue-600 hover:bg-blue-700 transition-all text-white font-bold p-4 md:py-3.5 md:px-6 rounded-full shadow-lg flex items-center justify-center gap-2"
          >
            <span className="text-xl">+</span>
            <span className="hidden md:inline">メンバー招待</span>
          </button>
        </div>
      )}
    </div>
  );
}