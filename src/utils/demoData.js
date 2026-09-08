

export const demoDatasets = [
  {
    id: 'corrupted',
    name: 'Corrupted Telemetry',
    file: 'corrupted-telemetry.csv',
    url: '/demo-data/corrupted-telemetry.csv',
    type: 'csv',
    problems: ['Corrupted values', 'Random spikes', 'Invalid packets', 'Signal noise'],
    size: '4.1 KB'
  },
  {
    id: 'missing',
    name: 'Missing Packets',
    file: 'missing-packets.json',
    url: '/demo-data/missing-packets.json',
    type: 'json',
    problems: ['Missing packets', 'Null values', 'Empty values', 'Broken sequence'],
    size: '7.7 KB'
  },
  {
    id: 'noisy',
    name: 'Noisy Signal',
    file: 'noisy-signal.csv',
    url: '/demo-data/noisy-signal.csv',
    type: 'csv',
    problems: ['Signal interference', 'Weak signal', 'Random spikes', 'Distortion'],
    size: '1.9 KB'
  }
];
