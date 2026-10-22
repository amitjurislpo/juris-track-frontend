import { useMemo } from "react";
import { useSearchParams } from "react-router";

/** Search params as a plain object (first value of each). */
export function useSearchRecord(): Record<string, string> {
  const [searchParams] = useSearchParams();
  const searchString = searchParams.toString();
  return useMemo(() => Object.fromEntries(new URLSearchParams(searchString).entries()), [searchString]);
}
