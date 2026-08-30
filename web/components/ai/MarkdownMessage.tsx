'use client';

import React from 'react';

interface MarkdownMessageProps {
  content: string;
  isUser?: boolean;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, isUser }) => {
  if (isUser) {
    return <p className="whitespace-pre-wrap font-medium">{content}</p>;
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];

  const renderTable = (tableLines: string[], key: number) => {
    if (tableLines.length < 2) return null;
    const headerRow = tableLines[0].split('|').map(s => s.trim()).filter(Boolean);
    const bodyRows = tableLines.slice(2).map(row => row.split('|').map(s => s.trim()).filter(Boolean));

    return (
      <div key={`table-${key}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/80 dark:bg-black/30 text-[11px] shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/90 text-cyan-700 dark:text-cyan-400 font-extrabold border-b border-slate-200 dark:border-slate-700">
              {headerRow.map((h, i) => (
                <th key={i} className="px-3 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, ri) => (
              <tr key={ri} className="border-b border-slate-200/70 dark:border-slate-800/70 hover:bg-slate-100/50 dark:hover:bg-white/5 transition">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-extrabold text-cyan-700 dark:text-cyan-300">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={index} className="italic opacity-85" style={{ color: 'var(--text-secondary)' }}>
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold"
            style={{ background: 'var(--bg-secondary)', color: 'var(--accent-cyan)', border: '1px solid var(--border-default)' }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Check if table row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      tableBuffer.push(trimmed);
      return;
    } else if (tableBuffer.length > 0) {
      elements.push(renderTable(tableBuffer, idx));
      tableBuffer = [];
    }

    if (trimmed === '---' || trimmed === '***') {
      elements.push(<hr key={idx} className="my-2.5" style={{ borderColor: 'var(--border-subtle)' }} />);
      return;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={idx} className="font-extrabold text-xs text-cyan-700 dark:text-cyan-400 mt-2.5 mb-1 flex items-center gap-1.5">
          <span>{renderInline(trimmed.replace(/^###\s/, ''))}</span>
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      elements.push(
        <h3 key={idx} className="font-bold text-sm mt-3 mb-1" style={{ color: 'var(--text-primary)' }}>
          {renderInline(trimmed.replace(/^#+\s/, ''))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('+ ')) {
      return elements.push(
        <li key={idx} className="ml-4 list-disc text-xs leading-relaxed my-1" style={{ color: 'var(--text-secondary)' }}>
          {renderInline(trimmed.slice(2))}
        </li>
      );
    }

    // Match numbered list: "1. ", "2. "
    const numMatch = trimmed.match(/^(\d+\.)\s+(.*)$/);
    if (numMatch) {
      return elements.push(
        <div key={idx} className="flex items-start space-x-1.5 text-xs leading-relaxed my-1" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-bold text-cyan-700 dark:text-cyan-400 shrink-0">{numMatch[1]}</span>
          <div className="flex-1">{renderInline(numMatch[2])}</div>
        </div>
      );
    }

    if (trimmed === '') {
      elements.push(<div key={idx} className="h-1" />);
      return;
    }

    elements.push(
      <p key={idx} className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {renderInline(trimmed)}
      </p>
    );
  });

  if (tableBuffer.length > 0) {
    elements.push(renderTable(tableBuffer, lines.length));
  }

  return <div className="space-y-1">{elements}</div>;
};
