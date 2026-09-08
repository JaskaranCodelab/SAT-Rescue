import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, AlertTriangle, RefreshCw, FileCheck2 } from 'lucide-react';
import { useStore } from '../store/useStore.js';
import { handleFileProcess } from '../utils/fileHandler.js';

export default function FileUpload() {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const { fileInfo, setFileInfo, clearFile } = useStore();

  const onFile = async (file) => {
    await handleFileProcess(file);
  };

  return (
    <div>
      <AnimatePresence mode="wait">
        {!fileInfo ? (
          <motion.div
            key="drop"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) onFile(f);
            }}
            className={`card p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dragOver ? 'border-primary ring-2 ring-primary/30' : ''
            }`}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Upload telemetry file"
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          >
            <motion.div
              animate={{ y: dragOver ? -6 : 0 }}
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4"
            >
              <UploadCloud size={30} />
            </motion.div>
            <p className="text-sm font-semibold text-dark dark:text-white">
              Drag & drop your telemetry file
            </p>
            <p className="text-xs text-slate-400 mt-1">
              or click to browse — supports .csv, .json, .txt
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.json,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </motion.div>
        ) : (
          <motion.div
            key="info"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card p-5 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-error/10 text-error">
                <FileText size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-dark dark:text-white break-all">{fileInfo.name}</p>
                <p className="text-xs text-slate-400">{fileInfo.size}</p>
                <div className="flex items-center gap-1.5 mt-1 text-xs font-medium text-error">
                  <AlertTriangle size={13} />
                  Corrupted / Incomplete
                </div>
              </div>
            </div>
            <button onClick={clearFile} className="btn-outline text-xs">
              <RefreshCw size={14} />
              Replace File
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FileBadge({ name, size, ok }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {ok ? <FileCheck2 size={14} className="text-success" /> : <AlertTriangle size={14} className="text-error" />}
      <span className="font-medium text-dark dark:text-white">{name}</span>
      <span className="text-slate-400">· {size}</span>
    </div>
  );
}
