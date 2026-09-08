import { motion } from 'framer-motion';
import { useStore } from '../store/useStore.js';

export default function Settings() {
  const { settings, setSettings } = useStore();

  const update = (patch) => setSettings({ ...settings, ...patch });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="card p-6">
        <h3 className="text-base font-semibold text-dark dark:text-white mb-4">Recovery Sensitivity</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' }
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ sensitivity: opt.value })}
              className={`rounded-xl border p-4 text-center transition-colors ${
                settings.sensitivity === opt.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
              }`}
            >
              <p className="text-sm font-semibold">{opt.label}</p>
              <p className="text-xs mt-1 text-slate-400">
                {opt.value === 'low' ? 'Conservative' : opt.value === 'medium' ? 'Balanced' : 'Extensive'}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h3 className="text-base font-semibold text-dark dark:text-white">Detection</h3>
        <ToggleRow
          label="Corruption Detection"
          desc="Automatically detect and flag corrupted values"
          checked={settings.corruptionDetection}
          onChange={(v) => update({ corruptionDetection: v })}
        />
        <ToggleRow
          label="Automatic Validation"
          desc="Run ECC / CRC validation after recovery"
          checked={settings.autoValidation}
          onChange={(v) => update({ autoValidation: v })}
        />
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold text-dark dark:text-white">Confidence Threshold</h3>
          <span className="text-sm font-bold text-ai">{settings.confidenceThreshold}%</span>
        </div>
        <input
          type="range"
          min="50"
          max="100"
          value={settings.confidenceThreshold}
          onChange={(e) => update({ confidenceThreshold: Number(e.target.value) })}
          className="w-full accent-[#7C3AED]"
          aria-label="Confidence threshold"
        />
        <p className="text-xs text-slate-400 mt-1">Minimum confidence to mark a recovery as successful.</p>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-dark dark:text-white mb-4">Theme</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' }
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ theme: opt.value })}
              className={`rounded-xl border p-4 text-center transition-colors ${
                settings.theme === opt.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-dark dark:text-white">{label}</p>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
      >
        <motion.span
          animate={{ x: checked ? 20 : 2 }}
          className="absolute top-1 h-4 w-4 rounded-full bg-white shadow"
        />
      </button>
    </div>
  );
}
