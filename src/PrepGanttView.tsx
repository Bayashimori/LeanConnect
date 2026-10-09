import { useMemo, useCallback, useEffect, useRef } from 'react';
import type { Task, Group, DateItem } from './types';

type PrepGanttViewProps = {
  tasks: Task[];
  groups: Group[];
  dates: DateItem[];
  onSelectTask: (task: Task) => void;
  onSelectGroup: (group: Group) => void;
  onAddGroup: () => void;
  dateRowRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  onVisibleMonthChange?: (yearMonth: string) => void;
};

export default function PrepGanttView({
  tasks,
  groups,
  dates,
  onSelectTask,
  onSelectGroup,
  onAddGroup,
  dateRowRefs,
  onVisibleMonthChange
}: PrepGanttViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startRow = 2;

  const getRowByDateString = useCallback((dateStr: string) => {
    const index = dates.findIndex(d => d.dateString === dateStr);
    return index !== -1 ? index + startRow : startRow; 
  }, [dates]);

  // スクロール時に画面上部に見えている日付の「年月」を検知して親に通知
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onVisibleMonthChange || dates.length === 0) return;

    const handleScroll = () => {
      const headerOffset = 60;
      const containerTop = container.getBoundingClientRect().top;

      for (const d of dates) {
        const el = dateRowRefs.current[d.dateString];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top - containerTop >= -10 && rect.top - containerTop <= headerOffset + 80) {
            onVisibleMonthChange(d.yearMonth);
            break;
          }
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [dates, dateRowRefs, onVisibleMonthChange]);

  const layoutData = useMemo(() => {
    const groupCols: Record<string, { taskId: string, subCol: number }[]> = {};
    const groupMaxCols: Record<string, number> = {};
    const groupProgress: Record<string, number> = {};
    
    const allGroupIds = ['', ...groups.map(g => g.id)];
    
    allGroupIds.forEach(gid => {
      const gTasks = tasks
        .filter(t => t.taskMode === 'prep' && (t.group || '') === gid)
        .sort((a, b) => getRowByDateString(a.startDate) - getRowByDateString(b.startDate));
      
      const cols: number[] = []; 
      const taskLayout: { taskId: string, subCol: number }[] = [];
      
      gTasks.forEach(t => {
        const start = getRowByDateString(t.startDate);
        const end = getRowByDateString(t.endDate) + 1;
        let placed = false;
        for (let i = 0; i < cols.length; i++) {
          if (cols[i] <= start) { 
            cols[i] = end;
            taskLayout.push({ taskId: t.taskId, subCol: i });
            placed = true;
            break;
          }
        }
        if (!placed) {
          cols.push(end);
          taskLayout.push({ taskId: t.taskId, subCol: cols.length - 1 });
        }
      });
      groupCols[gid] = taskLayout;
      groupMaxCols[gid] = Math.max(1, cols.length); 

      if (gid !== '') {
        const comp = gTasks.filter(t => t.taskStatus === 'completed').length;
        groupProgress[gid] = gTasks.length > 0 ? Math.round((comp / gTasks.length) * 100) : 0;
      }
    });

    let currentCol = 2; 
    const groupStartCol: Record<string, number> = {};
    allGroupIds.forEach(gid => {
      groupStartCol[gid] = currentCol;
      currentCol += groupMaxCols[gid];
    });

    return { groupCols, groupMaxCols, groupStartCol, totalCols: currentCol, groupProgress, allGroupIds };
  }, [tasks, groups, getRowByDateString]);

  const { groupCols, groupMaxCols, groupStartCol, totalCols, groupProgress, allGroupIds } = layoutData;

  if (dates.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-400 font-bold">タスクがありません</div>;
  }

  // カラム数に応じて全体の最小幅を動的に確保し、細くなりすぎたら横スクロールさせる
  const minWidthPx = Math.max(320, 60 + (totalCols - 1) * 55 + 80);

  return (
    <div ref={containerRef} className="flex-1 overflow-auto bg-white relative w-full h-full">
      <div 
        className="grid"
        style={{
          minWidth: `${minWidthPx}px`,
          gridTemplateColumns: `60px repeat(${Math.max(1, totalCols - 2)}, minmax(45px, 1fr)) 80px`,
          gridTemplateRows: `56px repeat(${dates.length}, 60px)`
        }}
      >
        {/* 左上のコーナー空白（スクロール時に縦横両方で固定） */}
        <div 
          className="sticky top-0 left-0 z-50 bg-white border-b border-r border-gray-300 shadow-[0_2px_0_0_#e5e7eb]" 
          style={{ gridRow: 1, gridColumn: 1 }}
        ></div>

        <div 
          className="sticky top-0 z-40 col-span-full bg-white border-b border-gray-300 shadow-sm pointer-events-none" 
          style={{ gridRow: 1, gridColumn: `2 / span ${Math.max(1, totalCols - 1)}` }}
        />

        {/* グループ名見出し行（top-0 で画面上部に完全固定） */}
        <div 
          className="sticky top-0 z-45 flex items-center justify-center text-xs font-bold text-gray-400 bg-white border-r border-b border-gray-300"
          style={{ gridRow: 1, gridColumn: `${groupStartCol[''] || 2} / span ${groupMaxCols[''] || 1}` }}
        >
          未分類
        </div>

        {groups.map(g => (
          <div
            key={g.id}
            onClick={() => onSelectGroup(g)}
            className="sticky top-0 z-45 flex flex-col items-center justify-center text-sm font-bold text-blue-800 bg-blue-50/95 border-r border-b border-gray-300 cursor-pointer hover:bg-blue-100 transition-colors backdrop-blur-md"
            style={{ gridRow: 1, gridColumn: `${groupStartCol[g.id] || 2} / span ${groupMaxCols[g.id] || 1}` }}
            title="タップして詳細・削除"
          >
            <span className="truncate w-full text-center px-1">{g.name} ▼</span>
            <span className="text-[10px] text-blue-600 font-extrabold bg-white px-2 py-0.5 rounded-full mt-0.5 shadow-sm leading-none">{groupProgress[g.id] || 0}%</span>
          </div>
        ))}

        <div
          onClick={onAddGroup}
          className="sticky top-0 z-45 flex items-center justify-center text-sm font-bold text-gray-500 bg-gray-50 border-b border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors"
          style={{ gridRow: 1, gridColumn: totalCols }}
        >
          ＋グループ
        </div>

        {allGroupIds.map((gid: string) => (
          <div
            key={`swimlane-${gid}`}
            className="border-2 border-blue-200 bg-blue-50/10 rounded-xl pointer-events-none z-0"
            style={{
              gridRow: `2 / span ${dates.length}`,
              gridColumn: `${groupStartCol[gid] || 2} / span ${groupMaxCols[gid] || 1}`,
              margin: '4px 2px',
            }}
          />
        ))}

        {/* 左側の日付列（横スクロール時に左側に固定） */}
        {dates.map((d, index) => (
          <div
            key={d.dateString}
            ref={el => { dateRowRefs.current[d.dateString] = el; }}
            className={`sticky left-0 z-30 flex flex-col items-center justify-center text-sm bg-white border-b border-r border-gray-200 ${d.color || 'text-gray-600'}`}
            style={{ gridRow: index + 2, gridColumn: 1 }}
          >
            <span className="text-[10px] leading-tight">{d.day}</span>
            <span className="font-bold text-base">{d.date}</span>
          </div>
        ))}

        {dates.map((_, i) => (
          <div key={`border-row-${i}`} className="col-span-full border-b border-gray-100 pointer-events-none" style={{ gridRow: i + 2 }} />
        ))}
        {Array.from({ length: Math.max(1, totalCols - 1) }).map((_, i) => (
          <div key={`border-col-${i}`} className="row-span-full border-r border-gray-50 pointer-events-none" style={{ gridColumn: i + 2, gridRow: `2 / span ${dates.length}` }} />
        ))}

        {tasks.filter(t => t.taskMode === 'prep').map(t => {
          const start = getRowByDateString(t.startDate);
          const end = getRowByDateString(t.endDate) + 1; 
          const gid = (t.group && groupCols[t.group]) ? t.group : '';
          const targetGroupCols = groupCols[gid] || [];
          const layout = targetGroupCols.find(l => l.taskId === t.taskId);
          const baseStartCol = groupStartCol[gid] || 2;
          const colIndex = baseStartCol + (layout ? layout.subCol : 0);
          const isCompleted = t.taskStatus === 'completed';

          return (
            <div
              key={t.taskId}
              onClick={() => onSelectTask(t)}
              className={`
                ${t.color} text-white text-sm font-bold rounded-lg mx-1.5 my-1 
                shadow-sm cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-md z-10 relative overflow-hidden
                ${isCompleted ? 'opacity-50 border-2 border-dashed border-white/50' : 'opacity-90'}
                ${t.needHelp ? 'ring-2 ring-red-500 animate-pulse border-red-500' : ''}
              `}
              style={{
                gridRow: `${start} / ${end}`,
                gridColumn: colIndex,
              }}
            >
              <div className="sticky top-27.5 flex flex-col items-center justify-start py-2 w-full">
                <div className="relative h-5 w-5 flex justify-center mb-1">
                  {isCompleted && <span className="absolute text-white bg-green-500 rounded-full w-4 h-4 flex items-center justify-center text-[10px]">✓</span>}
                  {t.needHelp && <span className="absolute right-0 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full shadow-md animate-bounce">🆘</span>}
                </div>
                <span className="tracking-widest drop-shadow-md" style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}>
                  {t.taskName}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}