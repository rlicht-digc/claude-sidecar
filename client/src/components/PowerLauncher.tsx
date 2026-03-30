import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { theme as t } from '../utils/theme';

interface DetectedCLI {
  name: string;
  command: string;
  version: string;
  flag: string;
}

interface PowerLauncherProps {
  onNewTerminal: () => void;
  onLaunchCLI: (command: string, label: string, agent: 'claude' | 'codex') => void;
}

const CLI_ICONS: Record<string, { icon: string; color: string }> = {
  claude: { icon: '✦', color: '#e8956e' },
  codex: { icon: '◈', color: '#5ba8ff' },
  aider: { icon: '⚡', color: '#4ddb8a' },
  cursor: { icon: '▣', color: '#ea80ff' },
};

export function PowerLauncher({ onNewTerminal, onLaunchCLI }: PowerLauncherProps) {
  const [expanded, setExpanded] = useState(false);
  const [clis, setClis] = useState<DetectedCLI[]>([]);

  useEffect(() => {
    if (window.terminalSaddle) {
      window.terminalSaddle.system.detectCLIs().then(setClis).catch(() => {
        setClis([
          { name: 'Claude', command: 'claude', version: '', flag: '--dangerously-skip-permissions' },
          { name: 'Codex', command: 'codex', version: '', flag: '--full-auto' },
        ]);
      });
    } else {
      setClis([
        { name: 'Claude', command: 'claude', version: '', flag: '--dangerously-skip-permissions' },
        { name: 'Codex', command: 'codex', version: '', flag: '--full-auto' },
      ]);
    }
  }, []);

  const handleCLI = (cli: DetectedCLI) => {
    const cmd = `${cli.command} ${cli.flag}`;
    const agent = cli.command as 'claude' | 'codex';
    onLaunchCLI(cmd, `${cli.name} Session`, agent);
    setExpanded(false);
  };

  // Shared glass orb style
  const orbStyle = (size: number, color: string, glowColor: string): React.CSSProperties => ({
    width: size,
    height: size,
    borderRadius: '50%',
    background: `radial-gradient(circle at 35% 35%, ${color}30, ${color}08 70%)`,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `1.5px solid ${color}40`,
    boxShadow: `
      inset 0 1px 2px ${color}25,
      inset 0 -1px 1px rgba(0,0,0,0.2),
      0 0 20px ${glowColor}15,
      0 0 6px ${glowColor}10
    `,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 24, position: 'relative',
    }}>
      <AnimatePresence mode="wait">
        {!expanded ? (
          /* ===== POWER BUTTON (collapsed) ===== */
          <motion.button
            key="power"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setExpanded(true)}
            style={{
              ...orbStyle(64, 'rgba(255,255,255', 'rgba(255,255,255'),
              background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.18), rgba(255,255,255,0.04) 70%)`,
              border: '1.5px solid rgba(255,255,255,0.25)',
              boxShadow: `
                inset 0 1px 3px rgba(255,255,255,0.2),
                inset 0 -1px 1px rgba(0,0,0,0.15),
                0 0 24px rgba(255,255,255,0.08),
                0 0 8px rgba(255,255,255,0.05)
              `,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = `
                inset 0 1px 3px rgba(255,255,255,0.25),
                inset 0 -1px 1px rgba(0,0,0,0.15),
                0 0 32px rgba(255,255,255,0.15),
                0 0 12px rgba(255,255,255,0.08)
              `;
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.35)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = `
                inset 0 1px 3px rgba(255,255,255,0.2),
                inset 0 -1px 1px rgba(0,0,0,0.15),
                0 0 24px rgba(255,255,255,0.08),
                0 0 8px rgba(255,255,255,0.05)
              `;
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)';
            }}
          >
            {/* Power icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3v8" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
              <path d="M7.5 6.5A8 8 0 1 0 16.5 6.5" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </motion.button>
        ) : (
          /* ===== EXPANDED: Terminal + CLI options ===== */
          <motion.div
            key="options"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 48, /* ~3/4 inch at typical DPI */
            }}
          >
            {/* New Terminal button */}
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 }}
              onClick={() => { onNewTerminal(); setExpanded(false); }}
              style={{
                ...orbStyle(64, 'rgba(255,255,255', 'rgba(255,255,255'),
                background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.15), rgba(255,255,255,0.03) 70%)`,
                border: '1.5px solid rgba(255,255,255,0.20)',
                boxShadow: `
                  inset 0 1px 2px rgba(255,255,255,0.15),
                  inset 0 -1px 1px rgba(0,0,0,0.15),
                  0 0 20px rgba(255,255,255,0.06)
                `,
                flexDirection: 'column', gap: 4,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.35)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.20)'; }}
            >
              <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.7)' }}>▸</span>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.05em' }}>
                TERMINAL
              </span>
            </motion.button>

            {/* CLI buttons */}
            {clis.map((cli, i) => {
              const cfg = CLI_ICONS[cli.command] || { icon: '●', color: t.accent.purple };
              return (
                <motion.button
                  key={cli.command}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={() => handleCLI(cli)}
                  style={{
                    ...orbStyle(64, cfg.color, cfg.color),
                    flexDirection: 'column', gap: 4,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${cfg.color}60`;
                    (e.currentTarget as HTMLElement).style.boxShadow = `
                      inset 0 1px 2px ${cfg.color}30,
                      inset 0 -1px 1px rgba(0,0,0,0.2),
                      0 0 28px ${cfg.color}20,
                      0 0 10px ${cfg.color}15
                    `;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${cfg.color}40`;
                    (e.currentTarget as HTMLElement).style.boxShadow = `
                      inset 0 1px 2px ${cfg.color}25,
                      inset 0 -1px 1px rgba(0,0,0,0.2),
                      0 0 20px ${cfg.color}15,
                      0 0 6px ${cfg.color}10
                    `;
                  }}
                >
                  <span style={{ fontSize: 22, color: cfg.color }}>{cfg.icon}</span>
                  <span style={{ fontSize: 8, color: `${cfg.color}cc`, fontWeight: 600, letterSpacing: '0.05em' }}>
                    {cli.name.toUpperCase()}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to collapse */}
      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          style={{
            position: 'absolute', inset: 0, zIndex: -1, cursor: 'default',
          }}
        />
      )}
    </div>
  );
}
