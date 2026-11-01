import { useQuery } from "@tanstack/react-query";
import { api } from "./http-client";

export function useApi<T>(path: string | null) {
  return useQuery<T, Error>({
    queryKey: [path],
    queryFn: () => api<T>(path!),
    enabled: path !== null,
    retry: 1,
  });
}
