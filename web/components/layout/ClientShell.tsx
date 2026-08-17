'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { AIFloatingButton } from '@/components/ai/AIFloatingButton';
import { AIChatDrawer } from '@/components/ai/AIChatDrawer';
import { DisplaySettingsModal } from '@/components/dashboard/DisplaySettingsModal';
import { DEFAULT_CARD_SETTINGS } from '@/lib/data/mockData';
import { CardDisplaySettings } from '@/types/mobility';
import { ThemeProvider } from '@/lib/theme/ThemeContext';

function AppShell({ children }: { children: React.ReactNode }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [cardSettings, setCardSettings] = useState<CardDisplaySettings>(DEFAULT_CARD_SETTINGS);
  const pathname = usePathname();
  const isStandalone = pathname === '/login';

  if (isStandalone) {
    return (
      <body className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        {children}
      </body>
    );
  }

  return (
    <body className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleAiChat={() => setIsAiOpen((prev) => !prev)}
      />

      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      <AIFloatingButton onClick={() => setIsAiOpen(true)} />
      <AIChatDrawer isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
      <DisplaySettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={cardSettings}
        onSaveSettings={(newSet) => setCardSettings(newSet)}
      />
    </body>
  );
}

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppShell>{children}</AppShell>
    </ThemeProvider>
  );
}
