import { create } from 'zustand';

type Phase = 'idle' | 'planning' | 'structure' | 'coding' | 'sync';
type Tab = 'init' | 'workflow' | 'database' | 'preview' | 'evolution' | 'billing';

interface WorkflowGraph {
  nodes: Array<{ id: string; label: string; x: number; y: number; type?: string; style?: any }>;
  edges: Array<{ id: string; source: string; target: string; animated?: boolean }>;
}

interface ProjectState {
  isInitializing: boolean;
  projectName: string | null;
  repoUrl: string | null;
  previewUrl: string | null;
  activePhase: Phase;
  highlightedTab: Tab;
  autoBuildPrompt: string | null;
  workflow: WorkflowGraph;
  generatedSQL: string | null;
  setInitializing: (status: boolean) => void;
  setProjectDetails: (name: string, repoUrl: string) => void;
  setPreviewUrl: (url: string | null) => void;
  setActivePhase: (phase: Phase) => void;
  setHighlightedTab: (tab: Tab) => void;
  setAutoBuildPrompt: (prompt: string | null) => void;
  setWorkflow: (graph: WorkflowGraph) => void;
  setGeneratedSQL: (sql: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  isInitializing: false,
  projectName: null,
  repoUrl: null,
  previewUrl: null, // In real app, this would be the Vercel deployment URL
  activePhase: 'idle',
  highlightedTab: 'init',
  autoBuildPrompt: null,
  workflow: { nodes: [], edges: [] },
  generatedSQL: null,
  setInitializing: (status) => set({ isInitializing: status }),
  setProjectDetails: (name, repoUrl) => set({ projectName: name, repoUrl: repoUrl }),
  setPreviewUrl: (url) => set({ previewUrl: url }),
  setActivePhase: (phase) => set({ activePhase: phase }),
  setHighlightedTab: (tab) => set({ highlightedTab: tab }),
  setAutoBuildPrompt: (prompt) => set({ autoBuildPrompt: prompt }),
  setWorkflow: (graph) => set({ workflow: graph }),
  setGeneratedSQL: (sql) => set({ generatedSQL: sql }),
}));
