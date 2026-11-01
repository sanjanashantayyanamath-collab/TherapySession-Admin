import { Link } from 'react-router-dom';

export function PrivacyBanner() {
  return <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">Privacy first: only pseudonymous client codes are collected. <Link className="font-semibold text-brand-700 underline dark:text-brand-50" to="/privacy">Read the privacy notice</Link>.</footer>;
}
