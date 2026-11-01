import { forwardRef } from 'react';

export const Input = forwardRef(function Input({ label, error, id, ...props }, ref) {
  return <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor={id}>{label}<input ref={ref} id={id} aria-label={label} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white" aria-invalid={Boolean(error)} {...props} />{error && <span className="mt-1 block text-sm text-red-700">{error}</span>}</label>;
});
