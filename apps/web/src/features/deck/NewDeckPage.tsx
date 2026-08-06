import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Globe2, KeyRound, Sparkles, Wand2 } from 'lucide-react';
import { useRepository } from '@/lib/repository/RepositoryProvider';
import { useApiKey } from '@/lib/settings/apiKey';
import { useTaskManager } from '@/lib/tasks/TaskManagerContext';
import { useDemo } from '@/lib/demo/DemoContext';

const EXAMPLES = [
  'Christian apparel companies',
  'AI code-review startups',
  'Non-alcoholic spirits brands',
  'Precision fermentation companies',
];

export default function NewDeckPage() {
  const repo = useRepository();
  const navigate = useNavigate();
  const hasKey = useApiKey((s) => s.hasKey);
  const taskManager = useTaskManager();
  const demo = useDemo();

  const [prompt, setPrompt] = useState('');
  const [region, setRegion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setError(null);

    if (!demo.consumeDemoQuery()) {
      return;
    }

    const title = `Research: "${prompt.trim()}"${region.trim() ? ` (${region.trim()})` : ''}`;
    const taskId = taskManager.startTask('deck_create', title);

    // Immediately navigate to the task's live research view
    navigate(`/research/${taskId}`);

    // Fire research in background promise
    void repo
      .createResearchedDeck(
        { prompt: prompt.trim(), region: region.trim() || null },
        {
          taskId,
          onProgress: (p) => {
            taskManager.appendLog(taskId, p.message, p.kind ?? 'step', p.progress);
          },
        },
      )
      .then(({ market, deck }) => {
        taskManager.completeTask(taskId, {
          marketId: market.id,
          deckId: deck.id,
          message: `Deck ready: ${market.name}`,
        });
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Research failed. Check your API key and try again.';
        taskManager.failTask(taskId, msg);
      });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-2 flex items-center gap-2 text-primary-ink">
        <Wand2 className="h-5 w-5" />
        <span className="text-sm font-medium uppercase tracking-wide">New deck</span>
      </div>
      <h1 className="font-display text-3xl font-semibold text-content">
        What market should we map?
      </h1>
      <p className="mt-2 text-muted">
        Describe a market in plain language. We’ll run grounded Google-Search research and build a
        deck of competitive-intelligence cards — one per company, each backed by sources.
      </p>

      {!hasKey && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Demo mode</strong> — you’ll get sample data. Add a free Google AI Studio key in{' '}
            <Link to="/settings" className="underline">
              Settings
            </Link>{' '}
            for live research.
          </span>
        </div>
      )}

      <form onSubmit={onSubmit} className="panel mt-6 space-y-5 p-6">
        <div>
          <label className="label" htmlFor="prompt">
            Market
          </label>
          <textarea
            id="prompt"
            className="input min-h-24 text-base"
            placeholder="e.g. Direct-to-consumer Christian apparel brands"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            autoFocus
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPrompt(ex)}
                className="chip border-border text-muted hover:border-primary/50 hover:text-content"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="region">
            <span className="inline-flex items-center gap-1.5">
              <Globe2 className="h-4 w-4" /> Region <span className="text-muted">(optional)</span>
            </span>
          </label>
          <input
            id="region"
            className="input"
            placeholder="e.g. California, USA"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-lg border border-negative/40 bg-negative/10 px-3 py-2 text-sm text-negative" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={!prompt.trim()}>
            <Sparkles className="h-4 w-4" />
            {hasKey ? 'Research & build deck' : 'Build sample deck'}
          </button>
        </div>
      </form>
    </div>
  );
}
