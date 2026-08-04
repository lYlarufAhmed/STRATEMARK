import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { createGeminiClient } from '@mi/research';
import { looksLikeGeminiKey, sanitizeApiKey, useApiKey } from '@/lib/settings/apiKey';
import { useRepository } from '@/lib/repository/RepositoryProvider';

type TestState = { status: 'idle' | 'testing' | 'ok' | 'fail'; detail?: string };

export default function SettingsPage() {
  const repo = useRepository();
  const { apiKey, model, hasKey, setApiKey, setModel, clear } = useApiKey();
  const [draft, setDraft] = useState(apiKey);
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState<TestState>({ status: 'idle' });
  const [brainStatus, setBrainStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });

  const handleExport = async () => {
    if (!repo.exportBrain) return;
    setBrainStatus({ type: 'loading', message: 'Exporting research brain snapshot…' });
    try {
      const ok = await repo.exportBrain();
      if (ok) {
        setBrainStatus({ type: 'success', message: 'Research brain exported successfully!' });
      } else {
        setBrainStatus({ type: 'idle' });
      }
    } catch {
      setBrainStatus({ type: 'error', message: 'Failed to export research brain snapshot.' });
    }
  };

  const handleImport = async () => {
    if (!repo.importBrain) return;
    setBrainStatus({ type: 'loading', message: 'Importing research brain snapshot…' });
    try {
      const ok = await repo.importBrain();
      if (ok) {
        setBrainStatus({
          type: 'success',
          message: 'Research brain imported successfully! Reloading application data…',
        });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setBrainStatus({ type: 'idle' });
      }
    } catch {
      setBrainStatus({
        type: 'error',
        message: 'Failed to import research brain snapshot. Invalid file format.',
      });
    }
  };

  const save = () => {
    setApiKey(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  /** Real grounded round-trip so the user knows the key works before researching. */
  const testKey = async () => {
    const key = sanitizeApiKey(draft);
    if (!key) return;
    setTest({ status: 'testing' });
    try {
      const client = createGeminiClient({ apiKey: key, model: model || undefined });
      const res = await client.ground(
        'In one short sentence, what is today\'s date according to search results?',
      );
      setTest({
        status: 'ok',
        detail: `Grounded search returned ${res.citations.length} source${res.citations.length === 1 ? '' : 's'}.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTest({
        status: 'fail',
        detail: /404/.test(msg)
          ? 'That model isn’t available to your account. Clear the model override or try another.'
          : /ISO-8859-1|headers.*RequestInit/i.test(msg)
            ? 'Your key contained an invisible character (a smart quote or non-breaking space picked up while copying). We’ve cleaned it — press Test key again.'
            : /API key not valid|400|403/.test(msg)
              ? 'Key rejected by Google. Check you copied it fully from AI Studio.'
              : /429/.test(msg)
                ? 'Rate limited (429). Your key works, but you’ve hit the free-tier quota.'
                : /Failed to fetch|NetworkError/i.test(msg)
                  ? 'Couldn’t reach Google. Check your connection, VPN, or ad-blocker.'
                  : msg.slice(0, 180),
      });
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-content">Settings</h1>
      <p className="mt-1 text-sm text-muted">Connect Gemini to run live grounded research.</p>

      <div className="panel mt-6 space-y-4 p-6">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary-ink" />
          <h2 className="font-display text-lg text-content">Google AI Studio API key</h2>
          {hasKey && (
            <span className="chip border-emerald-300 bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Connected
            </span>
          )}
        </div>

        <div>
          <label className="label" htmlFor="key">
            API key
          </label>
          <input
            id="key"
            type="password"
            className="input font-mono"
            placeholder="AIza…"
            value={draft}
            // Sanitize as it arrives — a pasted key routinely carries invisible
            // characters that would otherwise break the request silently.
            onChange={(e) => setDraft(sanitizeApiKey(e.target.value))}
            onPaste={(e) => {
              e.preventDefault();
              setDraft(sanitizeApiKey(e.clipboardData.getData('text')));
            }}
            autoComplete="off"
            spellCheck={false}
          />
          {draft.length > 0 && !looksLikeGeminiKey(draft) && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              That doesn’t look like a complete AI Studio key (they’re a long string of letters,
              numbers, dashes and underscores). Try copying it again from AI Studio.
            </p>
          )}
          <p className="mt-2 text-xs text-muted">
            Get a free key at{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary-ink hover:underline"
            >
              aistudio.google.com/app/apikey <ExternalLink className="h-3 w-3" />
            </a>
            . Grounded Google Search is free on the Flash models (about 500 requests/day). Your key
            stays in this browser and is sent only to Google.
          </p>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer text-muted hover:text-content">
            Advanced: model override
          </summary>
          <div className="mt-2">
            <input
              className="input font-mono"
              placeholder="gemini-flash-latest (default)"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted">
              Leave blank for the default rolling alias, which always points at the current Flash
              model. Override only if you want a specific version (e.g. a Gemini 3.x model).
            </p>
          </div>
        </details>

        {test.status !== 'idle' && (
          <div
            className={
              test.status === 'ok'
                ? 'flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800'
                : test.status === 'fail'
                  ? 'flex items-start gap-2 rounded-lg border border-negative/40 bg-red-50 px-3 py-2 text-sm text-red-800'
                  : 'flex items-start gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted'
            }
            role="status"
          >
            {test.status === 'testing' && <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />}
            {test.status === 'ok' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            {test.status === 'fail' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>
              {test.status === 'testing' && 'Testing your key against Gemini…'}
              {test.status === 'ok' && <><strong>Key works.</strong> {test.detail}</>}
              {test.status === 'fail' && <><strong>Key test failed.</strong> {test.detail}</>}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3 border-t border-border pt-4">
          <button type="button" className="btn-primary" onClick={save} disabled={!draft.trim()}>
            {saved ? 'Saved ✓' : 'Save key'}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={testKey}
            disabled={!draft.trim() || test.status === 'testing'}
          >
            {test.status === 'testing' ? 'Testing…' : 'Test key'}
          </button>
          {hasKey && (
            <button
              type="button"
              className="btn-ghost text-negative"
              onClick={() => {
                clear();
                setDraft('');
              }}
            >
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          Your key is stored only in this browser and sent only to Google’s API. It is never logged
          or shared. In the desktop build it moves to the OS keychain.
        </div>
      </div>

      <div className="panel mt-6 space-y-4 p-6">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary-ink" />
          <h2 className="font-display text-lg text-content">Research Brain Backup & Portability</h2>
        </div>
        <p className="text-sm text-muted">
          Export your complete local research database (markets, decks, cards, metrics, reports, and Q&A research threads) or import a snapshot backup file.
        </p>

        {brainStatus.type !== 'idle' && (
          <div
            className={
              brainStatus.type === 'success'
                ? 'flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800'
                : brainStatus.type === 'error'
                  ? 'flex items-center gap-2 rounded-lg border border-negative/40 bg-red-50 px-3 py-2 text-sm text-red-800'
                  : 'flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted'
            }
          >
            {brainStatus.type === 'loading' && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
            {brainStatus.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {brainStatus.type === 'error' && <AlertTriangle className="h-4 w-4 shrink-0" />}
            <span>{brainStatus.message}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            className="btn-primary flex items-center gap-2"
            onClick={handleExport}
            disabled={brainStatus.type === 'loading'}
          >
            <Download className="h-4 w-4" /> Export Brain Snapshot
          </button>
          <button
            type="button"
            className="btn-secondary flex items-center gap-2"
            onClick={handleImport}
            disabled={brainStatus.type === 'loading'}
          >
            <Upload className="h-4 w-4" /> Import Brain Snapshot
          </button>
        </div>
      </div>

      <div className="panel mt-6 space-y-4 p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary-ink" />
          <h2 className="font-display text-lg text-content">Stratemark License & Subscription</h2>
        </div>
        <p className="text-sm text-muted">
          Manage your Stratemark Pro subscription powered by Paddle.
        </p>
        <div className="rounded-lg border border-border bg-surface-2 p-4 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-content">License Status:</span>{' '}
              <span className="text-emerald-700 font-medium">Free / Community Edition</span>
            </div>
            <a
              href="https://stratemark.app"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs"
            >
              Upgrade via Paddle <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}
