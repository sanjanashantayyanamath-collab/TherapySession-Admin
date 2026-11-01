export function Button({ variant = 'primary', className = '', ...props }) {
  const styles = variant === 'ghost' ? 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800' : 'bg-brand-600 text-white hover:bg-brand-700';
  return <button className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-950 ${styles} ${className}`} {...props} />;
}
