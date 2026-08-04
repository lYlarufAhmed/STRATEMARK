import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
  ExternalLink,
  Loader2,
  Terminal,
} from 'lucide-react';
import { useTaskManager, type RunningTask } from '@/lib/tasks/TaskManagerContext';
import { cn } from '@/lib/cn';

export function TaskNotificationButton() {
  const { activeTasks, tasks } = useTaskManager();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (!open) return;
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const activeCount = activeTasks.length;
  const totalCount = tasks.length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'relative inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
          activeCount > 0
            ? 'border-primary/50 bg-primary/10 text-primary-ink hover:bg-primary/20'
            : 'border-border bg-surface text-muted hover:text-content',
        )}
        title="Background Research & Tasks"
      >
        {activeCount > 0 ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-ink" />
        ) : (
          <Activity className="h-3.5 w-3.5" />
        )}

        <span>
          {activeCount > 0
            ? `${activeCount} research running`
            : totalCount > 0
              ? `${totalCount} tasks`
              : 'Tasks'}
        </span>

        {activeCount > 0 && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
        )}
      </button>

      {open && <TaskDrawer onClose={() => setOpen(false)} />}
    </div>
  );
}

function TaskDrawer({ onClose }: { onClose: () => void }) {
  const { tasks, clearCompleted, dismissTask } = useTaskManager();
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const completedCount = tasks.filter((t) => t.status !== 'running').length;

  return (
    <div className="absolute right-0 top-11 z-50 w-96 rounded-xl border border-border bg-surface shadow-xl">
      {/* Drawer Header Bar: Monitor title & Clear completed action */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-content">
          <Activity className="h-4 w-4 text-primary-ink" />
          <span>Research & Task Monitor</span>
        </div>
        <div className="flex items-center gap-1">
          {completedCount > 0 && (
            <button
              type="button"
              onClick={clearCompleted}
              className="btn-ghost px-2 py-1 text-[11px] text-muted hover:text-content"
              title="Clear completed tasks"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted hover:bg-surface-2 hover:text-content"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Task List Container: Scrollable list of active and recent research tasks */}
      <div className="max-h-96 overflow-y-auto p-3 space-y-3">
        {tasks.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted">No recent tasks or research activity.</p>
        ) : (
          tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              expanded={expandedLogId === task.id}
              onToggleLog={() =>
                setExpandedLogId((prev) => (prev === task.id ? null : task.id))
              }
              onDismiss={() => dismissTask(task.id)}
              onCloseDrawer={onClose}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TaskItem({
  task,
  expanded,
  onToggleLog,
  onDismiss,
  onCloseDrawer,
}: {
  task: RunningTask;
  expanded: boolean;
  onToggleLog: () => void;
  onDismiss: () => void;
  onCloseDrawer: () => void;
}) {
  const isRunning = task.status === 'running';
  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed';

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs">
      {/* Task Header Row: Icon status, task title linked to /research/:taskId, and dismiss button */}
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/research/${task.id}`}
          onClick={onCloseDrawer}
          className="flex items-center gap-2 min-w-0 hover:underline cursor-pointer"
        >
          {isRunning && <Loader2 className="h-4 w-4 animate-spin shrink-0 text-primary-ink" />}
          {isCompleted && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
          {isFailed && <XCircle className="h-4 w-4 shrink-0 text-negative" />}
          <span className="font-medium text-content truncate">{task.title}</span>
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          className="text-muted hover:text-content p-0.5 rounded"
          title="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Task Progress Bar & Current Step Label (Shown while research task is active/running) */}
      {isRunning && (
        <div className="mt-2 space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.round(task.progress * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted">
            <span className="truncate max-w-[220px]">{task.currentStep}</span>
            <span className="shrink-0">{Math.round(task.progress * 100)}%</span>
          </div>
        </div>
      )}

      {/* Task Completion Status Line */}
      {isCompleted && (
        <p className="mt-1.5 text-[11px] text-emerald-600">
          Completed {task.currentStep}
        </p>
      )}

      {/* Task Failure Error Line */}
      {isFailed && (
        <p className="mt-1.5 text-[11px] text-negative font-medium">
          {task.error || 'Research failed.'}
        </p>
      )}

      {/* Task Footer Actions Bar: Toggle mini log output, open research stage view, or view market deck */}
      <div className="mt-2.5 flex items-center justify-between border-t border-border/60 pt-2 text-[11px]">
        <button
          type="button"
          onClick={onToggleLog}
          className="inline-flex items-center gap-1 text-muted hover:text-content"
        >
          <Terminal className="h-3 w-3" />
          <span>{expanded ? 'Hide log' : `View log (${task.log.length})`}</span>
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        <div className="flex items-center gap-2">
          <Link
            to={`/research/${task.id}`}
            onClick={onCloseDrawer}
            className="inline-flex items-center gap-1 text-muted hover:text-content font-medium underline"
          >
            <span>Stage</span>
          </Link>
          {task.marketId && (
            <Link
              to={`/markets/${task.marketId}/deck`}
              onClick={onCloseDrawer}
              className="inline-flex items-center gap-1 text-primary-ink font-medium hover:underline"
            >
              <span>Deck</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      {/* Collapsible Mini Log Output Window (Expanded when user clicks 'View log') */}
      {expanded && (
        <div className="mt-2 max-h-40 overflow-y-auto rounded bg-[#1B1F27] p-2 font-mono text-[11px] text-[#D6DAE3] leading-relaxed space-y-1">
          {task.log.map((line, idx) => (
            <div key={idx} className="flex gap-1.5">
              <span className={line.kind === 'find' ? 'text-emerald-400' : line.kind === 'warn' ? 'text-amber-400' : 'text-sky-400'}>
                {line.kind === 'find' ? '✓' : line.kind === 'warn' ? '!' : '▸'}
              </span>
              <span>{line.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
