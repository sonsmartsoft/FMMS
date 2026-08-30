'use client';

import React from 'react';

interface MarkdownMessageProps {
  content: string;
  isUser?: boolean;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, isUser }) => {
  if (isUser) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];

  const renderTable = (tableLines: string[], key: number) => {
    if (tableLines.length < 2) return null;
    const headerRow = tableLines[0].split('|').map(s => s.trim()).filter(Boolean);
    const bodyRows = tableLines.slice(2).map(row => row.split('|').map(s => s.trim()).filter(Boolean));

    return (
      <div key={`table-${key}`} className="my-2.5 overflow-x-auto rounded-xl border border-slate-700/40 bg-black/20 text-[11px]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-800/80 text-cyan-400 font-bold border-b border-slate-700/50">
              {headerRow.map((h, i) => (
                <th key={i} className="px-3 py-1.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, ri) => (
              <tr key={ri} className="border-b border-slate-800/50 hover:bg-white/5 transition">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-1.5 font-medium">
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
        return <strong key={index} className="font-extrabold text-cyan-300 dark:text-cyan-400">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} className="italic text-slate-300">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="px-1 py-0.5 rounded bg-black/30 text-amber-300 font-mono text-[10px]">{part.slice(1, -1)}</code>;
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
      elements.push(<hr key={idx} className="my-3 border-slate-700/50" />);
      return;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={idx} className="font-extrabold text-xs text-cyan-400 mt-2.5 mb-1 flex items-center gap-1.5">
          <span>{renderInline(trimmed.replace(/^###\s/, ''))}</span>
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      elements.push(
        <h3 key={idx} className="font-bold text-sm text-slate-100 mt-3 mb-1">
          {renderInline(trimmed.replace(/^#+\s/, ''))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('+ ')) {
      elements.push(
        <li key={idx} className="ml-4 list-disc text-slate-200 text-xs leading-relaxed my-0.5">
          {renderInline(trimmed.slice(2))}
        </li>
      );
      return;
    }

    if (trimmed === '') {
      elements.push(<div key={idx} className="h-1.5" />);
      return;
    }

    elements.push(
      <p key={idx} className="text-slate-200 text-xs leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
  });

  if (tableBuffer.length > 0) {
    elements.push(renderTable(tableBuffer, lines.length));
  }

  return <div className="space-y-1">{elements}</div>;
};
