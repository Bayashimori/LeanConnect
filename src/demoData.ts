import type { User, Project, Group, Task, Expense, Memo, Member } from './types';

/**
 * オフラインデモ用のダミーデータ。
 *
 * ポイント:
 * - 日付は「実行した日(now)」からの相対値で計算する(当日の時刻は10:00開場の固定値)。
 *   固定の日付を入れてしまうと、本番当日が違う日になった瞬間に
 *   「過去のイベント」や「来週のイベント」に見えてしまうため。
 * - avatarUrl はすべて未設定にしている。外部画像URLは通信が無いと
 *   読み込めないため、オフライン前提のデモでは使わない
 *   (未設定の場合は名前の頭文字によるアイコンが自動で表示される)。
 * - 保存系の関数(saveTaskDocなど)をデモモードでは何もしない実装に
 *   差し替える想定なので、ここで作ったデータは「ページを再読み込み
 *   すれば毎回この状態に戻る」= デモ間のリセットが自動でできる。
 */

const pad2 = (n: number) => String(n).padStart(2, '0');

const formatDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

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


// VITE_DEMO_MODE=true を .env.local に設定したPCだけがオフラインデモ動作になる。
// (本番のFirebaseと切り替える唯一のスイッチなので、ここに集約しておく)
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

export const DEMO_PROJECT_ID = 'demo_project_1';

export const DEMO_USER: User = {
  id: 'demo_user_me',
  name: '橋本 奏',
  username: 'kanade_demo',
  email: 'demo@example.com',
  color: 'bg-blue-600'
};

// デモ用の「LeanConnectに登録済みのユーザー」一覧。
// プロジェクトのメンバー5人に加えて、まだ参加していない2人がいるので、
// デモ中にメールアドレスで検索して「メンバー招待」を実演できる。
export const DEMO_DIRECTORY: User[] = [
  DEMO_USER,
  { id: 'demo_member_2', name: '中村 陽翔', username: 'haruto_n', email: 'haruto@example.com', color: 'bg-purple-600' },
  { id: 'demo_member_3', name: '吉田 美月', username: 'mitsuki_y', email: 'mitsuki@example.com', color: 'bg-emerald-600' },
  { id: 'demo_member_4', name: '佐伯 健太', username: 'kenta_s', email: 'kenta@example.com', color: 'bg-orange-500' },
  { id: 'demo_member_5', name: '大西 さくら', username: 'sakura_o', email: 'sakura@example.com', color: 'bg-pink-500' },
  // ↓ まだプロジェクトに参加していないユーザー(招待のデモ用)
  { id: 'demo_guest_1', name: '田中 蓮', username: 'ren_t', email: 'ren@example.com', color: 'bg-indigo-600' },
  { id: 'demo_guest_2', name: '小林 結衣', username: 'yui_k', email: 'yui@example.com', color: 'bg-cyan-600' }
];

