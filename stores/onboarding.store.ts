"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface OnboardingState {
  goal: string | null;
  workspaceId: string | null;
  projectId: string | null;
  workflowId: string | null;
  runId: string | null;
  setGoal: (goal: string) => void;
  setWorkspaceId: (id: string) => void;
  setProjectId: (id: string) => void;
  setWorkflowId: (id: string) => void;
  setRunId: (id: string) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      goal: null,
      workspaceId: null,
      projectId: null,
      workflowId: null,
      runId: null,
      setGoal: (goal) => set({ goal }),
      setWorkspaceId: (workspaceId) => set({ workspaceId }),
      setProjectId: (projectId) => set({ projectId }),
      setWorkflowId: (workflowId) => set({ workflowId }),
      setRunId: (runId) => set({ runId }),
      reset: () =>
        set({ goal: null, workspaceId: null, projectId: null, workflowId: null, runId: null }),
    }),
    { name: "aiw-onboarding", storage: createJSONStorage(() => sessionStorage) }
  )
);
