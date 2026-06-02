import { useCallback, useEffect, useState } from 'react';

const json = (r) => r.json();
const body = (method) => (url, data) =>
  fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  }).then(json);

export const api = {
  get: (url) => fetch(url).then(json),
  post: body('POST'),
  patch: body('PATCH'),
  put: body('PUT'),
  del: (url) => fetch(url, { method: 'DELETE' }).then(json),
};

// Local date as YYYY-MM-DD.
export const today = () => new Date().toLocaleDateString('en-CA');

// Fetch a list and expose a reload + direct setter.
export function useList(url) {
  const [items, setItems] = useState([]);
  const reload = useCallback(() => api.get(url).then(setItems), [url]);
  useEffect(() => {
    reload();
  }, [reload]);
  return [items, reload, setItems];
}
