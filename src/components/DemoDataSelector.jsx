import { motion } from 'framer-motion';
import { FolderOpen, ChevronRight } from 'lucide-react';
import { demoDatasets } from '../utils/demoData.js';
import { loadDemoDataset } from '../utils/fileHandler.js';

export default function DemoDataSelector() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-dark dark:text-white mb-3">Try Demo Data</h3>
      <div className="space-y-3">
        {demoDatasets.map((d) => (
          <DemoCard key={d.id} demo={d} />
        ))}
      </div>
    </div>
  );
}

function DemoCard({ demo }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="card card-hover p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ai/10 text-ai shrink-0">
          <FolderOpen size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-dark dark:text-white">{demo.name}</p>
          <p className="text-xs text-slate-400 font-mono">{demo.file}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {demo.problems.map((p) => (
              <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-error/10 text-error">
                {p}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={() => loadDemoDataset(demo)}
          className="btn-ai text-xs shrink-0"
          aria-label={`Load ${demo.name}`}
        >
          Load Demo
          <ChevronRight size={14} />
        </button>
      </div>
    </motion.div>
  );
}
