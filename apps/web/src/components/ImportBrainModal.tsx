import { useState, type ChangeEvent } from 'react';
import { AlertTriangle, CheckCircle2, FileJson, UploadCloud } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { parseRepoSnapshot, type ParsedRepoSnapshotResult } from '@mi/contracts';
import { Modal } from '@/components/ui/Modal';
import { useRepository } from '@/lib/repository/RepositoryProvider';
import { useAuth } from '@/lib/auth/AuthContext';

export interface ImportBrainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ImportBrainModal({ open, onOpenChange, onSuccess }: ImportBrainModalProps) {
  const repo = useRepository();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedRepoSnapshotResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setError(null);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string);
        const result = parseRepoSnapshot(raw);
        setParsedResult(result);
      } catch {
        setError('Failed to parse file: Invalid JSON structure.');
        setParsedResult(null);
      }
    };
    reader.onerror = () => {
      setError('Failed to read selected file.');
      setParsedResult(null);
    };
    reader.readAsText(selected);
  };

  const handleImport = async () => {
    if (!parsedResult || parsedResult.validItems === 0) return;

    setIsImporting(true);
    setError(null);

    try {
      if (repo.importBrain) {
        // Desktop / local SQLite brain import
        const ok = await repo.importBrain();
        if (!ok) {
          throw new Error('Failed to import brain into local storage.');
        }
      } else {
        // Web / Sentinel Cloud brain import endpoint
        const token = user?.id;
        const res = await fetch('/api/v1/brain/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            snapshot: parsedResult.snapshot,
            mode: importMode,
          }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || 'Cloud brain import request failed.');
        }
      }

      await queryClient.invalidateQueries();
      setSuccessMessage(`Brain imported successfully! (${parsedResult.validItems} items)`);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onOpenChange(false);
        setFile(null);
        setParsedResult(null);
        setSuccessMessage(null);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Import Research Brain"
      description="Select a .json or .stratemark brain snapshot file to import into your account."
      size="lg"
    >
      <div className="space-y-5">
        {/* File Selection */}
        <div className="rounded-xl border border-dashed border-border p-4 text-center">
          <input
            type="file"
            id="brain-file-input"
            accept=".json,.stratemark"
            onChange={handleFileSelect}
            className="hidden"
          />
          <label
            htmlFor="brain-file-input"
            className="flex cursor-pointer flex-col items-center gap-2 py-2 text-sm text-muted hover:text-content"
          >
            <UploadCloud className="h-8 w-8 text-primary" />
            <span>
              {file ? (
                <strong className="text-content">{file.name}</strong>
              ) : (
                'Click to choose a JSON or .stratemark snapshot file'
              )}
            </span>
          </label>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-negative/40 bg-negative/10 px-3 py-2 text-sm text-negative" role="alert">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success State */}
        {successMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-positive/40 bg-positive/10 px-3 py-2 text-sm text-positive">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Parsed Summary & Options */}
        {parsedResult && (
          <div className="space-y-4 rounded-xl border border-border bg-surface-2 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-content">Snapshot Contents</span>
              <span className="text-xs text-muted">
                {parsedResult.validItems} valid / {parsedResult.totalItems} total
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div className="rounded-lg bg-surface p-2 text-center">
                <div className="font-semibold text-content">{parsedResult.snapshot.markets.length}</div>
                <div className="text-muted">Markets</div>
              </div>
              <div className="rounded-lg bg-surface p-2 text-center">
                <div className="font-semibold text-content">{parsedResult.snapshot.decks.length}</div>
                <div className="text-muted">Decks</div>
              </div>
              <div className="rounded-lg bg-surface p-2 text-center">
                <div className="font-semibold text-content">{parsedResult.snapshot.companies.length}</div>
                <div className="text-muted">Companies</div>
              </div>
              <div className="rounded-lg bg-surface p-2 text-center">
                <div className="font-semibold text-content">{parsedResult.snapshot.cards.length}</div>
                <div className="text-muted">Cards</div>
              </div>
              <div className="rounded-lg bg-surface p-2 text-center">
                <div className="font-semibold text-content">{parsedResult.snapshot.metrics.length}</div>
                <div className="text-muted">Metrics</div>
              </div>
              <div className="rounded-lg bg-surface p-2 text-center">
                <div className="font-semibold text-content">{parsedResult.snapshot.viceClaims.length}</div>
                <div className="text-muted">Vice Claims</div>
              </div>
              <div className="rounded-lg bg-surface p-2 text-center">
                <div className="font-semibold text-content">{parsedResult.snapshot.reports.length}</div>
                <div className="text-muted">Reports</div>
              </div>
              <div className="rounded-lg bg-surface p-2 text-center">
                <div className="font-semibold text-content">{parsedResult.snapshot.threads.length}</div>
                <div className="text-muted">Threads</div>
              </div>
            </div>

            {/* Warnings */}
            {parsedResult.warnings.length > 0 && (
              <div className="space-y-1 rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-600">
                <div className="flex items-center gap-1 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Warnings ({parsedResult.skippedItems} skipped)
                </div>
                <ul className="list-inside list-disc space-y-0.5">
                  {parsedResult.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mode Selection */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold text-content">Import Mode</label>
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="import-mode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                  />
                  <span>Merge with existing cloud data</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="import-mode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                  />
                  <span>Replace all cloud data</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary text-xs"
            onClick={handleImport}
            disabled={!parsedResult || parsedResult.validItems === 0 || isImporting}
          >
            <FileJson className="h-4 w-4" />
            {isImporting ? 'Importing...' : 'Import Brain'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
