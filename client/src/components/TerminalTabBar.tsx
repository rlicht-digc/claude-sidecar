import { VscTerminalBash, VscAdd, VscClose } from 'react-icons/vsc';

export interface TabInfo {
  id: string;
  sessionId: string;
  label: string;
  cwd: string;
  /** If set, this tab is an action-agent tab that gets reused */
  actionAgent?: 'claude' | 'codex';
  /** If true, this is a watch-only activity view (no PTY) */
  isWatch?: boolean;
}

interface TerminalTabBarProps {
  tabs: TabInfo[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onNewTab: () => void;
  onCloseTab: (tabId: string) => void;
}

export function TerminalTabBar({ tabs, activeTabId, onSelectTab, onNewTab, onCloseTab }: TerminalTabBarProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: 36,
      background: '#161b22',
      borderBottom: '1px solid #21262d',
      paddingLeft: 8,
      paddingRight: 8,
      gap: 2,
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#e6edf3' : '#7d8590',
              background: isActive ? '#0d1117' : 'transparent',
              borderTop: isActive
                ? `2px solid ${tab.actionAgent === 'claude' ? '#da7756' : tab.actionAgent === 'codex' ? '#58a6ff' : '#58a6ff'}`
                : '2px solid transparent',
              transition: 'all 0.15s ease',
              maxWidth: 200,
              flexShrink: 0,
            }}
          >
            {tab.actionAgent ? (
              <span style={{ fontSize: 11, flexShrink: 0 }}>{tab.actionAgent === 'claude' ? '✦' : '◈'}</span>
            ) : (
              <VscTerminalBash size={14} style={{ flexShrink: 0 }} />
            )}
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: "'SF Mono', Monaco, Consolas, monospace",
            }}>
              {tab.label}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#484f58',
                padding: 2,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#f85149')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#484f58')}
            >
              <VscClose size={12} />
            </button>
          </div>
        );
      })}

      {/* New tab button */}
      <button
        onClick={onNewTab}
        style={{
          background: 'none',
          border: '1px solid #30363d',
          borderRadius: 4,
          cursor: 'pointer',
          color: '#7d8590',
          padding: '2px 6px',
          display: 'flex',
          alignItems: 'center',
          marginLeft: 4,
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#e6edf3'; e.currentTarget.style.borderColor = '#58a6ff'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#7d8590'; e.currentTarget.style.borderColor = '#30363d'; }}
        title="New terminal"
      >
        <VscAdd size={14} />
      </button>
    </div>
  );
}
