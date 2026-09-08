import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore.js';
import { MLRecoveryService } from '../services/mlRecoveryService.js';

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildLogs(result, analysis) {
  const logs = [];
  const push = (level, message) => logs.push({ level, message });

  push('info', 'Initializing recovery engine');
  push('info', `Reading ${analysis.totalPackets} telemetry packets across ${analysis.headers?.length || 0} fields`);

  let missing = analysis.missingCount || 0;
  let corrupt = analysis.corruptCount || 0;
  if (missing > 0) {
    push('warning', `Detected ${missing} missing values across ${countFieldsWith(analysis, 'missingCount')} fields`);
  } else {
    push('info', 'No missing packets detected');
  }
  if (corrupt > 0) {
    push('error', `Detected ${corrupt} corrupted / out-of-range values`);
  } else {
    push('info', 'No corrupted values detected');
  }

  push('info', 'Applying physics-based field bounds & robust statistics');
  push('info', 'Learning cross-field correlations for prediction');
  push('info', 'Fitting linear regression predictors per field');
  push('info', 'Running Kalman smoother state estimation');
  push('info', 'Reconstructing missing packets via polynomial interpolation + prediction ensemble');
  push('success', `Recovered ${result.missingRecovered} missing / ${result.corruptRepaired} corrupted values`);

  push('info', `Integrity improved ${result.integrityBefore.toFixed(1)}% -> ${result.integrityAfter.toFixed(1)}%`);
  push('info', 'Embedding CRC-16 / CRC-32 + Hamming(7,4) ECC checksums per packet');
  push('success', 'Recovery paths complete');

  return logs;
}

function countFieldsWith(analysis, key) {
  const fields = analysis.fields || {};
  return Object.values(fields).filter((f) => (f[key] || 0) > 0).length;
}

export function useRecovery() {
  const timers = useRef([]);

  const cleanupTimers = () => {
    timers.current.forEach((t) => {
      try { clearInterval(t); } catch (e) {}
      try { clearTimeout(t); } catch (e) {}
    });
    timers.current = [];
  };

  useEffect(() => () => cleanupTimers(), []);

  const runRecovery = async () => {
    const store = useStore.getState();
    const { rows, series, analysis, settings, fileName } = store;
    const origin = rows && rows.length > 0 ? rows : seriesToRows(series);
    if (!origin || origin.length === 0) return;

    store.setRecoveryState('running');
    store.setProgress(0);
    store.setPhase(1);
    store.clearLogs();
    store.setValidated(false);
    store.setRecoveredRows([]);

    const service = new MLRecoveryService(settings);
    const result = service.recover(origin, analysis);
    const logs = buildLogs(result, analysis);

    let current = 0;
    const progressInterval = setInterval(() => {
      current += 2 + Math.random() * 3;
      if (current >= 100) current = 100;
      store.setProgress(current);
      const p = current < 25 ? 1 : current < 50 ? 2 : current < 75 ? 3 : current < 95 ? 4 : 5;
      store.setPhase(p);
      if (current >= 100) clearInterval(progressInterval);
    }, 120);

    const runLogs = async () => {
      for (let i = 0; i < logs.length; i++) {
        store.addLog({ time: nowTime(), ...logs[i] });
        await sleep(220 + Math.random() * 120);
      }
    };

    const totalMs = Math.max(logs.length * 300, 2600);
    const finalizeTimer = setTimeout(() => {
      store.setProgress(100);
      store.setPhase(5);

      const validation = service.validate(result);
      const report = service.generateReport(result, { name: fileName, originalAnalysis: analysis }, validation);

      store.setRecoveryResult({
        ...result,
        validated: validation.passed,
        checks: validation.checks,
        report
      });
      store.setRecoveredRows(result.data);
      store.setValidated(true);
      store.setRecoveryState('complete');
      store.setWorkflowStep(5);
      store.addHistory({
        id: Date.now(),
        fileName: fileName || 'unknown',
        date: new Date().toISOString(),
        missingData: analysis?.missingCount || 0,
        corruptData: analysis?.corruptCount || 0,
        recoveredCount: result.recoveredCount || 0,
        integrity: result.integrityAfter || 0,
        confidence: result.confidence || 0,
        status: 'Recovered',
        resultData: result.data,
        exportRows: result.exportRows,
        originalRows: result.original,
        analysis: result.analysis,
        checks: validation.checks,
        report
      });
    }, totalMs);

    timers.current.push(progressInterval, finalizeTimer);
    runLogs();
  };

  return { runRecovery, cleanup: cleanupTimers };
}

function seriesToRows(series) {
  return (series || []).map((v, i) => ({ id: i + 1, value: v }));
}