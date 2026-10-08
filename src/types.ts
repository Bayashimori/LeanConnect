export type User = {
  id: string;
  name: string;
  username?: string;
  email?: string;
  iconUrl?: string;
  avatarUrl?: string;
  color?: string;
  createdAt?: number;
};

export type Project = {
  id: string;
  name: string;
  eventDate?: string;
  status: 'active' | 'completed';
  budget: number;
  memberIds?: string[];
  createdAt: number;
};

export type DateItem = {
  date: number;
  dateString: string;
  day: string;
  isWeekend: boolean;
  color?: string;
  yearMonth: string;
};

export type Group = {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  createdAt?: number;
};

export type TaskMode = 'prep' | 'day';
export type TaskType = 'resident' | 'individual';

export type Task = {
  taskId: string;
  projectId: string;
  taskMode: TaskMode;
  taskName: string;
  taskStatus: string;
  needHelp: boolean;
  group: string;
  startDate: string;
  endDate: string;
  description?: string;
  taskType?: TaskType;
  startTime?: string;
  endTime?: string;
  currentId?: string; // 担当者のユーザーID(uid)
  color: string;
  assignees?: string[]; // 割り当てメンバーのユーザーID(uid)の配列
  remind?: string;
  createdAt?: number;
};

export type Expense = {
  id: string;
  projectId: string;
  category: string;
  amount: number;
  color: string;
  memo?: string;
  createdAt?: number;
};

export type Reaction = {
  text: string;
  count: number;
  userIds?: string[];
  hasReacted?: boolean;
};

export type Memo = {
  id: string;
  projectId: string;
  authorId?: string;
  authorName: string;
  authorIcon?: string;
  authorColor: string;
  content: string;
  reactions: Reaction[];
  createdAt?: number;
};

export type Member = {
  id: string;
  projectId: string;
  name: string;
  username?: string; // @ユーザー名
  avatarUrl?: string;
  iconUrl?: string;
  color: string;
  isMe?: boolean;
};

export type ConfirmOptions = {
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
};

export const initialGroups: Group[] = [];
export const initialMembers: Member[] = [];
export const initialExpenses: Expense[] = [];
export const initialMemos: Memo[] = [];

export const NAV_ITEMS = [
  { id: 'gantt', label: 'チャート', iconPath: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { id: 'members', label: 'メンバー', iconPath: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { id: 'budget', label: '予算管理', iconPath: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: 'memo', label: '共有メモ', iconPath: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2" }
];

// 同姓同名のメンバーを見分けるための表示用ID
export const memberIdLabel = (m: Member) =>
  m.username ? `@${m.username}` : `#${m.id.slice(0, 5)}`;

// 「名前 (@ユーザー名)」の形式の表示文字列
export const memberDisplayLabel = (m: Member) => `${m.name} (${memberIdLabel(m)})`;