import { Link } from 'react-router-dom';
export function NotFoundPage() { return <main className="grid min-h-screen place-items-center p-6 text-center"><div><h1 className="text-4xl font-bold">Page not found</h1><Link className="mt-4 inline-block text-brand-700 underline" to="/">Return to dashboard</Link></div></main>; }
