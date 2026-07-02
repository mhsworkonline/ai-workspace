"use client";

import { useQuery } from "@tanstack/react-query";
import { getTemplate, listTemplates } from "@/lib/api/templates";

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: listTemplates,
    staleTime: 5 * 60_000,
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["template", id],
    queryFn: () => getTemplate(id as string),
    enabled: Boolean(id),
  });
}
