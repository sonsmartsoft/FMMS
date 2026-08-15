'use client';

import React, { useState } from 'react';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { AIFloatingButton } from '@/components/ai/AIFloatingButton';
import { AIChatDrawer } from '@/components/ai/AIChatDrawer';
import { DisplaySettingsModal } from '@/components/dashboard/DisplaySettingsModal';
import { DEFAULT_CARD_SETTINGS } from '@/lib/data/mockData';
import { CardDisplaySettings } from '@/types/mobility';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [cardSettings, setCardSettings] = useState<CardDisplaySettings>(DEFAULT_CARD_SETTINGS);

  return (
    <html lang="vi" className="dark">
      <head>
        <title>FMMS — Family Mobility Management System</title>
        <meta name="description" content="Hệ thống quản lý toàn bộ phương tiện và tài sản di chuyển gia đình" />
      </head>
      <body className="bg-[#0B0F19] text-slate-100 flex flex-col min-h-screen">
        <Navbar
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleAiChat={() => setIsAiOpen((prev) => !prev)}
        />

        <div className="flex flex-1">
          <Sidebar />

          <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
            {React.cloneElement(children as React.ReactElement, { cardSettings })}
          </main>
        </div>

        {/* Global Floating AI Button */}
        <AIFloatingButton onClick={() => setIsAiOpen(true)} />

        {/* AI Chat Drawer */}
        <AIChatDrawer isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />

        {/* Dashboard Display Settings Modal */}
        <DisplaySettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={cardSettings}
          onSaveSettings={(newSet) => setCardSettings(newSet)}
        />
      </body>
    </html>
  );
}
