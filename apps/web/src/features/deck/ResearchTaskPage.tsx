import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Sparkles, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useTaskManager } from '@/lib/tasks/TaskManagerContext';
import { ResearchStage } from './ResearchStage';

export default function ResearchTaskPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const { getTask } = useTaskManager();

  const task = taskId ? getTask(taskId) : undefined;

  if (!task) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <h1 className="font-display text-2xl font-semibold text-content">Task not found</h1>
        <p className="mt-2 text-sm text-muted">
          The requested research task could not be found or was cleared.
        </p>
        <Link to="/" className="btn-primary mt-6 inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to markets
        </Link>
      </div>
    );
  }

  const isRunning = task.status === 'running';
  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed';

  return (
    <div className="mx-auto max-w-3xl">
      {/* Top action header: Back navigation links & View Deck CTA when completed */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          to={task.marketId ? `/markets/${task.marketId}/deck` : '/'}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-content"
        >
          <ArrowLeft className="h-4 w-4" />
          {task.marketId ? 'Back to deck' : 'Back to markets'}
        </Link>

        {isCompleted && task.marketId && (
          <Link
            to={`/markets/${task.marketId}/deck`}
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <span>View Deck</span>
            <ExternalLink className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Primary task card panel: Contains status header, alert banner, and live research stage */}
      <div className="panel p-6">
        {/* Task Title & Status Header: Shows task title and status badge (Running, Complete, Failed) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary-ink" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                {task.type === 'deck_create' ? 'Market Research Task' : 'Deck Refresh Task'}
              </span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-semibold text-content">{task.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            {isRunning && (
              <span className="chip border-primary/40 bg-primary/10 text-primary-ink">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Research Running
              </span>
            )}
            {isCompleted && (
              <span className="chip border-emerald-300 bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Research Complete
              </span>
            )}
            {isFailed && (
              <span className="chip border-negative/40 bg-negative/10 text-negative">
                <XCircle className="h-3.5 w-3.5" />
                Research Failed
              </span>
            )}
          </div>
        </div>

        {/* Completion Alert Banner: Highlighted success notice with direct link to generated market deck */}
        {isCompleted && task.marketId && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">Research completed successfully!</p>
                <p className="mt-0.5 text-xs text-emerald-800">
                  Your competitive intelligence deck is ready to explore.
                </p>
              </div>
              <Link
                to={`/markets/${task.marketId}/deck`}
                className="btn-primary shrink-0 bg-emerald-700 text-white hover:bg-emerald-800"
              >
                Open Deck →
              </Link>
            </div>
          </div>
        )}

        {/* Failure Error Banner: Displays error message if research pass fails */}
        {isFailed && (
          <div className="mt-4 rounded-xl border border-negative/40 bg-negative/10 p-4 text-negative">
            <p className="font-semibold text-sm">Research encountered an error</p>
            <p className="mt-1 text-xs">{task.error || 'Check your Gemini API key and try again.'}</p>
          </div>
        )}

        {/* Live Research Stage Section: Glass-box log terminal and real-time market brief insights */}
        <div className="mt-6">
          <ResearchStage lines={task.log} message={task.currentStep} pct={task.progress} />
        </div>
      </div>
    </div>
  );
}
