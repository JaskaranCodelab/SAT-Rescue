import { motion } from 'framer-motion';
import { Upload, Search, Brain, ShieldCheck, CheckCircle2 } from 'lucide-react';

const steps = [
  { id: 0, label: 'Upload', desc: 'Select telemetry file', icon: Upload },
  { id: 1, label: 'Analyze', desc: 'Detect issues', icon: Search },
  { id: 2, label: 'AI Recover', desc: 'Reconstruct missing data', icon: Brain },
  { id: 3, label: 'Validate', desc: 'ECC / CRC check', icon: ShieldCheck },
  { id: 4, label: 'Complete', desc: 'View results', icon: CheckCircle2 }
];

export default function WorkflowStepper({ currentStep }) {
  return (
    <div className="flex items-center justify-between w-full max-w-4xl mx-auto py-2">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const state = i < currentStep ? 'done' : i === currentStep ? 'active' : 'future';
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                initial={false}
                animate={{
                  scale: state === 'active' ? 1.1 : 1,
                  boxShadow: state === 'active'
                    ? '0 0 0 4px rgba(37,99,235,0.2)'
                    : '0 0 0 0px rgba(37,99,235,0)'
                }}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm transition-colors ${
                  state === 'done'
                    ? 'border-success bg-success text-white'
                    : state === 'active'
                    ? 'border-primary bg-primary text-white'
                    : 'border-slate-200 dark:border-slate-700 text-slate-400'
                }`}
              >
                {state === 'done' ? <CheckCircle2 size={18} /> : <Icon size={18} />}
              </motion.div>
              <div className="text-center">
                <p className={`text-xs font-semibold ${state === 'future' ? 'text-slate-400' : 'text-dark dark:text-white'}`}>
                  {step.label}
                </p>
                <p className="text-[10px] text-slate-400 hidden sm:block">{step.desc}</p>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="mx-2 sm:mx-4 mb-5 h-0.5 flex-1 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden">
                {i < currentStep && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    className="h-full bg-success"
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
