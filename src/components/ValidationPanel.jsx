import { motion } from 'framer-motion';
import { CheckCircle2, ShieldCheck, XCircle, ShieldAlert } from 'lucide-react';

export default function ValidationPanel({ checks, passed }) {
  const details = checks || {};
  const items = [
    { label: 'CRC-16 / CRC-32 Check', key: 'crc', sub: details.crcErrors != null ? `${details.crcErrors || 0} errors` : null },
    { label: 'ECC — Hamming(7,4) Code', key: 'ecc', sub: details.eccCorrected != null ? `${details.eccCorrected || 0} corrected · ${details.eccFailed || 0} uncorrectable` : null },
    { label: 'Packet Sequence Verified', key: 'packetSequence', sub: null },
    { label: 'File Integrity Verified', key: 'fileIntegrity', sub: details.checked != null ? `${details.checked || 0} packets checked` : null }
  ];

  return (
    <div className="card p-5">
      <div className="flex flex-col items-center text-center mb-5">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`flex h-14 w-14 items-center justify-center rounded-full mb-4 ${
            passed ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
          }`}
        >
          {passed ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
        </motion.div>
        <h3 className={`text-lg font-bold ${passed ? 'text-success' : 'text-error'}`}>
          {passed ? 'ECC / CRC Validation Complete' : 'Validation Needs Attention'}
        </h3>
        <p className="text-sm text-slate-400 mt-1 max-w-md">
          {passed
            ? 'Every packet passed CRC-16 integrity and Hamming(7,4) forward-error-correction validation.'
            : 'Some packets have uncorrectable errors. Review the recovered output below.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
        {items.map((item, i) => {
          const ok = details[item.key];
          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                ok ? 'bg-success/5 text-dark dark:text-white' : 'bg-error/5 text-dark dark:text-white'
              }`}
            >
              {ok ? (
                <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
              ) : (
                <XCircle size={18} className="text-error shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium">{item.label}</p>
                {item.sub && <p className="text-xs text-slate-400">{item.sub}</p>}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}