export function Skeleton({ className = 'h-5 w-full' }) { return <div aria-hidden="true" className={`animate-pulse rounded bg-slate-200 dark:bg-slate-800 ${className}`} />; }
