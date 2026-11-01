import { Component } from 'react';
import { Button } from './ui/Button.jsx';

export class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (!this.state.hasError) return this.props.children;
    return <main className="grid min-h-screen place-items-center p-6"><div className="text-center"><h1 className="text-2xl font-semibold">Something went wrong</h1><p className="mt-2 text-slate-600 dark:text-slate-300">Please reload this page and try again.</p><Button className="mt-4" onClick={() => window.location.reload()}>Reload</Button></div></main>;
  }
}
