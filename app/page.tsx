'use client';

import { useState } from 'react';
import type { GenerateResponse, DayType } from '@/lib/types';

interface SendLog {
  id: string;
  type: DayType;
  status: 'loading' | 'success' | 'error';
  content?: string;
  error?: string;
  timestamp: string;
}

const BUTTONS: {
  id: DayType;
  label: string;
  subtitle: string;
  description: string;
  endpoint: string;
  emoji: string;
}[] = [
  {
    id: 'day-a',
    label: 'Day A',
    subtitle: 'Mon / Wed / Sat',
    description: 'Smart Money Flows + High Conviction',
    endpoint: '/api/generate/day-a',
    emoji: '\u{1F9E0}',
  },
  {
    id: 'day-b',
    label: 'Day B',
    subtitle: 'Tue / Thu / Sun',
    description: 'Memecoin Flow + Hyperliquid',
    endpoint: '/api/generate/day-b',
    emoji: '\u{1F438}',
  },
  {
    id: 'day-c',
    label: 'Day C',
    subtitle: 'Friday',
    description: 'Weekly Roundup',
    endpoint: '/api/generate/day-c',
    emoji: '\u{1F4CA}',
  },
  {
    id: 'news',
    label: 'News',
    subtitle: 'Daily',
    description: 'Crypto News Summary',
    endpoint: '/api/generate/news',
    emoji: '\u{1F4F0}',
  },
];

export default function Home() {
  const [logs, setLogs] = useState<SendLog[]>([]);
  const [activeGeneration, setActiveGeneration] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  const handleGenerate = async (
    button: (typeof BUTTONS)[number]
  ) => {
    const logId = `${button.id}-${Date.now()}`;
    setActiveGeneration(button.id);
    setPreviewContent(null);

    setLogs((prev) => [
      {
        id: logId,
        type: button.id,
        status: 'loading',
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    try {
      const response = await fetch(button.endpoint, { method: 'POST' });
      const data: GenerateResponse = await response.json();

      if (data.success && data.result) {
        setPreviewContent(data.result.content);
        setLogs((prev) =>
          prev.map((log) =>
            log.id === logId
              ? { ...log, status: 'success' as const, content: data.result!.content }
              : log
          )
        );
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';
      setLogs((prev) =>
        prev.map((log) =>
          log.id === logId
            ? { ...log, status: 'error' as const, error: errorMsg }
            : log
        )
      );
    } finally {
      setActiveGeneration(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Header */}
      <header
        className="px-6 py-4"
        style={{ borderBottom: '1px solid var(--card-border)' }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Nansen Telegram Bot</h1>
            <p className="text-sm" style={{ color: '#8899aa' }}>
              Generate and send onchain content to Telegram
            </p>
          </div>
          <div
            className="text-xs px-3 py-1 rounded-full"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              color: 'var(--accent)',
            }}
          >
            Manual Triggers
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Trigger Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {BUTTONS.map((button) => {
            const isActive = activeGeneration === button.id;
            const isDisabled = activeGeneration !== null;

            return (
              <button
                key={button.id}
                onClick={() => handleGenerate(button)}
                disabled={isDisabled}
                className={`p-6 rounded-xl text-left transition-all cursor-pointer ${
                  isActive ? 'animate-pulse-glow' : ''
                }`}
                style={{
                  background: isActive
                    ? 'rgba(0, 255, 167, 0.08)'
                    : 'var(--card-bg)',
                  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--card-border)'}`,
                  opacity: isDisabled && !isActive ? 0.5 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                <div className="text-2xl mb-2">{button.emoji}</div>
                <div className="font-bold text-lg">{button.label}</div>
                <div
                  className="text-xs font-medium mt-0.5"
                  style={{ color: 'var(--accent)' }}
                >
                  {button.subtitle}
                </div>
                <div
                  className="text-sm mt-2"
                  style={{ color: '#8899aa' }}
                >
                  {button.description}
                </div>
                {isActive && (
                  <div
                    className="text-xs mt-3 flex items-center gap-2"
                    style={{ color: 'var(--accent)' }}
                  >
                    <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                    Generating...
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Preview */}
        {previewContent && (
          <div
            className="mb-8 rounded-xl overflow-hidden"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
            }}
          >
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{
                borderBottom: '1px solid var(--card-border)',
              }}
            >
              <h2 className="font-bold text-sm" style={{ color: 'var(--accent)' }}>
                Generated Content
              </h2>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(previewContent);
                }}
                className="text-xs px-3 py-1 rounded-md transition-colors cursor-pointer"
                style={{
                  background: 'rgba(0, 255, 167, 0.1)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(0, 255, 167, 0.3)',
                }}
              >
                Copy
              </button>
            </div>
            <pre
              className="p-4 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto"
              style={{ color: '#c0cdd8' }}
            >
              {previewContent}
            </pre>
          </div>
        )}

        {/* Send Log */}
        {logs.length > 0 && (
          <div>
            <h2 className="font-bold text-sm mb-3" style={{ color: '#8899aa' }}>
              Recent Activity
            </h2>
            <div className="space-y-2">
              {logs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg flex items-center gap-3"
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                  }}
                >
                  <span className="text-lg">
                    {log.status === 'loading'
                      ? '\u23F3'
                      : log.status === 'success'
                        ? '\u2705'
                        : '\u274C'}
                  </span>
                  <span
                    className="font-mono text-xs px-2 py-0.5 rounded"
                    style={{
                      background: 'rgba(0, 255, 167, 0.1)',
                      color: 'var(--accent)',
                    }}
                  >
                    {log.type}
                  </span>
                  <span className="text-xs" style={{ color: '#667788' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  {log.status === 'success' && (
                    <button
                      onClick={() => setPreviewContent(log.content || null)}
                      className="text-xs ml-auto cursor-pointer"
                      style={{ color: 'var(--accent)' }}
                    >
                      View
                    </button>
                  )}
                  {log.error && (
                    <span className="text-xs ml-auto" style={{ color: '#ff6b6b' }}>
                      {log.error.length > 60
                        ? log.error.slice(0, 60) + '...'
                        : log.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
