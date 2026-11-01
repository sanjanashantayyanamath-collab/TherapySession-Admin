export function normalizeApiError(error) {
  const response = error?.response;
  const data = response?.data;
  return {
    status: response?.status ?? 0,
    code: data?.code ?? 'NETWORK_ERROR',
    message: data?.message ?? 'Unable to complete the request.',
    details: data?.details,
  };
}

export function applyFieldErrors(error, setError) {
  for (const detail of error?.details ?? []) {
    const path = Array.isArray(detail.path) ? detail.path.join('.') : detail.path;
    if (path) setError(path, { type: 'server', message: detail.message });
  }
}
