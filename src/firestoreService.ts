import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { Project, Task, Group, Expense, Memo, Member, User } from './types';
import { isDemoMode, demoStore as demo, DEMO_DIRECTORY, DEMO_USER } from './demoData';

// デモモード用: 開いているプロジェクトのメンバー一覧を画面に反映する関数
let demoSetMembers: ((members: Member[]) => void) | null = null;

// デモモード用: プロジェクトのmemberIdsから、メンバー一覧を作り直す
const buildDemoMembers = (project: Project): Member[] =>
  (project.memberIds || []).flatMap((uid) => {
    const existing = demo?.members.find(m => m.id === uid);
    if (existing) return [existing];
    const u = DEMO_DIRECTORY.find(d => d.id === uid);
    if (!u) return [];
    return [{ id: u.id, projectId: project.id, name: u.name, username: u.username, color: u.color || 'bg-blue-600', isMe: u.id === DEMO_USER.id }];
  });

// デモモード用: 配列の中の同じIDの要素を置き換える(なければ末尾に追加する)
const upsertById = <T,>(list: T[], item: T, key: keyof T): T[] => {
  const index = list.findIndex(x => x[key] === item[key]);
  return index >= 0 ? list.map((x, i) => (i === index ? item : x)) : [...list, item];
};

const sanitizeData = <T extends Record<string, unknown>>(data: T): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  Object.keys(data).forEach((key) => {
    const value = data[key];
    if (value !== undefined) {
      // 中身を整理するのは「普通のオブジェクト」だけにする。
      // serverTimestamp() などFirestoreの特殊な値までバラしてしまうと、
      // 日時ではなくただのデータとして保存され、画面に「Invalid Date」と出てしまうため。
      const isPlainObject = value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
      if (isPlainObject) {
        result[key] = sanitizeData(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
  });
  return result;
};

// Firestoreから読んだ日時をミリ秒に直す。
// 以前の不具合で日時が壊れた形で保存されたデータもあるため、読めない場合は0にする
// (画面側では0のときは時刻を表示しない)。
const toMillis = (value: unknown): number => {
  if (typeof value === 'number') return value;
  const maybeTimestamp = value as { toMillis?: () => number } | null;
  if (maybeTimestamp && typeof maybeTimestamp.toMillis === 'function') return maybeTimestamp.toMillis();
  return 0;
};

export const getUserDoc = async (userId: string): Promise<User | null> => {
  if (isDemoMode) return null;
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name || '',
      username: data.username || '',
      email: data.email || '',
      avatarUrl: data.avatarUrl || '',
      color: data.color || 'bg-blue-600',
      createdAt: toMillis(data.createdAt)
    };
  } catch {
    throw new Error("ユーザー情報の取得に失敗しました。");
  }
};

export const saveUserDoc = async (user: User) => {
  if (isDemoMode) return;
  try {
    const docRef = doc(db, 'users', user.id);
    const data = sanitizeData({
      name: user.name,
      username: user.username || '',
      email: user.email ? user.email.toLowerCase() : '',
      avatarUrl: user.avatarUrl || '',
      color: user.color || 'bg-blue-600',
      updatedAt: serverTimestamp(),
      createdAt: user.createdAt ? user.createdAt : serverTimestamp()
    });
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    throw new Error("ユーザー情報の保存に失敗しました。通信環境をご確認ください。", { cause: error });
  }
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  if (isDemoMode) {
    // デモ用の登録ユーザー一覧から探す(@ユーザー名でも見つかるようにしている)
    const q = email.trim().toLowerCase().replace(/^@/, '');
    return DEMO_DIRECTORY.find(u => u.email?.toLowerCase() === q || u.username?.toLowerCase() === q) || null;
  }
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return null;
    const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docSnap = snapshot.docs[0];
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name || 'ユーザー',
      username: data.username || '',
      email: data.email || '',
      avatarUrl: data.avatarUrl || '',
      color: data.color || 'bg-blue-600'
    };
   
  } catch (error) {
    throw new Error("ユーザーの検索に失敗しました。", { cause: error });
  }
};

export const subscribeUserProjects = (userId: string, callback: (projects: Project[]) => void) => {
  if (isDemoMode && demo) {
    callback([demo.project]);
    return () => {};
  }
  const q = query(
    collection(db, 'projects'),
    where('memberIds', 'array-contains', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const projects: Project[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      projects.push({
        id: docSnap.id,
        name: data.name || '',
        eventDate: data.eventDate || '',
        status: data.status || 'active',
        budget: data.budget || 0,
        memberIds: data.memberIds || [],
        createdAt: toMillis(data.createdAt)
      });
    });
    callback(projects);
  });
};