export function buildDemoData(now: Date = new Date()): {
  project: Project;
  members: Member[];
  groups: Group[];
  tasks: Task[];
  expenses: Expense[];
  memos: Memo[];
} {
  const today = formatDate(now);

  // ---------------- メンバー ----------------
  const members: Member[] = [
    { id: 'demo_user_me', projectId: DEMO_PROJECT_ID, name: '橋本 奏', username: 'kanade_demo', color: 'bg-blue-600', isMe: true },
    { id: 'demo_member_2', projectId: DEMO_PROJECT_ID, name: '中村 陽翔', username: 'haruto_n', color: 'bg-purple-600' },
    { id: 'demo_member_3', projectId: DEMO_PROJECT_ID, name: '吉田 美月', username: 'mitsuki_y', color: 'bg-emerald-600' },
    { id: 'demo_member_4', projectId: DEMO_PROJECT_ID, name: '佐伯 健太', username: 'kenta_s', color: 'bg-orange-500' },
    { id: 'demo_member_5', projectId: DEMO_PROJECT_ID, name: '大西 さくら', username: 'sakura_o', color: 'bg-pink-500' }
  ];

  // ---------------- プロジェクト ----------------
  const project: Project = {
    id: DEMO_PROJECT_ID,
    name: '文化祭「旧校舎のおばけ屋敷」',
    eventDate: today,
    status: 'active',
    budget: 45000,
    memberIds: members.map(m => m.id),
    createdAt: addDays(now, -14).getTime()
  };

  // ---------------- グループ(準備タスク用) ----------------
  const groups: Group[] = [
    { id: 'demo_group_plan', projectId: DEMO_PROJECT_ID, name: '企画・広報' },
    { id: 'demo_group_props', projectId: DEMO_PROJECT_ID, name: '小道具制作' },
    { id: 'demo_group_venue', projectId: DEMO_PROJECT_ID, name: '会場設営' }
  ];

  // ---------------- 準備タスク(prep) ----------------
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

  // ---------------- 当日タスク(day) ----------------
  // 文化祭の一般的な日程(10:00開場・15:00閉場)に合わせた固定の時刻にしている
  const dayTasks: Task[] = [
    {
      taskId: 'demo_task_day_1',
      projectId: DEMO_PROJECT_ID,
      taskMode: 'day',
      taskName: '最終確認',
      description: '照明・音響・順路の最終確認',
      taskStatus: 'completed',
      needHelp: false,
      group: '',
      startDate: today,
      endDate: today,
      taskType: 'individual',
      startTime: '09:00',
      endTime: '10:00',
      color: 'bg-blue-500',
      assignees: ['demo_user_me', 'demo_member_4']
    },
    {
      taskId: 'demo_task_day_2',
      projectId: DEMO_PROJECT_ID,
      taskMode: 'day',
      taskName: '受付対応',
      description: '整理券の配布と待ち列の案内。1時間ごとに交代',
      taskStatus: 'active',
      needHelp: false,
      group: '',
      startDate: today,
      endDate: today,
      taskType: 'resident',
      startTime: '10:00',
      endTime: '15:00',
      currentId: 'demo_member_3',
      color: 'bg-pink-500',
      assignees: ['demo_member_2', 'demo_member_3', 'demo_user_me']
    },
    {
      taskId: 'demo_task_day_3',
      projectId: DEMO_PROJECT_ID,
      taskMode: 'day',
      taskName: 'おばけ役',
      description: 'メインモンスター役。1時間ごとに交代',
      taskStatus: 'active',
      needHelp: false,
      group: '',
      startDate: today,
      endDate: today,
      taskType: 'resident',
      startTime: '10:00',
      endTime: '15:00',
      currentId: 'demo_member_4',
      color: 'bg-pink-500',
      assignees: ['demo_member_4', 'demo_member_5']
    },
    {
      taskId: 'demo_task_day_4',
      projectId: DEMO_PROJECT_ID,
      taskMode: 'day',
      taskName: '呼び込み',
      description: '校門前でビラ配り',
      taskStatus: 'completed',
      needHelp: false,
      group: '',
      startDate: today,
      endDate: today,
      taskType: 'individual',
      startTime: '10:00',
      endTime: '11:00',
      color: 'bg-blue-500',
      assignees: ['demo_member_5']
    },
    {
      taskId: 'demo_task_day_5',
      projectId: DEMO_PROJECT_ID,
      taskMode: 'day',
      taskName: '血のり補充',
      description: '在庫が少なくなってきたので買い出しが必要です',
      taskStatus: 'active',
      needHelp: true,
      group: '',
      startDate: today,
      endDate: today,
      taskType: 'individual',
      startTime: '11:30',
      endTime: '13:00',
      color: 'bg-blue-500',
      assignees: ['demo_member_2']
    },
    {
      taskId: 'demo_task_day_6',
      projectId: DEMO_PROJECT_ID,
      taskMode: 'day',
      taskName: '撤収・清掃',
      description: '閉場後に全員で片付け',
      taskStatus: 'active',
      needHelp: false,
      group: '',
      startDate: today,
      endDate: today,
      taskType: 'individual',
      startTime: '15:00',
      endTime: '16:30',
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

// デモ中のデータ置き場(メモリ上)。保存・削除の操作はここに反映されるので、
// プロジェクトを開き直しても完了状態などが保たれる。
// ページを再読み込みすると buildDemoData() からやり直しになり、初期状態に戻る。
export const demoStore = isDemoMode ? buildDemoData() : null;
