import { useState, useMemo, useRef } from "react";
import type {
  Project,
  Task,
  Group,
  Expense,
  Memo,
  Member,
  User,
  ConfirmOptions,
} from "./types";
import { memberDisplayLabel } from "./types";
import PrepGanttView from "./PrepGanttView";
import DayTimelineView from "./DayTimelineView";
import BudgetView from "./BudgetView";
import MemoView from "./MemoView";
import MemberView from "./MemberView";
import RetrospectiveView from "./RetrospectiveView";
import ProjectSettingsView from "./ProjectSettingsView";

type ProjectManagerViewProps = {
  project: Project;
  currentUser: User;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  groups: Group[];
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  memos: Memo[];
  setMemos: React.Dispatch<React.SetStateAction<Memo[]>>;
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  initialMode: "prep" | "day";
  initialView: "gantt" | "retrospective";
  onBackToHome: () => void;
  onOpenProfile?: () => void;
  requestConfirm: (options: ConfirmOptions) => void;
};

type NavViewType =
  | "gantt"
  | "budget"
  | "memo"
  | "members"
  | "retrospective"
  | "settings";

export default function ProjectManagerView({
  project,
  currentUser,
  projects,
  setProjects,
  tasks,
  setTasks,
  groups,
  setGroups,
  expenses,
  setExpenses,
  memos,
  setMemos,
  members,
  initialMode,
  initialView,
  onBackToHome,
  onOpenProfile,
  requestConfirm,
}: ProjectManagerViewProps) {
  const [currentNav, setCurrentNav] = useState<NavViewType>(initialView);
  const [taskMode, setTaskMode] = useState<"prep" | "day">(initialMode);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectedTask = useMemo(
    () =>
      selectedTaskId
        ? tasks.find((t) => t.taskId === selectedTaskId) || null
        : null,
    [tasks, selectedTaskId],
  );

  const editingTask = selectedTask;

  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const [editingGroupName, setEditingGroupName] = useState("");

  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group);
    setEditingGroupName(group.name);
  };

  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskGroup, setNewTaskGroup] = useState("");
  const [newTaskStart, setNewTaskStart] = useState("");
  const [newTaskEnd, setNewTaskEnd] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskType, setNewTaskType] = useState<"resident" | "individual">(
    "resident",
  );
  const [newTaskStartTime, setNewTaskStartTime] = useState("10:00");
  const [newTaskEndTime, setNewTaskEndTime] = useState("12:00");
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);

  const [newGroupName, setNewGroupName] = useState("");

  const [selectedYearMonth, setSelectedYearMonth] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  const dateRowRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === project.id),
    [tasks, project.id],
  );
  const projectGroups = useMemo(
    () => groups.filter((g) => g.projectId === project.id),
    [groups, project.id],
  );
  const projectExpenses = useMemo(
    () => expenses.filter((e) => e.projectId === project.id),
    [expenses, project.id],
  );
  const projectMemos = useMemo(
    () => memos.filter((m) => m.projectId === project.id),
    [memos, project.id],
  );
  const projectMembers = useMemo(
    () => members.filter((m) => m.projectId === project.id),
    [members, project.id],
  );

  const dates = useMemo(() => {
    const prepTasks = projectTasks.filter((t) => t.taskMode === "prep");
    const generateDates = (startStr: string, endStr: string) => {
      const generated = [];
      const start = new Date(startStr);
      const end = new Date(endStr);
      const days = ["日", "月", "火", "水", "木", "金", "土"];

      const current = new Date(start);
      let count = 0;
      while (current <= end && count < 730) {
        const dayOfWeek = current.getDay();
        let color = "";
        if (dayOfWeek === 0) color = "text-red-500 bg-red-50";
        if (dayOfWeek === 6) color = "text-blue-500 bg-blue-50";

        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, "0");

        generated.push({
          date: current.getDate(),
          dateString: `${y}-${m}-${String(current.getDate()).padStart(2, "0")}`,
          day: days[dayOfWeek],
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          color,
          yearMonth: `${y}-${m}`,
        });

        current.setDate(current.getDate() + 1);
        count++;
      }
      return generated;
    };

    if (prepTasks.length === 0) {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, "0");
      const d = String(today.getDate()).padStart(2, "0");
      const ny = nextWeek.getFullYear();
      const nm = String(nextWeek.getMonth() + 1).padStart(2, "0");
      const nd = String(nextWeek.getDate()).padStart(2, "0");
      return generateDates(`${y}-${m}-${d}`, `${ny}-${nm}-${nd}`);
    }

    let minDateStr = prepTasks[0].startDate;
    let maxDateStr = prepTasks[0].endDate;

    prepTasks.forEach((t) => {
      if (t.startDate < minDateStr) minDateStr = t.startDate;
      if (t.endDate > maxDateStr) maxDateStr = t.endDate;
    });

    const minDateObj = new Date(minDateStr);
    minDateObj.setDate(minDateObj.getDate() - 3);
    const maxDateObj = new Date(maxDateStr);
    maxDateObj.setDate(maxDateObj.getDate() + 5);

    const y1 = minDateObj.getFullYear();
    const m1 = String(minDateObj.getMonth() + 1).padStart(2, "0");
    const d1 = String(minDateObj.getDate()).padStart(2, "0");
    const y2 = maxDateObj.getFullYear();
    const m2 = String(maxDateObj.getMonth() + 1).padStart(2, "0");
    const d2 = String(maxDateObj.getDate()).padStart(2, "0");

    return generateDates(`${y1}-${m1}-${d1}`, `${y2}-${m2}-${d2}`);
  }, [projectTasks]);

  const availableYearMonths = useMemo(() => {
    const ymSet = new Set<string>();
    dates.forEach((d) => ymSet.add(d.yearMonth));
    return Array.from(ymSet).sort();
  }, [dates]);

  const currentIndex = availableYearMonths.indexOf(selectedYearMonth);

  const handleYearMonthChange = (ym: string) => {
    setSelectedYearMonth(ym);
    const targetDate =
      dates.find((d) => d.yearMonth === ym && d.date === 1) ||
      dates.find((d) => d.yearMonth === ym);
    if (targetDate && dateRowRefs.current[targetDate.dateString]) {
      dateRowRefs.current[targetDate.dateString]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const handlePrevMonth = () => {
    if (currentIndex > 0)
      handleYearMonthChange(availableYearMonths[currentIndex - 1]);
  };
  const handleNextMonth = () => {
    if (currentIndex < availableYearMonths.length - 1)
      handleYearMonthChange(availableYearMonths[currentIndex + 1]);
  };

  const dynamicTimeSlots = useMemo(() => {
    const dayTasks = projectTasks.filter((t) => t.taskMode === "day");
    if (dayTasks.length === 0)
      return ["10:00", "10:30", "11:00", "11:30", "12:00"];

    let minMin = 24 * 60,
      maxMin = 0;
    dayTasks.forEach((t) => {
      if (t.startTime) {
        const [h, m] = t.startTime.split(":").map(Number);
        minMin = Math.min(minMin, h * 60 + m);
      }
      if (t.endTime) {
        const [h, m] = t.endTime.split(":").map(Number);
        maxMin = Math.max(maxMin, h * 60 + m);
      }
    });

    minMin = Math.floor(minMin / 30) * 30 - 30;
    maxMin = Math.ceil(maxMin / 30) * 30 + 30;

    const slots = [];
    for (let m = minMin; m <= maxMin; m += 30) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
    return slots;
  }, [projectTasks]);

  const handleOpenTaskModal = () => {
    if (project.status === "completed") return;
    setNewTaskName("");
    setNewTaskGroup("");

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const ny = tomorrow.getFullYear();
    const nm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const nd = String(tomorrow.getDate()).padStart(2, "0");

    setNewTaskStart(`${y}-${m}-${d}`);
    setNewTaskEnd(`${ny}-${nm}-${nd}`);
    setNewTaskDescription("");
    setNewTaskStartTime("10:00");
    setNewTaskEndTime("12:00");
    setNewTaskType("resident");
    setNewTaskAssignees(projectMembers.map((mem) => mem.id).slice(0, 2));
    setIsTaskModalOpen(true);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (project.status === "completed" || !newTaskName.trim()) return;

    const actualStart = newTaskStart <= newTaskEnd ? newTaskStart : newTaskEnd;
    const actualEnd = newTaskStart <= newTaskEnd ? newTaskEnd : newTaskStart;

    const baseTask: Task = {
      taskId: `task_${Date.now()}`,
      projectId: project.id,
      taskMode: taskMode,
      taskName: newTaskName.trim(),
      taskStatus: "active",
      needHelp: false,
      group: taskMode === "prep" ? newTaskGroup : "",
      startDate: actualStart,
      endDate: actualEnd,
      description: newTaskDescription,
      color:
        taskMode === "day"
          ? newTaskType === "resident"
            ? "bg-pink-500"
            : "bg-blue-500"
          : "bg-blue-500",
      assignees: newTaskAssignees,
      remind: "締め切り日の2日前",
    };

    if (taskMode === "day") {
      baseTask.taskType = newTaskType;
      baseTask.startTime = newTaskStartTime;
      baseTask.endTime = newTaskEndTime;
      if (newTaskType === "resident" && newTaskAssignees.length > 0) {
        baseTask.currentId = newTaskAssignees[0];
      }
    }

    setTasks([...tasks, baseTask]);
    setIsTaskModalOpen(false);
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (project.status === "completed" || !newGroupName.trim()) return;

    const newGroup: Group = {
      id: `g_${Date.now()}`,
      projectId: project.id,
      name: newGroupName.trim(),
    };

    setGroups([...groups, newGroup]);
    setNewGroupName("");
    setIsGroupModalOpen(false);
  };

  const handleUpdateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedGroup ||
      project.status === "completed" ||
      !editingGroupName.trim()
    )
      return;

    setGroups(
      groups.map((g) =>
        g.id === selectedGroup.id ? { ...g, name: editingGroupName.trim() } : g,
      ),
    );
    setSelectedGroup(null);
  };

  const handleDeleteTask = () => {
    if (!selectedTask || project.status === "completed") return;
    requestConfirm({
      title: "タスクの削除",
      message: `「${selectedTask.taskName}」を削除しますか？`,
      confirmText: "削除する",
      isDanger: true,
      onConfirm: () => {
        setTasks(tasks.filter((t) => t.taskId !== selectedTask.taskId));
        setSelectedTaskId(null);
      },
    });
  };

  const handleDeleteGroup = (group: Group) => {
    if (project.status === "completed") return;
    requestConfirm({
      title: "グループの削除",
      message: `グループ「${group.name}」を削除しますか？\n含まれるタスクも一緒に削除されます。`,
      confirmText: "削除する",
      isDanger: true,
      onConfirm: () => {
        setGroups(groups.filter((g) => g.id !== group.id));
        setTasks(tasks.filter((t) => t.group !== group.id));
        setSelectedGroup(null);
      },
    });
  };

  const updateSelectedTask = (updates: Partial<Task>) => {
    if (!selectedTask || project.status === "completed") return;
    const updated = { ...selectedTask, ...updates };

    (Object.keys(updated) as (keyof Task)[]).forEach((key) => {
      if (updated[key] === undefined) {
        delete updated[key];
      }
    });

    setTasks(
      tasks.map((t) => (t.taskId === selectedTask.taskId ? updated : t)),
    );
  };

  const handleEditChange = (updates: Partial<Task>) => {
    if (!editingTask) return;
    updateSelectedTask(updates);
  };

  const handleHandover = (task: Task) => {
    if (project.status === "completed") return;
    if (!task.assignees || task.assignees.length <= 1) {
      alert("メンバーが複数人登録されている場合に引き継ぎを行えます。");
      return;
    }
    const currentIndex = task.assignees.indexOf(
      task.currentId || task.assignees[0],
    );
    const nextIndex = (currentIndex + 1) % task.assignees.length;
    const nextAssignee = task.assignees[nextIndex];

    setTasks(
      tasks.map((t) =>
        t.taskId === task.taskId ? { ...t, currentId: nextAssignee } : t,
      ),
    );
  };

  const currentUserDisplayName = currentUser.username || currentUser.name;
  const currentUserAvatar = currentUser.avatarUrl || currentUser.iconUrl;

  const navMenuItems = [
    {
      id: "gantt",
      label: "チャート",
      iconPath:
        "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    },
    {
      id: "members",
      label: "メンバー",
      iconPath:
        "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    },
    {
      id: "budget",
      label: "予算管理",
      iconPath:
        "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
      id: "memo",
      label: "共有メモ",
      iconPath:
        "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    },
    ...(project.status === "completed"
      ? [
          {
            id: "retrospective",
            label: "振り返り",
            iconPath: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
          },
        ]
      : []),
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full min-h-0 bg-white relative font-sans overflow-hidden">
      <aside className="hidden md:flex flex-col w-64 bg-gray-50 border-r border-gray-200 shrink-0 z-20">
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 shrink-0">
          <div className="flex items-center overflow-hidden">
            <button
              onClick={onBackToHome}
              className="mr-2 p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors shrink-0 cursor-pointer"
              aria-label="ホームへ戻る"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <span
              className="font-bold text-lg text-gray-800 truncate"
              title={project.name}
            >
              {project.name}
            </span>
          </div>
          <button
            onClick={() => setCurrentNav("settings")}
            className={`p-2 rounded-xl transition-colors shrink-0 cursor-pointer ${currentNav === "settings" ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-gray-700 hover:bg-gray-200"}`}
            title="プロジェクト設定"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 py-6 flex flex-col gap-2 px-4 overflow-y-auto">
          {navMenuItems.map((item) => {
            const isActive = currentNav === item.id;
            return (
              <button
                key={`pc-nav-${item.id}`}
                onClick={() => setCurrentNav(item.id as NavViewType)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer ${
                  isActive
                    ? "bg-blue-100 text-blue-700 shadow-xs"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={item.iconPath}
                  />
                </svg>
                {item.label}
              </button>
            );
          })}
        </nav>

        {onOpenProfile && (
          <div className="p-4 border-t border-gray-200 shrink-0">
            <button
              onClick={onOpenProfile}
              className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-gray-200 transition-colors text-left cursor-pointer group"
              title="プロフィール設定を開く"
            >
              <div className="relative">
                {currentUserAvatar ? (
                  <img
                    src={currentUserAvatar}
                    alt="avatar"
                    className="w-10 h-10 rounded-full border object-cover"
                  />
                ) : (
                  <div
                    className={`w-10 h-10 rounded-full ${currentUser.color || "bg-blue-600"} text-white font-bold flex items-center justify-center text-sm shadow-xs`}
                  >
                    {currentUserDisplayName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-extrabold text-sm text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                  {currentUserDisplayName}
                </p>
                <p className="text-[11px] text-gray-400 font-medium truncate">
                  プロフィール設定
                </p>
              </div>
            </button>
          </div>
        )}
      </aside>

      {/* --- メインビュー領域（右側） --- */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <header className="md:hidden h-16 border-b border-gray-200 px-4 flex items-center justify-between shrink-0 bg-white z-20">
          <div className="flex items-center text-lg font-bold overflow-hidden">
            <button
              onClick={onBackToHome}
              className="mr-2 p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors shrink-0"
              aria-label="ホームへ戻る"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <span className="truncate max-w-36 font-extrabold">
              {project.name}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenProfile && (
              <button
                onClick={onOpenProfile}
                className="cursor-pointer"
                title="プロフィール設定"
              >
                {currentUserAvatar ? (
                  <img
                    src={currentUserAvatar}
                    alt="avatar"
                    className="w-8 h-8 rounded-full border object-cover"
                  />
                ) : (
                  <div
                    className={`w-8 h-8 rounded-full ${currentUser.color || "bg-blue-600"} text-white font-bold flex items-center justify-center text-xs shadow-xs`}
                  >
                    {currentUserDisplayName.charAt(0)}
                  </div>
                )}
              </button>
            )}
            <button
              onClick={() => setCurrentNav("settings")}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${currentNav === "settings" ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-gray-700"}`}
              title="プロジェクト設定"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </header>

        {/* 内部のビュー切り替えコンテナ（overflow-auto でスクロール可能に） */}
        <div className="flex-1 min-h-0 overflow-auto flex flex-col relative">
          {currentNav === "retrospective" ? (
            <RetrospectiveView
              project={project}
              tasks={projectTasks}
              expenses={projectExpenses}
              members={projectMembers}
              onBack={() => setCurrentNav("gantt")}
            />
          ) : currentNav === "budget" ? (
            <BudgetView
              totalBudget={project.budget}
              setTotalBudget={(amount: number) =>
                setProjects(
                  projects.map((p) =>
                    p.id === project.id ? { ...p, budget: amount } : p,
                  ),
                )
              }
              expenses={projectExpenses}
              setExpenses={(newExps: Expense[]) => {
                const otherExps = expenses.filter(
                  (e) => e.projectId !== project.id,
                );
                const updatedExps = newExps.map((e) => ({
                  ...e,
                  projectId: project.id,
                }));
                setExpenses([...otherExps, ...updatedExps]);
              }}
              activeProjectId={project.id}
              requestConfirm={requestConfirm}
            />
          ) : currentNav === "memo" ? (
            <MemoView
              memos={projectMemos}
              setMemos={(newMemos: React.SetStateAction<Memo[]>) => {
                const resolvedMemos =
                  typeof newMemos === "function" ? newMemos(memos) : newMemos;
                const otherMemos = memos.filter(
                  (m) => m.projectId !== project.id,
                );
                const updatedMemos = resolvedMemos.map((m) => ({
                  ...m,
                  projectId: project.id,
                }));
                setMemos([...otherMemos, ...updatedMemos]);
              }}
              members={projectMembers}
              activeProjectId={project.id}
              currentUser={currentUser}
              requestConfirm={requestConfirm}
            />
          ) : currentNav === "members" ? (
            <MemberView
              activeProjectId={project.id}
              project={project}
              setProjects={setProjects}
              projects={projects}
              members={projectMembers}
              tasks={projectTasks}
              groups={projectGroups}
              requestConfirm={requestConfirm}
            />
          ) : currentNav === "settings" ? (
            <ProjectSettingsView
              project={project}
              projects={projects}
              setProjects={setProjects}
              onBackToHome={onBackToHome}
              requestConfirm={requestConfirm}
            />
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-center items-center shrink-0 z-30">
                <div className="flex bg-gray-100 rounded-xl p-1 w-full max-w-sm text-sm shadow-inner">
                  <button
                    onClick={() => setTaskMode("prep")}
                    className={`flex-1 py-2 flex items-center justify-center gap-2 font-bold transition-all rounded-lg cursor-pointer ${
                      taskMode === "prep"
                        ? "text-blue-600 bg-white shadow-xs"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <span>📄</span> 準備モード
                  </button>
                  <button
                    onClick={() => setTaskMode("day")}
                    className={`flex-1 py-2 flex items-center justify-center gap-2 font-bold transition-all rounded-lg cursor-pointer ${
                      taskMode === "day"
                        ? "text-blue-600 bg-white shadow-xs"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <span>🕒</span> 当日モード
                  </button>
                </div>
              </div>

              {taskMode === "prep" && (
                <div className="bg-white border-b border-gray-200 px-4 py-2 flex justify-center items-center gap-10 shrink-0 z-30">
                  <button
                    onClick={handlePrevMonth}
                    disabled={currentIndex <= 0}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-30 cursor-pointer"
                    aria-label="前月へ"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <div className="text-lg font-extrabold text-gray-800">
                    {selectedYearMonth
                      ? `${selectedYearMonth.split("-")[0]}年 ${parseInt(selectedYearMonth.split("-")[1], 10)}月`
                      : ""}
                  </div>
                  <button
                    onClick={handleNextMonth}
                    disabled={currentIndex >= availableYearMonths.length - 1}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-30 cursor-pointer"
                    aria-label="次月へ"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-hidden relative">
                {taskMode === "prep" ? (
                  <PrepGanttView
                    tasks={projectTasks}
                    groups={projectGroups}
                    dates={dates}
                    onSelectTask={(task) => setSelectedTaskId(task.taskId)}
                    onSelectGroup={handleSelectGroup}
                    onAddGroup={() => setIsGroupModalOpen(true)}
                    dateRowRefs={dateRowRefs}
                    onVisibleMonthChange={setSelectedYearMonth}
                  />
                ) : (
                  <DayTimelineView
                    tasks={projectTasks}
                    timeSlots={dynamicTimeSlots}
                    members={projectMembers}
                    onSelectTask={(task) => setSelectedTaskId(task.taskId)}
                    onHandover={handleHandover}
                  />
                )}

                {project.status === "active" && (
                  <div className="absolute bottom-6 right-6 z-40">
                    <button
                      onClick={handleOpenTaskModal}
                      className="bg-blue-600 hover:bg-blue-700 transition-all text-white font-bold p-4 rounded-full shadow-lg flex items-center justify-center gap-2 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                      aria-label="タスクの新規作成"
                    >
                      <span className="text-2xl font-light leading-none">
                        ＋
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <nav className="md:hidden h-16 bg-white border-t border-gray-200 flex justify-around items-center text-[10px] text-gray-500 shrink-0 z-40">
          {navMenuItems.map((item) => {
            const isActive = currentNav === item.id;
            return (
              <button
                key={`sp-nav-${item.id}`}
                onClick={() => setCurrentNav(item.id as NavViewType)}
                className={`flex flex-col items-center transition-colors flex-1 py-2 cursor-pointer ${
                  isActive
                    ? "text-blue-600 font-bold"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 mb-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={item.iconPath}
                  />
                </svg>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* --- グループ詳細・編集モーダル --- */}
      {selectedGroup && project.status === "active" && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedGroup(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 flex flex-col gap-4 animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-lg text-gray-800">
                グループの管理
              </h3>
              <button
                onClick={() => setSelectedGroup(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            {(() => {
              const groupTasks = projectTasks.filter(
                (t) => t.group === selectedGroup.id,
              );
              const completedGroupTasks = groupTasks.filter(
                (t) => t.taskStatus === "completed",
              );
              const activeGroupTasks = groupTasks.filter(
                (t) => t.taskStatus !== "completed",
              );
              const gProgress =
                groupTasks.length === 0
                  ? 0
                  : Math.round(
                      (completedGroupTasks.length / groupTasks.length) * 100,
                    );

              return (
                <form
                  onSubmit={handleUpdateGroup}
                  className="flex flex-col gap-4"
                >
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      グループ名
                    </label>
                    <input
                      type="text"
                      required
                      value={editingGroupName}
                      onChange={(e) => setEditingGroupName(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5 font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <span className="text-sm font-bold text-gray-500">
                      進捗度:{" "}
                    </span>
                    <span className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full text-sm">
                      {gProgress}%
                    </span>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-gray-700 mb-1">
                      残っているタスク ({activeGroupTasks.length}件)
                    </p>
                    <div className="bg-gray-50 p-3 rounded-xl max-h-28 overflow-y-auto text-sm">
                      {activeGroupTasks.length === 0 ? (
                        <p className="text-gray-400 text-xs">なし</p>
                      ) : (
                        activeGroupTasks.map((t) => (
                          <div key={t.taskId} className="py-0.5">
                            • {t.taskName}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t flex flex-col gap-2">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedGroup(null)}
                        className="flex-1 py-2.5 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        キャンセル
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-sm cursor-pointer"
                      >
                        変更を保存
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(selectedGroup)}
                      className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs transition-colors cursor-pointer mt-1"
                    >
                      グループを削除
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {isGroupModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsGroupModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 flex flex-col gap-4 animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-lg text-gray-800">
                新規グループ追加
              </h3>
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  グループ名
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                  placeholder="例: 企画"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-sm"
                >
                  作成する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTaskModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsTaskModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0">
              <h2 className="font-bold text-gray-800 text-lg">
                {taskMode === "prep" ? "準備タスク追加" : "当日タスク追加"}
              </h2>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={handleAddTask}
              className="flex-1 overflow-y-auto p-5 flex flex-col gap-4"
            >
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  タスク項目
                </label>
                <input
                  type="text"
                  required
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                  placeholder="例: 受付対応"
                />
              </div>

              {taskMode === "day" && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    タスクの種類 (当日)
                  </label>
                  <select
                    value={newTaskType}
                    onChange={(e) =>
                      setNewTaskType(
                        e.target.value as "resident" | "individual",
                      )
                    }
                    className="w-full border border-gray-300 rounded-xl p-3 bg-white font-bold text-sm text-gray-800 outline-none"
                  >
                    <option value="resident">
                      📌 常駐タスク (引き継ぎ管理あり)
                    </option>
                    <option value="individual">
                      ⚡ 個別タスク (単発・ステージ運営など)
                    </option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  タスクの説明
                </label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="詳細や手順を入力..."
                  rows={2}
                />
              </div>

              {taskMode === "prep" && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    グループに割り当て
                  </label>
                  <select
                    value={newTaskGroup}
                    onChange={(e) => setNewTaskGroup(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-3 bg-white font-bold text-sm text-gray-800 outline-none"
                  >
                    <option value="">(未分類)</option>
                    {projectGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {taskMode === "prep" ? (
                <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-3 border border-gray-200">
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="text-xs font-bold text-gray-500">
                      開始日
                    </span>
                    <input
                      type="date"
                      required
                      value={newTaskStart}
                      onChange={(e) => setNewTaskStart(e.target.value)}
                      className="bg-white border border-gray-300 rounded-lg p-1.5 text-xs font-bold outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="text-xs font-bold text-gray-500">
                      終了日
                    </span>
                    <input
                      type="date"
                      required
                      value={newTaskEnd}
                      onChange={(e) => setNewTaskEnd(e.target.value)}
                      className="bg-white border border-gray-300 rounded-lg p-1.5 text-xs font-bold outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 rounded-xl p-3 border border-gray-200 flex flex-col gap-2">
                  <span className="text-xs font-bold text-gray-500 text-center">
                    ⏰ 時間設定
                  </span>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-[10px] font-bold text-gray-400 mb-1">
                        開始時間
                      </span>
                      <input
                        type="time"
                        required
                        value={newTaskStartTime}
                        onChange={(e) => setNewTaskStartTime(e.target.value)}
                        className="w-full bg-white border-2 border-blue-400 rounded-xl py-2 px-2 text-center text-base font-extrabold text-blue-600 outline-none shadow-inner cursor-pointer"
                      />
                    </div>
                    <span className="text-xl font-bold text-gray-400 mt-5">
                      〜
                    </span>
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-[10px] font-bold text-gray-400 mb-1">
                        終了時間
                      </span>
                      <input
                        type="time"
                        required
                        value={newTaskEndTime}
                        onChange={(e) => setNewTaskEndTime(e.target.value)}
                        className="w-full bg-white border-2 border-blue-400 rounded-xl py-2 px-2 text-center text-base font-extrabold text-blue-600 outline-none shadow-inner cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  {taskMode === "prep"
                    ? "準備タスクを作成"
                    : "当日タスクを作成"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTask && editingTask && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTaskId(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-gray-800">
                  タスク編集・詳細
                </h3>
                {editingTask.taskStatus === "completed" && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold border border-green-200">
                    完了済
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedTaskId(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">
                  タスク名
                </label>
                <input
                  type="text"
                  value={editingTask.taskName}
                  disabled={project.status === "completed"}
                  onChange={(e) =>
                    handleEditChange({ taskName: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl p-2.5 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">
                  説明
                </label>
                <textarea
                  value={editingTask.description || ""}
                  disabled={project.status === "completed"}
                  onChange={(e) =>
                    handleEditChange({ description: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                  placeholder="説明を入力..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {editingTask.taskMode === "prep" && (
                  <div>
                    <label className="block text-sm font-bold text-gray-500 mb-1">
                      担当グループ
                    </label>
                    <select
                      value={editingTask.group}
                      disabled={project.status === "completed"}
                      onChange={(e) =>
                        handleEditChange({ group: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-xl p-2 bg-white text-xs font-bold text-gray-800 outline-none disabled:bg-gray-100"
                    >
                      <option value="">(未分類)</option>
                      {projectGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div
                  className={editingTask.taskMode === "day" ? "col-span-2" : ""}
                >
                  <label className="block text-sm font-bold text-gray-500 mb-1">
                    {editingTask.taskMode === "prep"
                      ? "期間・日付"
                      : "時間設定"}
                  </label>
                  {editingTask.taskMode === "prep" ? (
                    <div className="flex flex-col gap-1">
                      <input
                        type="date"
                        disabled={project.status === "completed"}
                        value={editingTask.startDate}
                        onChange={(e) =>
                          handleEditChange({ startDate: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-lg p-1 text-xs font-bold disabled:bg-gray-100"
                      />
                      <input
                        type="date"
                        disabled={project.status === "completed"}
                        value={editingTask.endDate}
                        onChange={(e) =>
                          handleEditChange({ endDate: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-lg p-1 text-xs font-bold disabled:bg-gray-100"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                      <input
                        type="time"
                        disabled={project.status === "completed"}
                        value={editingTask.startTime || "10:00"}
                        onChange={(e) =>
                          handleEditChange({ startTime: e.target.value })
                        }
                        className="flex-1 border-2 border-blue-400 rounded-lg py-1 px-1 text-center text-sm font-extrabold text-blue-600 outline-none bg-white disabled:bg-gray-100"
                      />
                      <span className="font-bold text-gray-400">〜</span>
                      <input
                        type="time"
                        disabled={project.status === "completed"}
                        value={editingTask.endTime || "12:00"}
                        onChange={(e) =>
                          handleEditChange({ endTime: e.target.value })
                        }
                        className="flex-1 border-2 border-blue-400 rounded-lg py-1 px-1 text-center text-sm font-extrabold text-blue-600 outline-none bg-white disabled:bg-gray-100"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">
                  割り当てメンバー
                </label>
                <div className="flex flex-wrap gap-2 items-center bg-gray-50 p-2.5 rounded-xl border border-gray-200 min-h-12">
                  {editingTask.assignees?.map((uid) => {
                    const member = projectMembers.find((m) => m.id === uid);
                    const colorClass = member ? member.color : "bg-gray-400";
                    const memberName = member
                      ? member.username || member.name
                      : "不明なメンバー";
                    return (
                      <span
                        key={uid}
                        className={`${colorClass} text-white px-2.5 py-1 rounded-full flex items-center justify-center text-xs font-bold shadow-sm`}
                      >
                        {memberName}
                        {project.status === "active" && (
                          <button
                            onClick={() =>
                              handleEditChange({
                                assignees: editingTask.assignees?.filter(
                                  (a) => a !== uid,
                                ),
                              })
                            }
                            className="ml-1.5 text-white hover:text-red-200"
                          >
                            &times;
                          </button>
                        )}
                      </span>
                    );
                  })}
                  {project.status === "active" && (
                    <select
                      onChange={(e) => {
                        if (
                          e.target.value &&
                          !editingTask.assignees?.includes(e.target.value)
                        ) {
                          handleEditChange({
                            assignees: [
                              ...(editingTask.assignees || []),
                              e.target.value,
                            ],
                          });
                        }
                        e.target.value = "";
                      }}
                      className="text-xs border rounded-lg p-1 bg-white outline-none"
                    >
                      <option value="">＋追加</option>
                      {projectMembers
                        .filter((m) => !editingTask.assignees?.includes(m.id))
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {memberDisplayLabel(m)}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </div>

              {editingTask.taskMode === "day" &&
                editingTask.taskType === "resident" && (
                  <div className="bg-pink-50 p-3 rounded-xl border border-pink-200 flex flex-col gap-2">
                    <p className="text-xs font-bold text-pink-700">
                      📌 常駐タスク引き継ぎ管理
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold">
                        現在の担当:{" "}
                        {(() => {
                          const cm = projectMembers.find(
                            (m) => m.id === editingTask.currentId,
                          );
                          return cm ? memberDisplayLabel(cm) : "未割当";
                        })()}
                      </span>
                      {project.status === "active" && (
                        <button
                          type="button"
                          onClick={() => handleHandover(editingTask)}
                          className="bg-pink-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm hover:bg-pink-700 transition-colors cursor-pointer"
                        >
                          次の担当者へ引き継ぎ &gt;
                        </button>
                      )}
                    </div>
                  </div>
                )}

              {project.status === "active" && (
                <div className="mt-2 bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col gap-3">
                  <p className="text-sm font-bold text-gray-500 mb-1">
                    クイックアクション
                  </p>
                  <button
                    onClick={() =>
                      handleEditChange({
                        taskStatus:
                          editingTask.taskStatus === "active"
                            ? "completed"
                            : "active",
                      })
                    }
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                      editingTask.taskStatus === "completed"
                        ? "bg-white border border-gray-300 text-gray-600 hover:bg-gray-100"
                        : "bg-green-500 text-white hover:bg-green-600 shadow-sm"
                    }`}
                  >
                    {editingTask.taskStatus === "completed"
                      ? "「未完了」に戻す"
                      : "✓ タスクを完了にする"}
                  </button>
                  <button
                    onClick={() =>
                      handleEditChange({ needHelp: !editingTask.needHelp })
                    }
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 border cursor-pointer ${
                      editingTask.needHelp
                        ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                        : "bg-white border-red-300 text-red-500 hover:bg-red-50"
                    }`}
                  >
                    {editingTask.needHelp
                      ? "ヘルプ要請を取り下げる"
                      : "🆘 ヘルプ(SOS)を要請する"}
                  </button>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3 shrink-0">
                <button
                  onClick={() => setSelectedTaskId(null)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  閉じる
                </button>
                {project.status === "active" && (
                  <button
                    onClick={handleDeleteTask}
                    className="flex-1 py-2.5 bg-white border border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    削除する
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}