export const saveProject = async (project: Project) => {
  if (isDemoMode) {
    if (demo && project.id === demo.project.id) {
      demo.project = project;
      // 招待・削除でメンバーが変わったら、メンバー一覧も更新する
      const nextMembers = buildDemoMembers(project);
      demo.members = nextMembers;
      // 呼び出し元がReactのstate更新の途中なので、画面への反映は少し後にずらす
      setTimeout(() => demoSetMembers?.(nextMembers), 0);
    }
    return;
  }
  try {
    const docRef = doc(db, 'projects', project.id);
    const data = sanitizeData({
      name: project.name,
      eventDate: project.eventDate || '',
      status: project.status,
      budget: project.budget,
      memberIds: project.memberIds || [],
      createdAt: serverTimestamp()
    });
    await setDoc(docRef, data, { merge: true });
   
  } catch (error) {
    throw new Error("プロジェクトの保存に失敗しました。", { cause: error });
  }
};

export const deleteProjectDoc = async (projectId: string) => {
  if (isDemoMode) return;
  try {
    await deleteDoc(doc(db, 'projects', projectId));
   
  } catch (error) {
    throw new Error("プロジェクトの削除に失敗しました。", { cause: error });
  }
};

export const subscribeProjectData = (
  projectId: string,
  callbacks: {
    setTasks: (tasks: Task[]) => void;
    setGroups: (groups: Group[]) => void;
    setExpenses: (expenses: Expense[]) => void;
    setMemos: (memos: Memo[]) => void;
    setMembers: (members: Member[]) => void;
  }
) => {
  if (isDemoMode && demo) {
    callbacks.setTasks(demo.tasks);
    callbacks.setGroups(demo.groups);
    callbacks.setExpenses(demo.expenses);
    callbacks.setMemos(demo.memos);
    callbacks.setMembers(demo.members);
    demoSetMembers = callbacks.setMembers;
    return () => { demoSetMembers = null; };
  }

  const projectDocRef = doc(db, 'projects', projectId);

  const unsubTasks = onSnapshot(collection(projectDocRef, 'tasks'), (snap) => {
    const tasks: Task[] = [];
    snap.forEach((d) => {
      const data = d.data();
      tasks.push({
        taskId: d.id,
        projectId,
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
        createdAt: toMillis(data.createdAt)
      });
    });
    callbacks.setTasks(tasks);
  });

  const unsubGroups = onSnapshot(collection(projectDocRef, 'groups'), (snap) => {
    const groups: Group[] = [];
    snap.forEach((d) => {
      const data = d.data();
      groups.push({
        id: d.id,
        projectId,
        name: data.name || '',
        description: data.description || '',
        createdAt: toMillis(data.createdAt)
      });
    });
    callbacks.setGroups(groups);
  });

  const unsubExpenses = onSnapshot(collection(projectDocRef, 'expenses'), (snap) => {
    const expenses: Expense[] = [];
    snap.forEach((d) => {
      const data = d.data();
      expenses.push({
        id: d.id,
        projectId,
        category: data.category || '',
        amount: data.amount || 0,
        color: data.color || '#ef4444',
        memo: data.memo || '',
        createdAt: toMillis(data.createdAt)
      });
    });
    callbacks.setExpenses(expenses);
  });

  const unsubMemos = onSnapshot(collection(projectDocRef, 'memos'), (snap) => {
    const memos: Memo[] = [];
    snap.forEach((d) => {
      const data = d.data();
      memos.push({
        id: d.id,
        projectId,
        authorId: data.authorId || '',
        authorName: data.authorName || '',
        authorIcon: data.authorIcon || '',
        authorColor: data.authorColor || 'bg-blue-500',
        content: data.content || '',
        reactions: data.reactions || [],
        createdAt: toMillis(data.createdAt)
      });
    });
    callbacks.setMemos(memos);
  });

  const unsubProjectDoc = onSnapshot(projectDocRef, async (snap) => {
    if (!snap.exists()) return;
    const pData = snap.data();
    const memberIds: string[] = pData.memberIds || [];
    const colors = ['bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-600', 'bg-cyan-600'];

    try {
      const memberPromises = memberIds.map(async (uid, index) => {
        const uSnap = await getDoc(doc(db, 'users', uid));
        const uData = uSnap.exists() ? uSnap.data() : null;
        return {
          id: uid,
          projectId,
          name: uData?.name || `メンバー (${uid.slice(0, 5)})`,
          username: uData?.username || uData?.name || `user_${uid.slice(0, 5)}`,
          avatarUrl: uData?.avatarUrl || undefined,
          color: uData?.color || colors[index % colors.length]
        } as Member;
      });

      const memberList = await Promise.all(memberPromises);
      callbacks.setMembers(memberList);
    } catch {
      /* Ignore member loading errors. */
    }
  });

  return () => {
    unsubTasks();
    unsubGroups();
    unsubExpenses();
    unsubMemos();
    unsubProjectDoc();
  };
};

