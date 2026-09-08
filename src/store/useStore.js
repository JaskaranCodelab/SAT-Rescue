import { create } from 'zustand';

const STORAGE_KEYS = {
  history: 'satrescue_history',
  settings: 'satrescue_settings'
};

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return fallback;
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

export const useStore = create((set, get) => ({
  currentPage: 'dashboard',
  setPage: (page) => set({ currentPage: page }),

  workflowStep: 0,
  setWorkflowStep: (step) => set({ workflowStep: step }),
  resetWorkflow: () => set({ workflowStep: 0 }),

  fileInfo: null,
  setFileInfo: (info) => set({ fileInfo: info }),
  clearFile: () =>
    set({
      fileInfo: null,
      workflowStep: 0,
      analysis: null,
      recoveryResult: null,
      recoveryState: 'idle',
      logs: [],
      rows: [],
      recoveredRows: []
    }),

  fileName: null,
  setFileName: (name) => set({ fileName: name }),

  rows: [],
  setRows: (rows) => set({ rows }),

  recoveredRows: [],
  setRecoveredRows: (rows) => set({ recoveredRows: rows }),

  series: [],
  setSeries: (series) => set({ series }),

  analysis: null,
  setAnalysis: (analysis) => set({ analysis }),

  recoveryResult: null,
  setRecoveryResult: (res) => set({ recoveryResult: res }),

  recoveryState: 'idle',
  setRecoveryState: (state) => set({ recoveryState: state }),

  progress: 0,
  setProgress: (progress) => set({ progress }),

  phase: 0,
  setPhase: (phase) => set({ phase }),

  logs: [],
  addLog: (log) => set((s) => ({ logs: [...s.logs, log] })),
  clearLogs: () => set({ logs: [] }),

  isValidated: false,
  setValidated: (validated) => set({ isValidated: validated }),

  history: loadFromStorage(STORAGE_KEYS.history, []),
  addHistory: (entry) => {
    const history = [entry, ...get().history].slice(0, 50);
    saveToStorage(STORAGE_KEYS.history, history);
    set({ history });
  },
  clearHistory: () => {
    saveToStorage(STORAGE_KEYS.history, []);
    set({ history: [] });
  },

  settings: loadFromStorage(STORAGE_KEYS.settings, {
    sensitivity: 'medium',
    corruptionDetection: true,
    autoValidation: true,
    confidenceThreshold: 75,
    theme: 'dark'
  }),
  setSettings: (settings) => {
    saveToStorage(STORAGE_KEYS.settings, settings);
    set({ settings });
  }
}));
