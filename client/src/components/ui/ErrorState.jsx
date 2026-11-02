import { Button } from './Button.jsx';

export function ErrorState({
  message = 'Unable to load this content.',
  onRetry,
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
    >
      <p>{message}</p>
      {onRetry && (
        <Button className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
