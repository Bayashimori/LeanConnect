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

const sanitizeData = <T extends Record<string, unknown>>(data: T): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  Object.keys(data).forEach((key) => {
    const value = data[key];
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[key] = sanitizeData(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
  });
  return result;
};

export const getUserDoc = async (userId: string): Promise<User | null> => {
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
      createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now()
    };
  } catch {
    throw new Error("ユーザー情報の取得に失敗しました。");
  }
};

export const saveUserDoc = async (user: User) => {
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
        createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now()
      });
    });
    callback(projects);
  });
};

export const saveProject = async (project: Project) => {
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
        createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now()
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
        createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now()
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
        createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now()
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
        createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now()
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
  try {
    await deleteDoc(doc(db, 'projects', projectId, 'tasks', taskId));
   
  } catch (error) {
    throw new Error("タスクの削除に失敗しました。", { cause: error });
  }
};

// ==================== Groups ====================
export const saveGroupDoc = async (projectId: string, group: Group) => {
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
  try {
    await deleteDoc(doc(db, 'projects', projectId, 'groups', groupId));
  } catch (error) {
    throw new Error("グループの削除に失敗しました。", { cause: error });
  }
};

// ==================== Expenses ====================
export const saveExpenseDoc = async (projectId: string, expense: Expense) => {
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
  try {
    await deleteDoc(doc(db, 'projects', projectId, 'expenses', expenseId));
  } catch (error) {
    throw new Error("経費の削除に失敗しました。", { cause: error });
  }
};

// ==================== Memos ====================
export const saveMemoDoc = async (projectId: string, memo: Memo) => {
  try {
    const docRef = doc(db, 'projects', projectId, 'memos', memo.id);
    const data = sanitizeData({
      ...memo,
      createdAt: serverTimestamp()
    });
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    throw new Error("メモの保存に失敗しました。", { cause: error });
  }
};

export const deleteMemoDoc = async (projectId: string, memoId: string) => {
  try {
    await deleteDoc(doc(db, 'projects', projectId, 'memos', memoId));
  } catch (error) {
    throw new Error("メモの削除に失敗しました。", { cause: error });
  }
};