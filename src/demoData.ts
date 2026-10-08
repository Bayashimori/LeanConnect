import type { User, Project, Group, Task, Expense, Memo, Member } from './types';

const pad2 = (n: number) => String(n).padStart(2, '0');

const formatDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const formatTime = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

const addDays = (base: Date, days: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

const addMinutes = (base: Date, minutes: number) => {
  const d = new Date(base);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
};


const roundTo30 = (d: Date) => {
  const d2 = new Date(d);
  const m = d2.getMinutes();
  d2.setMinutes(m < 30 ? 0 : 30, 0, 0);
  return d2;
};


export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

export const DEMO_PROJECT_ID = 'demo_project_1';

export const DEMO_USER: User = {
  id: 'demo_user_me',
  name: '橋本 奏',
  username: 'kanade_demo',
  email: 'demo@example.com',
  color: 'bg-blue-600'
};

export function buildDemoData(now: Date = new Date()): {
  project: Project;
  members: Member[];
  groups: Group[];
  tasks: Task[];
  expenses: Expense[];
  memos: Memo[];
} {
  const nowRounded = roundTo30(now);
  const today = formatDate(now);

  
  const members: Member[] = [
    { id: 'demo_user_me', projectId: DEMO_PROJECT_ID, name: '橋本 奏', username: 'kanade_demo', color: 'bg-blue-600', isMe: true },
    { id: 'demo_member_2', projectId: DEMO_PROJECT_ID, name: '中村 陽翔', username: 'haruto_n', color: 'bg-purple-600' },
    { id: 'demo_member_3', projectId: DEMO_PROJECT_ID, name: '吉田 美月', username: 'mitsuki_y', color: 'bg-emerald-600' },
    { id: 'demo_member_4', projectId: DEMO_PROJECT_ID, name: '佐伯 健太', username: 'kenta_s', color: 'bg-orange-500' },
    { id: 'demo_member_5', projectId: DEMO_PROJECT_ID, name: '大西 さくら', username: 'sakura_o', color: 'bg-pink-500' }
  ];

  
  const project: Project = {
    id: DEMO_PROJECT_ID,
    name: '文化祭「旧校舎のおばけ屋敷」',
    eventDate: today,
    status: 'active',
    budget: 45000,
    memberIds: members.map(m => m.id),
    createdAt: addDays(now, -14).getTime()
  };

    const groups: Group[] = [
    { id: 'demo_group_plan', projectId: DEMO_PROJECT_ID, name: '企画・広報' },
    { id: 'demo_group_props', projectId: DEMO_PROJECT_ID, name: '小道具制作' },
    { id: 'demo_group_venue', projectId: DEMO_PROJECT_ID, name: '会場設営' }
  ];

 
  const prepTasks: Task[] = [
    {
      taskId: 'demo_task_prep_1',
      projectId: DEMO_PROJECT_ID,
      taskMode: 'prep',
      taskName: '企画書・コンセプト決定',
      taskStatus: 'completed',
      needHelp: false,
      group: 'demo_group_plan',
      startDate: formatDate(addDays(now, -14)),
      endDate: formatDate(addDays(now, -12)),
      color: 'bg-purple-500',
      assignees: ['demo_user_me', 'demo_member_2']
    },
    {
      taskId: 'demo_task_prep_2',
      projectId: DEMO_PROJECT_ID,
      taskMode: 'prep',
      taskName: 'SNS広報・ポスター掲示',
      taskStatus: 'active',
      needHelp: false,
      group: 'demo_group_plan',
      startDate: formatDate(addDays(now, -10)),
      endDate: today,
      color: 'bg-purple-500',
      assignees: ['demo_member_2']
    },
    {
      taskId: 'demo_task_prep_3',
      projectId: DEMO_PROJECT_ID,
      taskMode: 'prep',
      taskName: '血のり・衣装などの購入',
      taskStatus: 'completed',
      needHelp: false,
      group: 'demo_group_props',
      startDate: formatDate(addDays(now, -9)),
      endDate: formatDate(addDays(now, -7)),
      color: 'bg-emerald-500',
      assignees: ['demo_member_3']
    },
    {
      taskId: 'demo_task_prep_4',
      projectId: DEMO_PROJECT_ID,
      taskMode: 'prep',
      taskName: '迷路用パネル・看板制作',
      taskStatus: 'completed',
      needHelp: false,
      group: 'demo_group_props',
      startDate: formatDate(addDays(now, -7)),
      endDate: formatDate(addDays(now, -3)),
      color: 'bg-emerald-500',
      assignees: ['demo_member_3', 'demo_member_4']
    },
    {
      taskId: 'demo_task_prep_5',
      projectId: DEMO_PROJECT_ID,
      taskMode: 'prep',
      taskName: '音響・効果音の準備',
      taskStatus: 'active',
      needHelp: false,
      group: 'demo_group_props',
      startDate: formatDate(addDays(now, -3)),
      endDate: today,
      color: 'bg-emerald-500',
      assignees: ['demo_member_4']
    },
    {
      taskId: 'demo_task_prep_6',
      projectId: DEMO_PROJECT_ID,
      taskMode: 'prep',
      taskName: '会場レイアウト図作成',
      taskStatus: 'completed',
      needHelp: false,
      group: 'demo_group_venue',
      startDate: formatDate(addDays(now, -6)),
      endDate: formatDate(addDays(now, -5)),
      color: 'bg-orange-500',
      assignees: ['demo_user_me']
    },
    {
      taskId: 'demo_task_prep_7',
      projectId: DEMO_PROJECT_ID,
      taskMode: 'prep',
      taskName: '搬入・会場設営',
      taskStatus: 'completed',
      needHelp: false,
      group: 'demo_group_venue',
      startDate: formatDate(addDays(now, -1)),
      endDate: today,
      color: 'bg-orange-500',
      assignees: ['demo_user_me', 'demo_member_5']
    }
  ];

    const dayTasks: Task[] = [
    {
      taskId: 'demo_task_day_1',
      projectId: DEMO_PROJECT_ID,
      taskMode: 'day',
      taskName: '開場前アナウンス・最終チェック',
      taskStatus: 'completed',
      needHelp: false,
      group: '',
      startDate: today,
      endDate: today,
      taskType: 'individual',
      startTime: formatTime(addMinutes(nowRounded, -210)),
      endTime: formatTime(addMinutes(nowRounded, -180)),
      color: 'bg-blue-500',
      assignees: ['demo_user_me']
    },
    {
      taskId: 'demo_task_day_2',
      projectId: DEMO_PROJECT_ID,
      taskMode: 'day',
      taskName: '受付対応',
      taskStatus: 'active',
      needHelp: false,
      group: '',
      startDate: today,
      endDate: today,
      taskType: 'resident',
      startTime: formatTime(addMinutes(nowRounded, -120)),
      endTime: formatTime(addMinutes(nowRounded, 180)),
      currentId: 'demo_member_3',
      color: 'bg-pink-500',
      assignees: ['demo_member_2', 'demo_member_3', 'demo_member_4']
    },
    {
      taskId: 'demo_task_day_3',
      projectId: DEMO_PROJECT_ID,
      taskMode: 'day',
      taskName: 'おばけ役(メインモンスター)',
      taskStatus: 'active',
      needHelp: false,
      group: '',
      startDate: today,
      endDate: today,
      taskType: 'resident',
      startTime: formatTime(addMinutes(nowRounded, -60)),
      endTime: formatTime(addMinutes(nowRounded, 120)),
      currentId: 'demo_member_4',
      color: 'bg-pink-500',
      assignees: ['demo_member_4', 'demo_member_5']
    },
    {
      taskId: 'demo_task_day_4',
      projectId: DEMO_PROJECT_ID,
      taskMode: 'day',
      taskName: '小道具(血のり)の補充',
      taskStatus: 'active',
      needHelp: true,
      group: '',
      startDate: today,
      endDate: today,
      taskType: 'individual',
      startTime: formatTime(addMinutes(nowRounded, -15)),
      endTime: formatTime(addMinutes(nowRounded, 30)),
      description: '在庫が少なくなってきたので買い出しが必要です',
      color: 'bg-blue-500',
      assignees: ['demo_member_2']
    },
    {
      taskId: 'demo_task_day_5',
      projectId: DEMO_PROJECT_ID,
      taskMode: 'day',
      taskName: '閉場後の撤収・清掃',
      taskStatus: 'active',
      needHelp: false,
      group: '',
      startDate: today,
      endDate: today,
      taskType: 'individual',
      startTime: formatTime(addMinutes(nowRounded, 180)),
      endTime: formatTime(addMinutes(nowRounded, 240)),
      color: 'bg-blue-500',
      assignees: members.map(m => m.id)
    }
  ];

  const tasks = [...prepTasks, ...dayTasks];

  // ---------------- 支出(予算管理) ----------------
  const expenses: Expense[] = [
    { id: 'demo_expense_1', projectId: DEMO_PROJECT_ID, category: '小道具・衣装', amount: 18000, color: '#ef4444', memo: '血のり、衣装、看板制作費' },
    { id: 'demo_expense_2', projectId: DEMO_PROJECT_ID, category: '会場装飾', amount: 9500, color: '#f97316', memo: '黒幕、蜘蛛の巣、暗幕' },
    { id: 'demo_expense_3', projectId: DEMO_PROJECT_ID, category: '音響・照明', amount: 6200, color: '#eab308', memo: 'スピーカーレンタル、暗転用ライト' },
    { id: 'demo_expense_4', projectId: DEMO_PROJECT_ID, category: '印刷・広報', amount: 3400, color: '#22c55e', memo: 'チラシ、ポスター印刷' }
  ];

  // ---------------- 共有メモ(チャット) ----------------
  const memos: Memo[] = [
    {
      id: 'demo_memo_1',
      projectId: DEMO_PROJECT_ID,
      authorId: 'demo_user_me',
      authorName: '橋本 奏',
      authorColor: 'bg-blue-600',
      content: '小道具の血のり、残り少ないので誰か買い足せる人いますか…!',
      reactions: [{ text: '👀', count: 2, userIds: ['demo_member_2', 'demo_member_3'] }],
      createdAt: addMinutes(now, -12).getTime()
    },
    {
      id: 'demo_memo_2',
      projectId: DEMO_PROJECT_ID,
      authorId: 'demo_member_2',
      authorName: '中村 陽翔',
      authorColor: 'bg-purple-600',
      content: '了解!購買行けるので買ってきます🏃',
      reactions: [{ text: '👍', count: 3, userIds: ['demo_user_me', 'demo_member_3', 'demo_member_4'] }],
      createdAt: addMinutes(now, -9).getTime()
    },
    {
      id: 'demo_memo_3',
      projectId: DEMO_PROJECT_ID,
      authorId: 'demo_member_3',
      authorName: '吉田 美月',
      authorColor: 'bg-emerald-600',
      content: '受付の列、思ったより並んでます…案内がんばります!',
      reactions: [],
      createdAt: addMinutes(now, -4).getTime()
    }
  ];

  return { project, members, groups, tasks, expenses, memos };
}
