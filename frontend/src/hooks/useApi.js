import { useEffect, useState, useCallback, useRef } from 'react';

export function useApi(callFn, auto = true, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(auto);
  const [error, setError] = useState(null);
  const callRef = useRef(callFn);
  callRef.current = callFn;

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const r = await callRef.current(...args);
      setData(r);
      return r;
    } catch (e) {
      setError(e?.error || { message: e?.message || 'Request failed' });
      setData(null);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auto) execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, auto]);

  return { data, loading, error, execute, setData, setLoading };
}
