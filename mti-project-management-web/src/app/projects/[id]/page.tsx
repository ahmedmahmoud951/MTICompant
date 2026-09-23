'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import '@/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// UI-PROJECT-01: Project Command Center
// Single page with 15 tabs — NO duplicate Arabic/English pages.
// All text uses translation keys (I18N-01 / WEB-I18N).
// ─────────────────────────────────────────────────────────────────────────────

type TabKey = 'overview' | 'timeline' | 'sites' | 'operations' | 'tasks' | 'documents' |
  'boq' | 'technicalOffice' | 'materials' | 'assets' | 'issues' | 'risks' | 'chat' | 'activity' | 'reports';

const TABS: { key: TabKey; icon: string }[] = [
  { key: 'overview',       icon: '📊' },
  { key: 'timeline',       icon: '📅' },
  { key: 'sites',          icon: '📍' },
  { key: 'operations',     icon: '⚙️' },
  { key: 'tasks',          icon: '✅' },
  { key: 'documents',      icon: '📄' },
  { key: 'boq',            icon: '📋' },
  { key: 'technicalOffice',icon: '🔧' },
  { key: 'materials',      icon: '🧱' },
  { key: 'assets',         icon: '🏗️' },
  { key: 'issues',         icon: '⚠️' },
  { key: 'risks',          icon: '🚨' },
  { key: 'chat',           icon: '💬' },
  { key: 'activity',       icon: '📈' },
  { key: 'reports',        icon: '📑' },
];

interface ProjectHeader {
  id: string;
  name: string;
  code: string;
  clientName: string;
  status: string;
  type: string;
  progressPercentage: number;
  startDate?: string;
  endDate?: string;
  remainingDays?: number;
}

function HealthBadge({ progress }: { progress: number }) {
  const health = progress >= 80 ? 'good' : progress >= 50 ? 'warning' : 'critical';
  const colors = { good: '#10b981', warning: '#f59e0b', critical: '#ef4444' };
  const labels = { good: '●', warning: '●', critical: '●' };
  return (
    <span style={{ color: colors[health], fontSize: '18px' }} title={health}>
      {labels[health]}
    </span>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const color = percent >= 80 ? '#10b981' : percent >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#1e3a5f" strokeWidth="5" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 28 28)" />
      <text x="28" y="33" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">
        {percent}%
      </text>
    </svg>
  );
}

