import { useEffect } from 'react';

export function Modal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);
  if (!open) return null;
  return <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"><div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button aria-label="Close dialog" onClick={onClose}>×</button></div><div className="mt-4">{children}</div></div></div>;
}
