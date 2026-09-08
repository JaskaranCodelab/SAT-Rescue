import { useStore } from '../store/useStore.js';
import { parseCSV, parseJSON, fileToText, extractNumericSeries } from '../services/dataProcessor.js';
import { MLRecoveryService } from '../services/mlRecoveryService.js';

async function processText(text, ext, meta) {
  let rows;
  if (ext === 'json') {
    rows = parseJSON(text).rows;
  } else {
    rows = parseCSV(text).rows;
  }

  const store = useStore.getState();
  const service = new MLRecoveryService(store.settings);
  const analysis = service.analyze(rows);
  const series = extractNumericSeries(rows, 'temperature');

  store.setFileName(meta.name);
  store.setFileInfo({
    name: meta.name,
    size: meta.size,
    type: ext,
    source: meta.source || 'upload'
  });
  store.setRows(rows);
  store.setSeries(series);
  store.setAnalysis(analysis);
  store.setWorkflowStep(1);
  store.setRecoveryState('analyzed');
  store.clearLogs();
  return { rows, series, analysis };
}

export async function handleFileProcess(file, meta = {}) {
  const text = await fileToText(file);
  const ext = file.name.split('.').pop()?.toLowerCase();
  return processText(text, ext, {
    name: file.name,
    size: meta.size || file.size,
    source: meta.source || 'upload'
  });
}

export async function loadDemoDataset(meta) {
  const res = await fetch(meta.url);
  const text = await res.text();
  const ext = meta.type === 'json' ? 'json' : 'csv';
  return processText(text, ext, {
    name: meta.file,
    size: meta.size,
    source: 'demo'
  });
}