export const saveTaskDoc = async (projectId: string, task: Task) => {
  if (isDemoMode) {
    if (demo) demo.tasks = upsertById(demo.tasks, task, 'taskId');
    return;
  }
  try {
    const docRef = doc(db, 'projects', projectId, 'tasks', task.taskId);
    const data = sanitizeData({
      ...task,
      createdAt: serverTimestamp()
    });
    await setDoc(docRef, data, { merge: true });
   
  } catch (error) {
    throw new Error("タスクの保存に失敗しました。", { cause: error });
  }
};

export const deleteTaskDoc = async (projectId: string, taskId: string) => {
  if (isDemoMode) {
    if (demo) demo.tasks = demo.tasks.filter(t => t.taskId !== taskId);
    return;
  }
  try {
    await deleteDoc(doc(db, 'projects', projectId, 'tasks', taskId));
   
  } catch (error) {
    throw new Error("タスクの削除に失敗しました。", { cause: error });
  }
};

// ==================== Groups ====================
export const saveGroupDoc = async (projectId: string, group: Group) => {
  if (isDemoMode) {
    if (demo) demo.groups = upsertById(demo.groups, group, 'id');
    return;
  }
  try {
    const docRef = doc(db, 'projects', projectId, 'groups', group.id);
    const data = sanitizeData({
      ...group,
      createdAt: serverTimestamp()
    });
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    throw new Error("グループの保存に失敗しました。", { cause: error });
  }
};

export const deleteGroupDoc = async (projectId: string, groupId: string) => {
  if (isDemoMode) {
    if (demo) demo.groups = demo.groups.filter(g => g.id !== groupId);
    return;
  }
  try {
    await deleteDoc(doc(db, 'projects', projectId, 'groups', groupId));
  } catch (error) {
    throw new Error("グループの削除に失敗しました。", { cause: error });
  }
};

// ==================== Expenses ====================
export const saveExpenseDoc = async (projectId: string, expense: Expense) => {
  if (isDemoMode) {
    if (demo) demo.expenses = upsertById(demo.expenses, expense, 'id');
    return;
  }
  try {
    const docRef = doc(db, 'projects', projectId, 'expenses', expense.id);
    const data = sanitizeData({
      ...expense,
      createdAt: serverTimestamp()
    });
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    throw new Error("経費の保存に失敗しました。", { cause: error });
  }
};

export const deleteExpenseDoc = async (projectId: string, expenseId: string) => {
  if (isDemoMode) {
    if (demo) demo.expenses = demo.expenses.filter(e => e.id !== expenseId);
    return;
  }
  try {
    await deleteDoc(doc(db, 'projects', projectId, 'expenses', expenseId));
  } catch (error) {
    throw new Error("経費の削除に失敗しました。", { cause: error });
  }
};

// ==================== Memos ====================
export const saveMemoDoc = async (projectId: string, memo: Memo) => {
  if (isDemoMode) {
    if (demo) demo.memos = upsertById(demo.memos, memo, 'id');
    return;
  }
  try {
    const docRef = doc(db, 'projects', projectId, 'memos', memo.id);
    const data = sanitizeData({
      ...memo,
      createdAt: typeof memo.createdAt === 'number' ? memo.createdAt : serverTimestamp()
    });
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    throw new Error("メモの保存に失敗しました。", { cause: error });
  }
};

export const deleteMemoDoc = async (projectId: string, memoId: string) => {
  if (isDemoMode) {
    if (demo) demo.memos = demo.memos.filter(m => m.id !== memoId);
    return;
  }
  try {
    await deleteDoc(doc(db, 'projects', projectId, 'memos', memoId));
  } catch (error) {
    throw new Error("メモの削除に失敗しました。", { cause: error });
  }
};