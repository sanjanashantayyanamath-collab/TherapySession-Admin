import { Lock, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useNote, useDeleteNote, useSaveNote } from '../api/notes.js';
import { normalizeApiError } from '../api/errors.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Button } from '../components/ui/Button.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { formatDateTime } from './dateUtils.js';

export function NotesDrawer({ appointmentId, open, onClose }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const canRead = user?.role === 'counsellor';
  const { data, isLoading, isError, error, refetch } = useNote(
    appointmentId,
    open && canRead,
  );
  const save = useSaveNote();
  const remove = useDeleteNote();
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const timer = useRef(null);

  const lock = useCallback(() => {
    setContent('');
    setSavedContent('');
    client.removeQueries({ queryKey: ['notes', appointmentId] });
    onClose();
  }, [appointmentId, client, onClose]);

  useEffect(() => {
    if (!open || !canRead) return undefined;
    if (data) {
      setContent(data.content || '');
      setSavedContent(data.content || '');
    } else if (error?.response?.status === 404) {
      setContent('');
      setSavedContent('');
    }
    const reset = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(lock, 5 * 60_000);
    };
    const events = ['keydown', 'pointerdown', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, reset));
    reset();
    const visibility = () => {
      if (document.hidden) timer.current = setTimeout(lock, 2 * 60_000);
      else reset();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clearTimeout(timer.current);
      events.forEach((event) => window.removeEventListener(event, reset));
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [open, canRead, data, error, lock]);

  useEffect(() => {
    if (open && !canRead) lock();
  }, [open, canRead, lock]);

  if (!open || !canRead) return null;
  const dirty = content !== savedContent;
  const close = () => {
    if (
      dirty &&
      !window.confirm('You have unsaved changes. Close without saving?')
    )
      return;
    lock();
  };
  const saveContent = async () => {
    try {
      await save.mutateAsync({ id: appointmentId, content });
      setSavedContent(content);
      toast.success('Private note saved.');
    } catch (requestError) {
      toast.error(normalizeApiError(requestError).message);
    }
  };
  const deleteContent = async () => {
    try {
      await remove.mutateAsync(appointmentId);
      setContent('');
      setSavedContent('');
      setConfirmDelete(false);
      toast.success('Private note deleted.');
    } catch (requestError) {
      const normalized = normalizeApiError(requestError);
      if (normalized.status === 404) {
        setContent('');
        setSavedContent('');
        setConfirmDelete(false);
        return;
      }
      toast.error(normalized.message);
    }
  };

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-label="Private notes"
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
    >
      <header className="flex items-start justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Lock size={18} /> Private notes
          </h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Only you can read this. It is encrypted at rest.
          </p>
        </div>
        <Button
          variant="ghost"
          aria-label="Close private notes"
          onClick={close}
        >
          ×
        </Button>
      </header>
      <div className="mt-5 flex-1">
        {isLoading && <Skeleton className="h-48 w-full" />}
        {isError && error?.response?.status !== 404 && (
          <ErrorState
            message="Unable to load this note."
            onRetry={() => refetch()}
          />
        )}
        {!isLoading && (!isError || error?.response?.status === 404) && (
          <>
            <textarea
              aria-label="Private note content"
              value={content}
              maxLength={5000}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              autoCapitalize="off"
              onChange={(event) => setContent(event.target.value)}
              className="h-64 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
            />
            <div className="mt-1 flex justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>{content.length}/5000</span>
              {data?.retainUntil && (
                <span>Auto-deleted on {formatDateTime(data.retainUntil)}</span>
              )}
            </div>
          </>
        )}
      </div>
      <p className="border-t border-slate-200 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
        Privacy notice: do not include identifying information.
      </p>
      <div className="mt-4 flex justify-between">
        <Button
          variant="ghost"
          disabled={!data || remove.isPending}
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 size={16} /> Delete note
        </Button>
        <Button disabled={!dirty || save.isPending} onClick={saveContent}>
          Save
        </Button>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete private note"
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteContent}
      >
        Delete this private note permanently?
      </ConfirmDialog>
    </aside>
  );
}
