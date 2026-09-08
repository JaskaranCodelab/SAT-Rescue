import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore.js';
import WorkflowStepper from '../components/WorkflowStepper.jsx';
import FileUpload from '../components/FileUpload.jsx';
import DemoDataSelector from '../components/DemoDataSelector.jsx';
import RecoveryEngine from '../components/RecoveryEngine.jsx';
import RecoveryProgress from '../components/RecoveryProgress.jsx';
import RecoveryMetrics from '../components/RecoveryMetrics.jsx';
import TelemetryChart from '../components/TelemetryChart.jsx';
import LiveLogs from '../components/LiveLogs.jsx';
import ValidationPanel from '../components/ValidationPanel.jsx';
import ComparisonTable from '../components/ComparisonTable.jsx';
import DownloadPanel from '../components/DownloadPanel.jsx';
import { useRecovery } from '../hooks/useRecovery.js';

export default function RecoverData() {
  const {
    workflowStep, setWorkflowStep, fileInfo, clearFile,
    fileName, rows, series, analysis, recoveryResult, recoveryState,
    progress, phase, logs, validated, recoveredRows
  } = useStore();
  const { runRecovery } = useRecovery();
  const [revealed, setRevealed] = useState(0);

  const canStart = Boolean(fileInfo) && recoveryState !== 'running';
  const isComplete = recoveryState === 'complete';
  const isRunning = recoveryState === 'running';
  const visibleCount = isRunning || isComplete ? Math.max(revealed, Math.floor((rows?.length || 0) * Math.max(progress, 1) / 100)) : Infinity;

  const reset = () => {
    clearFile();
    setWorkflowStep(0);
    setRevealed(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => { setWorkflowStep(0); setRevealed(0); }} className="text-xs text-slate-400 hover:text-primary">
          ← Back to upload
        </button>
        {isComplete && (
          <span className="text-xs text-slate-400">{rows?.length || 0} packets processed</span>
        )}
      </div>

      <WorkflowStepper currentStep={workflowStep} />

      {workflowStep === 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-2 gap-6">
          <FileUpload />
          <DemoDataSelector />
        </motion.div>
      )}

      {workflowStep >= 1 && (
        <div className="space-y-6">
          <RecoveryEngine
            original={series}
            recovered={recoveryResult?.data ? seriesView(recoveryResult.data, analysis) : undefined}
            analysis={analysis}
          />

          {recoveryState === 'analyzed' && !isComplete && (
            <div className="flex justify-center">
              <button
                onClick={runRecovery}
                disabled={!canStart}
                className="btn-ai px-8 py-3 text-base shadow-glow"
              >
                <Play size={18} />
                Start AI Recovery
              </button>
            </div>
          )}

          {isRunning && (
            <RecoveryProgress progress={progress} phase={phase} />
          )}

          <RealTimeRecommendation
            running={isRunning}
            complete={isComplete}
            progress={progress}
            analysis={analysis}
          />

          {isComplete && recoveryResult && (
            <>
              <DownloadPanel
                result={recoveryResult}
                fileName={fileName}
                onReset={reset}
              />
              <RecoveryMetrics result={recoveryResult} analysis={analysis} />
              <RecoveryProgress progress={100} phase={5} />
            </>
          )}

          {rows && rows.length > 0 && (
            <ComparisonTable
              originalRows={rows}
              recoveredRows={recoveredRows && recoveredRows.length ? recoveredRows : recoveryResult?.data}
              visibleCount={visibleCount}
              analysis={analysis}
            />
          )}

          {isComplete && recoveryResult && (
            <TelemetryChart original={series} recovered={seriesView(recoveryResult.data, analysis)} />
          )}

          {(isRunning || isComplete) && logs.length > 0 && (
            <LiveLogs logs={logs} />
          )}

          {validated && recoveryResult && (
            <ValidationPanel checks={recoveryResult.checks} passed={recoveryResult.validated} />
          )}

          {isComplete && recoveryResult && (
            <div className="flex justify-center">
              <button onClick={reset} className="btn-ghost px-6 py-2.5">
                <RefreshCw size={16} />
                New Recovery
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RealTimeRecommendation({ running, complete, progress, analysis }) {
  if (complete) return null;
  if (running) {
    return (
      <div className="card p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3">
            <span className="absolute inline-flex h-3 w-3 rounded-full bg-ai animate-ping opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-ai" />
          </span>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Reconstructing in real time — recovered packets stream below as they complete.
          </p>
        </div>
        <span className="text-sm font-bold text-ai">{Math.round(progress)}%</span>
      </div>
    );
  }
  if (analysis && (analysis.missingCount > 0 || analysis.corruptCount > 0)) {
    return (
      <div className="card p-5 flex items-center justify-between gap-4 border-ai/20 bg-ai/5">
        <p className="text-sm text-slate-500 dark:text-slate-300">
          <span className="font-bold text-error">{analysis.missingCount + analysis.corruptCount}</span> issues detected in{' '}
          <span className="font-bold text-ai">{Object.values(analysis.fields || {}).filter((f) => f.missingCount > 0 || f.corruptCount > 0).length}</span> fields.
          Run the AI recovery engine to reconstruct them.
        </p>
        <span className="text-xs text-ai whitespace-nowrap">Ready to recover</span>
      </div>
    );
  }
  return null;
}

function seriesView(rows, analysis) {
  if (!rows || !rows.length) return [];
  let primary = null;
  const fields = Object.values(analysis?.fields || {}).filter((f) => f.numeric);
  if (fields.length) {
    primary = fields[0].name;
  } else {
    const first = rows[0];
    if (first) primary = Object.keys(first).find((k) => k !== '__ecc' && Number.isFinite(Number(first[k])));
  }
  return rows.map((r) => {
    const n = primary && r ? Number(r[primary]) : NaN;
    return Number.isFinite(n) ? n : null;
  });
}