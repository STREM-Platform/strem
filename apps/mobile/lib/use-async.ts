/* eslint-disable react-hooks/set-state-in-effect -- data loading legitimately
   sets loading/data/error state when the fetch starts and resolves. */

/** Minimal data-loading hook: fetch on mount, expose loading/error, allow reload. */

import { useCallback, useEffect, useRef, useState } from "react";

import { SessionExpiredError } from "@/lib/api/client";

interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | undefined;
  reload: () => void;
}

export function useAsync<T>(loader: () => Promise<T>): AsyncState<T> {
  const [data, setData] = useState<T | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);
    try {
      setData(await loaderRef.current());
    } catch (err) {
      if (!(err instanceof SessionExpiredError)) {
        setError("Couldn't load this right now. Pull to retry.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: () => void load() };
}
