import { useMemo, useCallback } from 'react';
import type { Task } from './types';

type DayTimelineViewProps = {
  tasks: Task[];
  timeSlots: string[];
  onSelectTask: (task: Task) => void;
  onHandover: (task: Task) => void;
};

export default function DayTimelineView({ tasks, timeSlots, onSelectTask, onHandover }: DayTimelineViewProps) {
  
  const getRowByTimeString = useCallback((timeStr?: string, isEnd = false) => {
    if (!timeStr || timeSlots.length === 0) return 2;
    const [h, m] = timeStr.split(':').map(Number);
    const minutes = h * 60 + m;
    const [baseH, baseM] = timeSlots[0].split(':').map(Number);
    const baseMinutes = baseH * 60 + baseM;
    let index = (minutes - baseMinutes) / 30;
    if (index < 0) index = 0; 
    const finalIndex = isEnd ? Math.ceil(index) : Math.floor(index);
    return finalIndex + 2; 
  }, [timeSlots]);

  const layoutData = useMemo(() => {
    const colsMap: Record<string, { taskId: string, subCol: number }[]> = { resident: [], individual: [] };
    const maxColsMap: Record<string, number> = { resident: 1, individual: 1 };
    
    ['resident', 'individual'].forEach(type => {
        const typeTasks = tasks.filter(t => t.taskMode === 'day' && t.taskType === type)
                               .sort((a,b) => getRowByTimeString(a.startTime, false) - getRowByTimeString(b.startTime, false));
        const cols: number[] = [];
        const taskLayout: {taskId: string, subCol: number}[] = [];
        
        typeTasks.forEach(t => {
            const start = getRowByTimeString(t.startTime, false);
            let end = getRowByTimeString(t.endTime, true);
            if (start === end) end = start + 1;
            
            let placed = false;
            for(let i=0; i<cols.length; i++) {
                if (cols[i] <= start) {
                    cols[i] = end;
                    taskLayout.push({taskId: t.taskId, subCol: i});
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                cols.push(end);
                taskLayout.push({taskId: t.taskId, subCol: cols.length - 1});
            }
        });
        colsMap[type] = taskLayout;
        maxColsMap[type] = Math.max(1, cols.length);
    });
    
    return { colsMap, maxColsMap };
  }, [tasks, getRowByTimeString]);

  const residentStartCol = 2;
  const individualStartCol = residentStartCol + layoutData.maxColsMap.resident;
  const totalCols = individualStartCol + layoutData.maxColsMap.individual;

  if (timeSlots.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-400 font-bold">当日タスクがありません</div>;
  }

  return (
    <div className="flex-1 overflow-auto bg-white relative w-full h-full">
      <div
        className="grid w-full"
        style={{
          // 各タスク列の最大幅を 80px に制限
          gridTemplateColumns: `70px repeat(${totalCols - 1}, minmax(80px, 120px))`,
          gridTemplateRows: `48px repeat(${timeSlots.length}, 60px)`
        }}
      >
        <div className="sticky top-0 left-0 z-50 flex items-center justify-center text-xs font-bold text-gray-600 bg-gray-100 border-b border-r border-gray-300 shadow-[0_2px_0_0_#e5e7eb]" style={{ gridRow: 1, gridColumn: 1 }}>
          時間
        </div>
        
        <div 
          className="sticky top-0 z-40 col-span-full bg-white border-b border-gray-300 shadow-sm pointer-events-none" 
          style={{ gridRow: 1, gridColumn: `2 / span ${totalCols - 1}` }}
        />

        <div className="sticky top-0 z-45 flex items-center justify-center text-sm font-bold text-pink-700 bg-pink-50 border-r border-pink-200" style={{ gridRow: 1, gridColumn: `${residentStartCol} / span ${layoutData.maxColsMap.resident}` }}>
          📌 常駐タスク
        </div>
        
        <div className="sticky top-0 z-45 flex items-center justify-center text-sm font-bold text-blue-700 bg-blue-50 border-r border-blue-200" style={{ gridRow: 1, gridColumn: `${individualStartCol} / span ${layoutData.maxColsMap.individual}` }}>
          ⚡ 個別タスク
        </div>

        {timeSlots.map((time, index) => (
          <div
            key={time}
            className="sticky left-0 z-30 flex items-center justify-center text-xs font-bold bg-white border-b border-r border-gray-200 text-gray-500 shadow-[1px_0_0_0_#e5e7eb]"
            style={{ gridRow: index + 2, gridColumn: 1 }}
          >
            {time}
          </div>
        ))}

        {timeSlots.map((_, i) => (
          <div key={`d-row-${i}`} className="col-span-full border-b border-gray-100 pointer-events-none" style={{ gridRow: i + 2 }} />
        ))}
        {Array.from({ length: totalCols - 1 }).map((_, i) => (
          <div key={`d-col-${i}`} className="row-span-full border-r border-gray-50 pointer-events-none" style={{ gridColumn: i + 2, gridRow: `2 / span ${timeSlots.length}` }} />
        ))}

        {tasks.filter(t => t.taskMode === 'day').map(t => {
          const start = getRowByTimeString(t.startTime, false);
          let end = getRowByTimeString(t.endTime, true);
          if (start === end) end = start + 1;

          const isResident = t.taskType === 'resident';
          const typeStr = isResident ? 'resident' : 'individual';
          const layout = layoutData.colsMap[typeStr].find(l => l.taskId === t.taskId);
          const colIndex = (isResident ? residentStartCol : individualStartCol) + (layout ? layout.subCol : 0);
          const isCompleted = t.taskStatus === 'completed';

          return (
            <div
              key={t.taskId}
              onClick={() => onSelectTask(t)}
              className={`
                ${t.color} text-white text-sm font-bold rounded-lg mx-2 my-1 
                shadow-sm cursor-pointer transition-transform hover:scale-[1.01] hover:shadow-md z-10 relative overflow-hidden
                ${isCompleted ? 'opacity-50 border-2 border-dashed border-white/50' : 'opacity-95 hover:opacity-100'}
                ${t.needHelp ? 'ring-2 ring-red-500 animate-pulse border-red-500' : ''}
              `}
              style={{
                gridRow: `${start} / ${end}`,
                gridColumn: colIndex,
              }}
            >
              <div className="sticky top-25 flex flex-col gap-2 p-3 w-full">
                <div className="flex justify-between items-start">
                  <span className="font-extrabold text-base tracking-wide drop-shadow-sm">{t.taskName}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {isCompleted && <span className="text-white bg-green-500 rounded-full w-4 h-4 flex items-center justify-center text-[10px]">✓</span>}
                    {t.needHelp && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-bounce">🆘 SOS</span>}
                  </div>
                </div>

                {isResident && (
                  <div className="pt-2 border-t border-white/20 flex justify-between items-center text-xs bg-black/10 px-2 py-1 rounded">
                    <span>担当: <strong className="underline">{t.currentId || '未割当'}</strong></span>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onHandover(t); }}
                      className="bg-white text-gray-800 hover:bg-gray-100 px-2 py-0.5 rounded font-bold shadow-xs text-[11px]"
                    >
                      引き継ぎ &gt;
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}