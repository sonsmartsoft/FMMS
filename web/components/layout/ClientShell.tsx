'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { AIFloatingButton } from '@/components/ai/AIFloatingButton';
import { AIChatDrawer } from '@/components/ai/AIChatDrawer';
import { DisplaySettingsModal } from '@/components/dashboard/DisplaySettingsModal';
import { CardDisplaySettings, DEFAULT_CARD_SETTINGS } from '@/types/mobility';

import { ThemeProvider } from '@/lib/theme/ThemeContext';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';

function AppShell({ children }: { children: React.ReactNode }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [initialAiPrompt, setInitialAiPrompt] = useState<string | null>(null);
  const [targetAssetId, setTargetAssetId] = useState<string | undefined>(undefined);
  const [cardSettings, setCardSettings] = useState<CardDisplaySettings>(DEFAULT_CARD_SETTINGS);
  const pathname = usePathname();
  const isStandalone = pathname === '/login';

  // Automatically close mobile navigation drawer upon route change
  React.useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    const handleOpenAi = (e: any) => {
      setIsAiOpen(true);
      if (e.detail?.prompt) {
        setInitialAiPrompt(e.detail.prompt);
      }
      if (e.detail?.assetId) {
        setTargetAssetId(e.detail.assetId);
      }
    };

    window.addEventListener('fmms:open-ai-chat', handleOpenAi);
    return () => {
      window.removeEventListener('fmms:open-ai-chat', handleOpenAi);
    };
  }, []);

  if (isStandalone) {
    return (
      <body className="min-h-[100dvh]" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        {children}
      </body>
    );
  }

  return (
    <body className="min-h-[100dvh] flex flex-col transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleAiChat={() => setIsAiOpen((prev) => !prev)}
        isMobileNavOpen={isMobileNavOpen}
        onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)}
      />

      <div className="flex flex-1 relative">
        <Sidebar
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />
        <main
          className={
            pathname === '/ai-center'
              ? 'flex-1 p-3.5 sm:p-5 lg:p-6 overflow-hidden w-full h-[calc(100dvh-var(--header-height,60px))] flex flex-col'
              : 'flex-1 p-3.5 sm:p-5 lg:p-6 xl:p-8 overflow-y-auto w-full min-h-[calc(100dvh-var(--header-height,60px))]'
          }
        >
          {children}
        </main>
      </div>

      {!isAiOpen && <AIFloatingButton onClick={() => setIsAiOpen(true)} />}
      <AIChatDrawer
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        currentAssetId={targetAssetId}
        initialPrompt={initialAiPrompt}
        onClearInitialPrompt={() => setInitialAiPrompt(null)}
      />
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
      <LanguageProvider>
        <AppShell>{children}</AppShell>
      </LanguageProvider>
    </ThemeProvider>
  );
}
