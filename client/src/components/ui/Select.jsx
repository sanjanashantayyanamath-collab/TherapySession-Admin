import { forwardRef } from 'react';

export const Select = forwardRef(function Select(
  { label, id, children, ...props },
  ref,
) {
  return (
    <label
      className="block text-sm font-medium text-slate-700 dark:text-slate-200"
      htmlFor={id}
    >
      {label}
      <select
        ref={ref}
        id={id}
        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
        {...props}
      >
        {children}
      </select>
    </label>
  );
});
