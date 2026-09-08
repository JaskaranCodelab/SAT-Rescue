import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Loader2, CheckCircle2, Sparkles, BrainCircuit } from 'lucide-react';

export default function AnimatedRecoveryButton({ state, onClick }) {
  const running = state === 'running';
  const complete = state === 'complete';

  return (
    <div className="relative rounded-3xl p-1 bg-gradient-to-br from-ai/30 via-primary/20 to-success/30">
      {/* glass box */}
      <div className="relative overflow-hidden rounded-[1.4rem] px-6 py-10 md:py-14 bg-white/40 dark:bg-slate-950/50 backdrop-blur-2xl border border-white/50 dark:border-ai/20 shadow-[0_0_60px_-15px_rgba(125,107,255,0.35)]">
        {/* binary rain */}
        <BinaryRain />

        {/* corner accents */}
        <div className="absolute left-4 top-4 h-3 w-3 border-l-2 border-t-2 border-ai/60 rounded-tl-md" />
        <div className="absolute right-4 top-4 h-3 w-3 border-r-2 border-t-2 border-ai/60 rounded-tr-md" />
        <div className="absolute left-4 bottom-4 h-3 w-3 border-l-2 border-b-2 border-ai/60 rounded-bl-md" />
        <div className="absolute right-4 bottom-4 h-3 w-3 border-r-2 border-b-2 border-ai/60 rounded-br-md" />

        {/* header */}
        <div className="relative z-10 mb-8 text-center">
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-[11px] tracking-[0.3em] text-ai/80"
          >
            // AI RECOVERY ENGINE // 0x0101
          </motion.p>
          <p className="mt-1 text-[11px] font-mono text-slate-400">
            {running
              ? 'Neural reconstruction in progress'
              : complete
              ? 'All packets reconstructed & validated'
              : 'Ready to reconstruct corrupt packets'}
          </p>
        </div>

        {/* huge AI button */}
        <div className="relative z-10 flex justify-center">
          <motion.button
            onClick={onClick}
            disabled={running}
            whileHover={!running ? { scale: 1.04 } : {}}
            whileTap={!running ? { scale: 0.96 } : {}}
            className={`relative flex items-center justify-center gap-4 rounded-2xl px-12 py-6 md:px-16 md:py-7 text-lg md:text-xl font-bold tracking-wide text-white overflow-hidden cursor-pointer ${
              complete
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_0_50px_-10px_rgba(16,185,129,0.7)]'
                : running
                ? 'bg-gradient-to-r from-ai to-primary cursor-wait shadow-[0_0_50px_-10px_rgba(125,107,255,0.8)]'
                : 'bg-gradient-to-r from-ai via-primary to-ai shadow-glow'
            }`}
          >
            {/* sheen sweep */}
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              animate={{ x: ['-150%', '150%'] }}
              transition={{ repeat: Infinity, duration: running ? 1.1 : 2.2, ease: 'easeInOut' }}
            />

            {/* running pulse ring */}
            {running && (
              <>
                <motion.span
                  className="absolute inset-0 rounded-2xl ring-2 ring-ai"
                  animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ repeat: Infinity, duration: 1.3 }}
                />
                <motion.span
                  className="absolute inset-0 rounded-2xl ring-4 ring-primary/60"
                  animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.3, delay: 0.3 }}
                />
              </>
            )}

            <motion.span
              className="absolute -inset-1 rounded-2xl opacity-40 blur-xl bg-gradient-to-r from-ai to-primary"
              animate={{ opacity: running ? [0.3, 0.7, 0.3] : [0.2, 0.5, 0.2] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />

            {/* icon + label */}
            <span className="relative z-10 flex items-center gap-4">
              <AnimatePresence mode="wait">
                {running ? (
                  <motion.span
                    key="run"
                    initial={{ opacity: 0, rotate: -30 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 30 }}
                    className="flex items-center gap-4"
                  >
                    <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <Loader2 size={28} />
                    </motion.span>
                    Recovering Data…
                  </motion.span>
                ) : complete ? (
                  <motion.span
                    key="done"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-4"
                  >
                    <CheckCircle2 size={28} />
                    Recovery Complete
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-4"
                  >
                    <motion.span
                      className="flex items-center gap-2"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 1.6 }}
                    >
                      <BrainCircuit size={30} />
                      <Zap size={24} className="text-yellow-300" />
                    </motion.span>
                    Start AI Recovery
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </motion.button>
        </div>

        {/* helper caption */}
        <AnimatePresence>
          {!running && !complete && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="relative z-10 mt-7 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5"
            >
              <Sparkles size={13} className="text-ai" />
              Neural engine repairs missing & corrupted values automatically
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BinaryRain() {
  const bits = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        id: i,
        char: Math.random() > 0.5 ? '0' : '1',
        left: Math.random() * 100,
        top: 5 + Math.random() * 90,
        size: 9 + Math.random() * 9,
        dur: 3.5 + Math.random() * 5,
        delay: Math.random() * 5,
        drift: 6 + Math.random() * 18,
        opacity: 0.08 + Math.random() * 0.4,
        color: ['text-ai/70', 'text-primary/70', 'text-success/60', 'text-slate-400/50'][i % 4],
      })),
    []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {bits.map((b) => (
        <motion.span
          key={b.id}
          className={`absolute select-none font-mono font-bold ${b.color}`}
          style={{ left: `${b.left}%`, top: `${b.top}%`, fontSize: b.size }}
          animate={{
            y: [0, -b.drift, 0],
            opacity: [b.opacity * 0.4, b.opacity, b.opacity * 0.4],
          }}
          transition={{ repeat: Infinity, duration: b.dur, delay: b.delay, ease: 'easeInOut' }}
        >
          {b.char}
        </motion.span>
      ))}

      {/* moving scan line */}
      <motion.div
        className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-ai/15 to-transparent"
        animate={{ top: ['-12%', '112%'] }}
        transition={{ repeat: Infinity, duration: 4.5, ease: 'linear' }}
      />

      {/* soft glow center */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-ai/15 blur-3xl" />
    </div>
  );
}