export default function ProjectCommandCenter() {
  const params = useParams();
  const projectId = params?.id as string;
  const { t } = useTranslation();
  const { formatDate, formatNumber, dir, isRtl } = useLocale();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [project, setProject] = useState<ProjectHeader | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    const token = localStorage.getItem('mti-token') || localStorage.getItem('accessToken');
    fetch(`/api/projects/${projectId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then((data: ProjectHeader) => {
        setProject(data);
        // Calculate remaining days client-side if not provided
        if (!data.remainingDays && data.endDate) {
          const diff = new Date(data.endDate).getTime() - Date.now();
          data.remainingDays = Math.max(0, Math.ceil(diff / 86400000));
        }
        setProject({ ...data });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  const statusColors: Record<string, string> = {
    Planning: '#8b5cf6',
    Active: '#10b981',
    OnHold: '#f59e0b',
    Completed: '#3b82f6',
    Archived: '#6b7280',
  };

  return (
    <div className="pcc-root" dir={dir} lang={isRtl ? 'ar' : 'en'}>
      <style>{`
        .pcc-root {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #0a1628 100%);
          color: #e8eef8;
          font-family: var(--font-arabic, 'Cairo'), var(--font-body, 'Manrope'), sans-serif;
        }
        .pcc-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 24px;
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(10px);
          position: sticky; top: 0; z-index: 100;
        }
        .pcc-brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 15px; color: #60a5fa; }
        .pcc-brand-dot { width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; }
        .pcc-header {
          background: linear-gradient(135deg, rgba(30,58,95,0.7) 0%, rgba(15,30,60,0.9) 100%);
          border-bottom: 1px solid rgba(59,130,246,0.2);
          padding: 20px 28px;
          backdrop-filter: blur(8px);
        }
        .pcc-header-top { display: flex; align-items: flex-start; gap: 18px; flex-wrap: wrap; }
        .pcc-project-main { flex: 1; min-width: 200px; }
        .pcc-project-name { font-size: 22px; font-weight: 800; color: #f1f5f9; margin: 0 0 4px; }
        .pcc-project-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; }
        .pcc-meta-chip {
          display: flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px; padding: 4px 12px; font-size: 12px; color: #94a3b8;
        }
        .pcc-meta-chip strong { color: #e2e8f0; }
        .pcc-status-badge {
          padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700;
          border: 1px solid; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .pcc-stats { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 14px; }
        .pcc-stat-card {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 12px 18px; min-width: 110px;
          display: flex; flex-direction: column; gap: 2px;
        }
        .pcc-stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .pcc-stat-value { font-size: 18px; font-weight: 700; color: #e2e8f0; }
        .pcc-tabs-bar {
          display: flex; overflow-x: auto; gap: 2px;
          background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 0 16px; scrollbar-width: none;
        }
        .pcc-tabs-bar::-webkit-scrollbar { display: none; }
        .pcc-tab {
          display: flex; align-items: center; gap: 6px; white-space: nowrap;
          padding: 12px 16px; cursor: pointer; font-size: 13px; color: #64748b;
          border-bottom: 2px solid transparent; transition: all 0.2s; background: none; border-top: none;
          border-left: none; border-right: none;
        }
        .pcc-tab:hover { color: #94a3b8; background: rgba(255,255,255,0.04); }
        .pcc-tab.active { color: #60a5fa; border-bottom-color: #3b82f6; background: rgba(59,130,246,0.08); }
        .pcc-content { padding: 24px 28px; }
        .pcc-placeholder {
          background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.1);
          border-radius: 16px; padding: 48px; text-align: center; color: #475569;
        }
        .pcc-placeholder-icon { font-size: 48px; margin-bottom: 12px; }
        .pcc-skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
          background-size: 200% 100%; animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .lang-switcher-btn {
          display: flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px; padding: 6px 14px; color: #94a3b8; cursor: pointer;
          font-size: 13px; transition: all 0.2s;
        }
        .lang-switcher-btn:hover { background: rgba(255,255,255,0.12); color: #e2e8f0; }
        @media (max-width: 768px) {
          .pcc-header-top { flex-direction: column; }
          .pcc-stats { gap: 8px; }
          .pcc-stat-card { min-width: 90px; padding: 8px 12px; }
          .pcc-content { padding: 16px; }
        }
      `}</style>

      {/* Top Bar */}
      <div className="pcc-topbar">
        <div className="pcc-brand">
          <div className="pcc-brand-dot" />
          MTI Engineering Solutions
        </div>
        <LanguageSwitcher />
      </div>

      {/* Project Header */}
      <div className="pcc-header">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="pcc-skeleton" style={{ height: 28, width: '40%' }} />
            <div className="pcc-skeleton" style={{ height: 16, width: '60%' }} />
          </div>
        ) : project ? (
          <>
            <div className="pcc-header-top">
              <ProgressRing percent={project.progressPercentage ?? 0} />
              <div className="pcc-project-main">
                <h1 className="pcc-project-name">{project.name}</h1>
                <div className="pcc-project-meta">
                  <div className="pcc-meta-chip">
                    🏷️ <strong>{project.code}</strong>
                  </div>
                  <div className="pcc-meta-chip">
                    🏢 {t('projects.client')}: <strong>{project.clientName}</strong>
                  </div>
                  <div className="pcc-meta-chip">
                    <span
                      className="pcc-status-badge"
                      style={{
                        color: statusColors[project.status] || '#94a3b8',
                        borderColor: statusColors[project.status] || '#94a3b8',
                        background: `${statusColors[project.status]}20` || 'transparent',
                      }}
                    >
                      {t(`projects.statuses.${project.status}`, { defaultValue: project.status })}
                    </span>
                  </div>
                  <div className="pcc-meta-chip">
                    <HealthBadge progress={project.progressPercentage ?? 0} />
                    {t('projects.health')}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="pcc-stats">
              <div className="pcc-stat-card">
                <span className="pcc-stat-label">{t('projects.progress')}</span>
                <span className="pcc-stat-value">{formatNumber(project.progressPercentage)}%</span>
              </div>
              {project.startDate && (
                <div className="pcc-stat-card">
                  <span className="pcc-stat-label">{t('projects.startDate')}</span>
                  <span className="pcc-stat-value" style={{ fontSize: 13 }}>{formatDate(project.startDate)}</span>
                </div>
              )}
              {project.endDate && (
                <div className="pcc-stat-card">
                  <span className="pcc-stat-label">{t('projects.endDate')}</span>
                  <span className="pcc-stat-value" style={{ fontSize: 13 }}>{formatDate(project.endDate)}</span>
                </div>
              )}
              {(project.remainingDays !== undefined && project.remainingDays !== null) && (
                <div className="pcc-stat-card">
                  <span className="pcc-stat-label">{t('projects.remainingDays')}</span>
                  <span className="pcc-stat-value" style={{ color: project.remainingDays <= 7 ? '#ef4444' : '#10b981' }}>
                    {formatNumber(project.remainingDays)}
                  </span>
                </div>
              )}
              <div className="pcc-stat-card">
                <span className="pcc-stat-label">{t('projects.stage')}</span>
                <span className="pcc-stat-value" style={{ fontSize: 13 }}>
                  {t(`projects.statuses.${project.status}`, { defaultValue: project.status })}
                </span>
              </div>
            </div>
          </>
        ) : (
          <p style={{ color: '#475569' }}>{t('common.noData')}</p>
        )}
      </div>

      {/* Tab Bar */}
      <div className="pcc-tabs-bar" role="tablist" aria-label={t('project.commandCenter')}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            role="tab"
            id={`tab-${tab.key}`}
            aria-selected={activeTab === tab.key}
            aria-controls={`tabpanel-${tab.key}`}
            className={`pcc-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.icon}</span>
            {t(`project.tabs.${tab.key}`)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        className="pcc-content"
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        <TabContent tab={activeTab} projectId={projectId} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab Content Dispatcher
// ─────────────────────────────────────────────────────────────────────────────

function TabContent({ tab, projectId }: { tab: TabKey; projectId: string }) {
  const { t } = useTranslation();
  const icons: Record<TabKey, string> = {
    overview: '📊', timeline: '📅', sites: '📍', operations: '⚙️', tasks: '✅',
    documents: '📄', boq: '📋', technicalOffice: '🔧', materials: '🧱', assets: '🏗️',
    issues: '⚠️', risks: '🚨', chat: '💬', activity: '📈', reports: '📑',
  };

  switch (tab) {
    case 'overview':    return <OverviewTab projectId={projectId} />;
    case 'tasks':       return <TasksTab projectId={projectId} />;
    case 'chat':        return <ChatTab projectId={projectId} />;
    default:
      return (
        <div className="pcc-placeholder">
          <div className="pcc-placeholder-icon">{icons[tab]}</div>
          <h3 style={{ color: '#64748b', marginBottom: 8 }}>{t(`project.tabs.${tab}`)}</h3>
          <p style={{ fontSize: 14 }}>
            {t('common.loading')}
          </p>
        </div>
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview Tab
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTab({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const { formatNumber } = useLocale();
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    const token = localStorage.getItem('mti-token') || localStorage.getItem('accessToken');
    Promise.all([
      fetch(`/api/tasks?projectId=${projectId}&pageSize=1`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
      fetch(`/api/documents?projectId=${projectId}&pageSize=1`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
      fetch(`/api/sites?projectId=${projectId}&pageSize=1`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
    ])
      .then(async ([tasks, docs, sites]) => {
        const td = await tasks.json().catch(() => ({}));
        const dd = await docs.json().catch(() => ({}));
        const sd = await sites.json().catch(() => ({}));
        setStats({
          tasks: td.totalCount ?? 0,
          documents: dd.totalCount ?? 0,
          sites: sd.totalCount ?? sd.length ?? 0,
        });
      })
      .catch(() => {});
  }, [projectId]);

  const cards = [
    { label: t('nav.tasks'), value: stats.tasks ?? 0, icon: '✅', color: '#10b981' },
    { label: t('nav.documents'), value: stats.documents ?? 0, icon: '📄', color: '#3b82f6' },
    { label: t('nav.sites'), value: stats.sites ?? 0, icon: '📍', color: '#8b5cf6' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 16 }}>
      {cards.map(card => (
        <div key={card.label} style={{
          background: 'rgba(255,255,255,0.04)', border: `1px solid ${card.color}30`,
          borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8
        }}>
          <div style={{ fontSize: 32 }}>{card.icon}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: card.color }}>{formatNumber(card.value)}</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>{card.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tasks Tab — TASK-01 status display
// ─────────────────────────────────────────────────────────────────────────────

function TasksTab({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const { formatDate, formatDuration } = useLocale();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('mti-token') || localStorage.getItem('accessToken');
    fetch(`/api/tasks?projectId=${projectId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(d => setTasks(d.items ?? d ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  const statusColors: Record<string, string> = {
    Backlog: '#6b7280', ToDo: '#3b82f6', InProgress: '#8b5cf6',
    Blocked: '#ef4444', Review: '#f59e0b', Completed: '#10b981', Cancelled: '#475569',
  };

  const priorityColors: Record<string, string> = {
    Low: '#10b981', Medium: '#f59e0b', High: '#ef4444', Critical: '#dc2626',
  };

  if (loading) return <div className="pcc-skeleton" style={{ height: 200, borderRadius: 12 }} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {tasks.length === 0 && <p style={{ color: '#475569', textAlign: 'center', padding: 32 }}>{t('common.noData')}</p>}
      {tasks.map((task: any) => (
        <div key={task.id} style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, padding: '14px 18px',
          borderLeft: `3px solid ${statusColors[task.status] || '#3b82f6'}`,
          display: 'flex', flexDirection: 'column', gap: 6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{task.title}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{
                padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: `${statusColors[task.status]}20`, color: statusColors[task.status],
                border: `1px solid ${statusColors[task.status]}40`
              }}>
                {t(`tasks.statuses.${task.status}`, { defaultValue: task.status })}
              </span>
              <span style={{
                padding: '2px 10px', borderRadius: 20, fontSize: 11,
                background: `${priorityColors[task.priority]}20`, color: priorityColors[task.priority]
              }}>
                {t(`tasks.priorities.${task.priority}`, { defaultValue: task.priority })}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
            {task.assignedToName && <span>👤 {task.assignedToName}</span>}
            {task.dueAt && <span>📅 {formatDate(task.dueAt)}</span>}
            {task.isOverdue && (
              <span style={{ color: '#ef4444', fontWeight: 600 }}>
                ⚠️ {t('tasks.overdue')} — {formatDuration(task.overdueTimeSeconds ?? 0)}
              </span>
            )}
            {!task.isOverdue && task.remainingTimeSeconds != null && task.status !== 'Completed' && (
              <span style={{ color: '#f59e0b' }}>
                ⏳ {t('tasks.remaining')}: {formatDuration(task.remainingTimeSeconds)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat Tab — CHAT-PROJECT, CHAT-MEDIA
// ─────────────────────────────────────────────────────────────────────────────

function ChatTab({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const { formatRelativeTime, isRtl } = useLocale();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const token = localStorage.getItem('mti-token') || localStorage.getItem('accessToken');
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };

  useEffect(() => {
    // Get current user from stored auth
    const userRaw = localStorage.getItem('mti-user') || localStorage.getItem('user');
    if (userRaw) { try { setMyUserId(JSON.parse(userRaw).id); } catch {} }

    // CHAT-PROJECT: Load project conversations
    fetch(`/api/chat/conversations?projectId=${projectId}`, { headers })
      .then(r => r.json())
      .then(d => setConversations(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (!selectedConvId) return;
    fetch(`/api/chat/conversations/${selectedConvId}/messages`, { headers })
      .then(r => r.json())
      .then(d => setMessages(Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [selectedConvId]);

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConvId || sending) return;
    setSending(true);
    const clientMessageId = crypto.randomUUID();
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({ conversationId: selectedConvId, content: messageText.trim(), clientMessageId }),
      });
      const msg = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, msg]);
        setMessageText('');
      }
    } catch {}
    setSending(false);
  };

  return (
    <div style={{ display: 'flex', gap: 0, height: 520, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
      {/* Conversation List */}
      <div style={{ width: 240, borderRight: '1px solid rgba(255,255,255,0.07)', overflowY: 'auto', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontWeight: 700, fontSize: 13, color: '#60a5fa' }}>
          {t('chat.title')}
        </div>
        {conversations.map((conv: any) => (
          <div
            key={conv.id}
            onClick={() => setSelectedConvId(conv.id)}
            style={{
              padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)',
              background: selectedConvId === conv.id ? 'rgba(59,130,246,0.15)' : 'transparent',
              borderLeft: selectedConvId === conv.id ? '3px solid #3b82f6' : '3px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, color: '#e2e8f0' }}>{conv.title}</div>
            {conv.lastMessage && (
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                {conv.lastMessage.content?.substring(0, 30)}{conv.lastMessage.content?.length > 30 ? '…' : ''}
              </div>
            )}
            {conv.unreadCount > 0 && (
              <span style={{ background: '#3b82f6', color: 'white', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
                {conv.unreadCount}
              </span>
            )}
          </div>
        ))}
        {conversations.length === 0 && (
          <p style={{ padding: 16, color: '#475569', fontSize: 12, textAlign: 'center' }}>{t('common.noData')}</p>
        )}
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)' }}>
        {!selectedConvId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 13 }}>
            💬 {t('chat.directChat')}
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.map((msg: any) => {
                const isMine = msg.senderUserId === myUserId;
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      background: isMine ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.07)',
                      border: `1px solid ${isMine ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      padding: '8px 14px', maxWidth: '72%',
                    }}>
                      {!isMine && <div style={{ fontSize: 11, color: '#60a5fa', marginBottom: 2 }}>{msg.senderName}</div>}
                      <div style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.5 }}>{msg.content}</div>
                      {/* CHAT-MEDIA: Show attachment metadata */}
                      {msg.attachments?.length > 0 && (
                        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {msg.attachments.map((att: any) => (
                            <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#60a5fa' }}>
                              📎 {att.fileName}
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: '#475569', marginTop: 4, textAlign: isMine ? 'right' : 'left' }}>
                        {formatRelativeTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Message Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10 }}>
              <input
                id="chat-message-input"
                type="text"
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder={t('chat.typeMessage')}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 24, padding: '8px 16px', color: '#e2e8f0', fontSize: 13, outline: 'none'
                }}
              />
              <button
                id="chat-send-btn"
                onClick={sendMessage}
                disabled={sending || !messageText.trim()}
                style={{
                  background: sending ? '#1e3a5f' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: 'white', border: 'none', borderRadius: 24, padding: '8px 20px',
                  cursor: sending ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13,
                  transition: 'all 0.2s',
                }}
              >
                {t('chat.send')} {isRtl ? '←' : '→'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
