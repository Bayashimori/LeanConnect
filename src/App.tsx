import { useState, useEffect } from 'react';
import type { User, Project, Task, Group, Expense, Memo, Member, ConfirmOptions } from './types';
import { initialGroups, initialExpenses, initialMemos, initialMembers } from './types';
import LoginView from './LoginView';
import HomeView from './HomeView';
import ProjectManagerView from './ProjectManagerView';
import ProfileView from './ProfileView';
import { auth, signOut, onAuthStateChanged } from './firebase';
import { isDemoMode, demoStore } from './demoData';
import { 
  subscribeUserProjects, 
  subscribeProjectData, 
  saveProject, 
  deleteProjectDoc,
  saveTaskDoc,
  deleteTaskDoc,
  saveGroupDoc,
  deleteGroupDoc,
  saveExpenseDoc,
  deleteExpenseDoc,
  saveMemoDoc,
  deleteMemoDoc
} from './firestoreService';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const STORAGE_KEY_USER = 'lean-connect-user';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (isDemoMode) return null;
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    return saved ? JSON.parse(saved) : null;
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeInitialMode, setActiveInitialMode] = useState<'prep' | 'day'>('prep');
  const [activeInitialView, setActiveInitialView] = useState<'gantt' | 'retrospective'>('gantt');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Record<string, Task[]>>({});
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [memos, setMemos] = useState<Memo[]>(initialMemos);
  const [members, setMembers] = useState<Member[]>(initialMembers);

  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { isOpen: boolean }) | null>(null);
  const requestConfirm = (options: ConfirmOptions) => setConfirmState({ ...options, isOpen: true });
  const closeConfirm = () => setConfirmState(prev => prev ? { ...prev, isOpen: false } : null);

  useEffect(() => {
    if (isDemoMode) return;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeUserProjects(currentUser.id, (loadedProjects) => {
      setProjects(loadedProjects);
      if (!loadedProjects.length) {
        setAllTasks({});
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (isDemoMode || !projects.length) return;

    const unsubs = projects.map(project => {
      const tasksRef = collection(db, 'projects', project.id, 'tasks');
      return onSnapshot(tasksRef, (snap) => {
        const projectTasks: Task[] = [];
        snap.forEach((d) => {
          const data = d.data();
          projectTasks.push({
            taskId: d.id,
            projectId: project.id,
            taskMode: data.taskMode || 'prep',
            taskName: data.taskName || '',
            taskStatus: data.taskStatus || 'active',
            needHelp: !!data.needHelp,
            group: data.group || '',
            startDate: data.startDate || '',
            endDate: data.endDate || '',
            description: data.description || '',
            taskType: data.taskType,
            startTime: data.startTime,
            endTime: data.endTime,
            currentId: data.currentId,
            color: data.color || 'bg-blue-500',
            assignees: data.assignees || [],
            remind: data.remind,
            createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now()
          });
        });

        setAllTasks(prev => ({
          ...prev,
          [project.id]: projectTasks
        }));
      });
    });

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [projects]);

  useEffect(() => {
    if (!activeProjectId) return;

    const unsubscribe = subscribeProjectData(activeProjectId, {
      setTasks,
      setGroups,
      setExpenses,
      setMemos,
      setMembers
    });

    return () => {
      unsubscribe();
      setTasks([]);
      setGroups(initialGroups);
      setExpenses(initialExpenses);
      setMemos(initialMemos);
      setMembers(initialMembers);
    };
  }, [activeProjectId]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (!isDemoMode) localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    if (!isDemoMode) localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedUser));
  };

  const handleSetProjects: React.Dispatch<React.SetStateAction<Project[]>> = (valueOrUpdater) => {
    setProjects(prev => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      const processedNext = next.map(p => {
        if (!p.memberIds || p.memberIds.length === 0) {
          return { ...p, memberIds: currentUser ? [currentUser.id] : [] };
        }
        return p;
      });

      const removed = prev.filter(p => !processedNext.some(np => np.id === p.id));
      removed.forEach(async (p) => {
        try {
          await deleteProjectDoc(p.id);
        } catch (error) {
          console.error("プロジェクト削除エラー:", error);
          alert(error instanceof Error ? error.message : "プロジェクトの削除に失敗しました。");
        }
      });

      processedNext.forEach(async (p) => {
        const old = prev.find(op => op.id === p.id);
        if (old && JSON.stringify(old) === JSON.stringify(p)) return;
        try {
          await saveProject(p);
        } catch (error) {
          console.error("プロジェクト保存エラー:", error);
          alert(error instanceof Error ? error.message : "プロジェクトの保存に失敗しました。");
        }
      });

      return processedNext;
    });
  };

  const handleSetTasks: React.Dispatch<React.SetStateAction<Task[]>> = (valueOrUpdater) => {
    if (!activeProjectId) return;
    setTasks(prev => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      const removed = prev.filter(t => !next.some(nt => nt.taskId === t.taskId));

      removed.forEach(async (t) => {
        try {
          await deleteTaskDoc(activeProjectId, t.taskId);
        } catch (error) {
          console.error("タスク削除エラー:", error);
          alert(error instanceof Error ? error.message : "タスクの削除に失敗しました。");
        }
      });

      next.forEach(async (t) => {
        const old = prev.find(pt => pt.taskId === t.taskId);
        if (old && JSON.stringify(old) === JSON.stringify(t)) return;
        try {
          await saveTaskDoc(activeProjectId, t);
        } catch (error) {
          console.error("タスク保存エラー:", error);
          alert(error instanceof Error ? error.message : "タスクの保存に失敗しました。");
        }
      });

      return next;
    });
  };

  const handleSetGroups: React.Dispatch<React.SetStateAction<Group[]>> = (valueOrUpdater) => {
    if (!activeProjectId) return;
    setGroups(prev => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      const removed = prev.filter(g => !next.some(ng => ng.id === g.id));

      removed.forEach(async (g) => {
        try {
          await deleteGroupDoc(activeProjectId, g.id);
        } catch (error) {
          console.error("グループ削除エラー:", error);
          alert(error instanceof Error ? error.message : "グループの削除に失敗しました。");
        }
      });

      next.forEach(async (g) => {
        const old = prev.find(pg => pg.id === g.id);
        if (old && JSON.stringify(old) === JSON.stringify(g)) return;
        try {
          await saveGroupDoc(activeProjectId, g);
        } catch (error) {
          console.error("グループ保存エラー:", error);
          alert(error instanceof Error ? error.message : "グループの保存に失敗しました。");
        }
      });

      return next;
    });
  };

  const handleSetExpenses: React.Dispatch<React.SetStateAction<Expense[]>> = (valueOrUpdater) => {
    if (!activeProjectId) return;
    setExpenses(prev => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      const removed = prev.filter(e => !next.some(ne => ne.id === e.id));

      removed.forEach(async (e) => {
        try {
          await deleteExpenseDoc(activeProjectId, e.id);
        } catch (error) {
          console.error("経費削除エラー:", error);
          alert(error instanceof Error ? error.message : "経費の削除に失敗しました。");
        }
      });

      next.forEach(async (e) => {
        const old = prev.find(pe => pe.id === e.id);
        if (old && JSON.stringify(old) === JSON.stringify(e)) return;
        try {
          await saveExpenseDoc(activeProjectId, e);
        } catch (error) {
          console.error("経費保存エラー:", error);
          alert(error instanceof Error ? error.message : "経費の保存に失敗しました。");
        }
      });

      return next;
    });
  };

  const handleSetMemos: React.Dispatch<React.SetStateAction<Memo[]>> = (valueOrUpdater) => {
    if (!activeProjectId) return;
    setMemos(prev => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      const removed = prev.filter(m => !next.some(nm => nm.id === m.id));

      removed.forEach(async (m) => {
        try {
          await deleteMemoDoc(activeProjectId, m.id);
        } catch (error) {
          console.error("メモ削除エラー:", error);
          alert(error instanceof Error ? error.message : "メモの削除に失敗しました。");
        }
      });

      next.forEach(async (m) => {
        const old = prev.find(pm => pm.id === m.id);
        if (old && JSON.stringify(old) === JSON.stringify(m)) return;
        try {
          await saveMemoDoc(activeProjectId, m);
        } catch (error) {
          console.error("メモ保存エラー:", error);
          alert(error instanceof Error ? error.message : "メモの保存に失敗しました。");
        }
      });

      return next;
    });
  };

  const activeProject = projects.find(p => p.id === activeProjectId);
  const homeTasks = isDemoMode && demoStore ? demoStore.tasks : Object.values(allTasks).flat();

  if (!currentUser) return <LoginView onLogin={handleLogin} />;

  return (
    <div className="flex h-screen w-full bg-gray-50 text-gray-800 font-sans overflow-hidden relative">
      <main className="flex-1 flex flex-col h-full min-h-0 relative overflow-hidden bg-white md:bg-gray-50 md:p-6">
        <div className={`flex-1 flex flex-col h-full min-h-0 relative bg-white ${activeProjectId ? 'md:rounded-2xl md:shadow-sm md:border md:border-gray-200' : ''} overflow-hidden`}>
          
          {isProfileOpen ? (
            <ProfileView
              currentUser={currentUser}
              onUpdateUser={handleUpdateUser}
              onBack={() => setIsProfileOpen(false)}
            />
          ) : !activeProjectId ? (
            <HomeView 
              projects={projects}
              setProjects={handleSetProjects}
              tasks={homeTasks}
              members={members}
              setMembers={setMembers}
              onSelectProject={(id, view, mode) => {
                setActiveProjectId(id);
                setActiveInitialView(view);
                if (mode) setActiveInitialMode(mode);
              }}
              currentUser={currentUser}
              onOpenProfile={() => setIsProfileOpen(true)}
              onLogout={() => {
                requestConfirm({
                  title: 'ログアウト',
                  message: 'ログアウトしてログイン画面に戻りますか？',
                  confirmText: 'ログアウト',
                  isDanger: true,
                  onConfirm: async () => {
                    if (isDemoMode) {
                      setActiveProjectId(null);
                      setCurrentUser(null);
                      return;
                    }
                    await signOut(auth);
                    setCurrentUser(null);
                    localStorage.removeItem(STORAGE_KEY_USER);
                  }
                });
              }}
              requestConfirm={requestConfirm}
            />
          ) : activeProject ? (
            <ProjectManagerView 
              project={activeProject}
              currentUser={currentUser}
              projects={projects}
              setProjects={handleSetProjects}
              tasks={tasks}
              setTasks={handleSetTasks}
              groups={groups}
              setGroups={handleSetGroups}
              expenses={expenses}
              setExpenses={handleSetExpenses}
              memos={memos}
              setMemos={handleSetMemos}
              members={members}
              setMembers={setMembers}
              initialMode={activeInitialMode}
              initialView={activeInitialView}
              onBackToHome={() => setActiveProjectId(null)}
              onOpenProfile={() => setIsProfileOpen(true)}
              requestConfirm={requestConfirm}
            />
          ) : null}

        </div>
      </main>

      {confirmState && confirmState.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-100 p-4" onClick={closeConfirm}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 flex flex-col gap-4 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="font-extrabold text-xl text-gray-800">{confirmState.title}</h3>
            <p className="text-gray-600 text-sm whitespace-pre-wrap">{confirmState.message}</p>
            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
              <button onClick={closeConfirm} className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors">
                {confirmState.cancelText || 'キャンセル'}
              </button>
              <button 
                onClick={() => { confirmState.onConfirm(); closeConfirm(); }} 
                className={`flex-1 py-2.5 text-white font-bold rounded-xl shadow-sm transition-colors ${confirmState.isDanger ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {confirmState.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}