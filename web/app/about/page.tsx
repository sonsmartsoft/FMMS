'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  BookOpen,
  Car,
  Wallet,
  PieChart,
  RefreshCw,
  HelpCircle,
  ShieldCheck,
  Zap,
  Sliders,
  Sparkles,
  ArrowRightLeft,
  Fuel,
  Wrench,
  DollarSign,
  TrendingUp,
  Cpu,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  Database,
  Smartphone,
  Info,
} from 'lucide-react';
import FinanceErrorBoundary from '@/components/finance/FinanceErrorBoundary';

export default function AboutAndGuidePage() {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MOBILITY' | 'FINANCE' | 'SYNC' | 'FAQ'>('OVERVIEW');

  return (
    <FinanceErrorBoundary fallbackTitle="Không thể tải trang giới thiệu & hướng dẫn">
      <div className="min-h-screen p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Giới Thiệu & Cẩm Nang Sử Dụng FMMS
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  v2.6 Unified
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cẩm nang toàn diện về quản lý phương tiện di chuyển, tài chính gia đình thông minh & đồng bộ tự động 2 chiều
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/family-finance"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-500" />
              Sổ Tài Chính
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <Car className="w-3.5 h-3.5" />
              Quản Lý Xe
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit text-xs font-bold overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'OVERVIEW'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            1. Tổng quan hệ thống
          </button>
          <button
            onClick={() => setActiveTab('MOBILITY')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'MOBILITY'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Car className="w-4 h-4" />
            2. Quản lý Xe & Vận hành
          </button>
          <button
            onClick={() => setActiveTab('FINANCE')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'FINANCE'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PieChart className="w-4 h-4" />
            3. Tài chính & 6 Chiếc Hũ
          </button>
          <button
            onClick={() => setActiveTab('SYNC')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'SYNC'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            4. Đồng bộ 2 chiều Xe ⟷ Tiền
          </button>
          <button
            onClick={() => setActiveTab('FAQ')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'FAQ'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            5. Câu hỏi thường gặp (FAQ)
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: TỔNG QUAN HỆ THỐNG (OVERVIEW)
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            {/* Hero Card */}
            <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-sky-500/15 via-indigo-500/10 to-purple-500/15 border border-sky-200/60 dark:border-sky-800/60 shadow-sm">
              <div className="max-w-3xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  Family Mobility & Financial Management System
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Hệ Sinh Thái Quản Trị Phương Tiện & Tài Chính Gia Đình Tất-Cả-Trong-Một
                </h2>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong>FMMS</strong> là nền tảng số được thiết kế riêng cho gia đình hiện đại, giúp kết nối toàn diện việc quản lý xe cộ (ODO, bảo dưỡng, nhiên liệu, định vị GPS, chi phí lăn bánh TCO) với hệ thống quản trị dòng tiền, ngân sách thông minh 6 Chiếc Hũ và quản lý các khoản vay ngân hàng.
                </p>
              </div>
            </div>

            {/* Core Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <Car className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Quản Lý Xe & Đi Lại (Mobility)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Theo dõi Mazda 2 Luxury/AT 2026 và các phương tiện gia đình. Tự động tính ODO ảo, cảnh báo lịch bảo dưỡng định kỳ, nhật ký đổ xăng RON 95 và phân tích chi phí vận hành TCO.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Tài Chính & 6 Chiếc Hũ (Finance)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Quản lý đa ví (Tiền mặt, Techcombank, Vietcombank, Visa Signature, MoMo, Sổ tiết kiệm). Sổ thu chi phân cấp cha-con, quy tắc 6 Chiếc Hũ (T. Harv Eker) và quy tắc 50/30/20.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Đồng Bộ 2 Chiều Tức Thời (Real-time Sync)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Ghi chép chi phí ở xe ô tô (xăng, bảo dưỡng, cầu đường, đỗ xe) tự động hạch toán vào bảng tài chính tổng. Ghi ở sổ tài chính có gắn xe tự động đồng bộ sang xe.
                </p>
              </div>
            </div>

            {/* Architecture Ecosystem */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-500" />
                Kiến Trúc Kỹ Thuật Hệ Sinh Thái (Ecosystem Architecture)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-sky-500" />
                    Web Application
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Next.js 14 App Router, TypeScript, Tailwind CSS, Recharts. Giao diện Gradient Glassmorphism đồng nhất, Dark/Light Mode.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-500" />
                    Android App (ZESTECH 9")
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Native Kotlin + Jetpack Compose, kết nối cổng OBD-II Bluetooth KW906, tính toán Virtual Odometer Ledger khi xe di chuyển.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-indigo-500" />
                    Supabase Cloud Database
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    PostgreSQL với Row Level Security (RLS), cơ chế lưu trữ bền vững 2 tầng (Database Cloud + Local Fallback Offline).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: QUẢN LÝ XE & VẬN HÀNH (MOBILITY)
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'MOBILITY' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Car className="w-5 h-5 text-cyan-500" />
                Hồ Sơ Phương Tiện Xe Mazda 2AT 2026 (BKS 19B-213.87)
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Chiếc xe Mazda 2AT (1.5L Luxury / AT) là tài sản phương tiện chính của gia đình, được quản lý toàn diện với các thông số:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                  <div className="text-slate-400 text-[11px]">Dung tích bình xăng</div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">44 Lít (RON 95)</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                  <div className="text-slate-400 text-[11px]">Chu kỳ bảo dưỡng</div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">Mỗi 5,000 km hoặc 6 tháng</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                  <div className="text-slate-400 text-[11px]">Cơ chế đo ODO</div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">Virtual ODO + OBD-II</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                  <div className="text-slate-400 text-[11px]">Khoản vay mua xe</div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">TPBank (60 tháng, ngày 28)</div>
                </div>
              </div>
            </div>

            {/* Step-by-step guides */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <Fuel className="w-4 h-4 text-cyan-500" />
                  1. Ghi nhận đổ xăng (Nhiên liệu)
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  Vào mục <strong>Nhiên liệu & Pin</strong> (`/fuel`), bấm nút <em>"Thêm lần đổ xăng"</em>. Nhập số lít, đơn giá hoặc tổng tiền và ODO hiện tại. Hệ thống sẽ tự động tính mức tiêu hao trung bình (L/100km), chi phí trên mỗi km và đồng bộ sang Hũ Thiết Yếu của gia đình.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <Wrench className="w-4 h-4 text-sky-500" />
                  2. Bảo dưỡng định kỳ & Sửa chữa
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  Vào mục <strong>Bảo dưỡng & Phụ tùng</strong> (`/maintenance`). Khi mang xe đi bảo dưỡng 1,000 km, 5,000 km hay 10,000 km tại Mazda Thaco hoặc gara ngoài, bạn ghi lại nội dung (thay dầu, lọc gió, đảo lốp) và chi phí. Hệ thống sẽ cảnh báo mốc bảo dưỡng kế tiếp.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  3. Quản lý chi phí lăn bánh & TCO
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  Vào mục <strong>Chi phí & TCO Xe</strong> (`/finance`). Tại đây thống kê toàn bộ: Tiền mua xe ban đầu, khấu hao, chi phí xăng, bảo dưỡng, bảo hiểm thân vỏ, phí cầu đường VETC, tiền gửi xe bãi tháng, rửa xe và chi phí lãi vay ngân hàng.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <ShieldCheck className="w-4 h-4 text-purple-500" />
                  4. Quản lý giấy tờ & Hạn đăng kiểm
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  Vào mục <strong>Giấy tờ & Bảo hiểm</strong> (`/documents`). Lưu trữ ảnh chụp Đăng ký xe (Cà vẹt), Sổ đăng kiểm, Giấy chứng nhận bảo hiểm TNDS & Thân vỏ. Hệ thống sẽ tự động đếm ngược ngày hết hạn đăng kiểm để bạn không bị trễ hạn.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: TÀI CHÍNH & 6 CHIẾC HŨ (FINANCE)
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'FINANCE' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-indigo-500" />
                    Mô Hình 6 Chiếc Hũ Thông Minh (T. Harv Eker 6 Jars)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Phương pháp quản trị tài chính cá nhân và gia đình hàng đầu thế giới được số hóa trên FMMS
                  </p>
                </div>

                <Link
                  href="/family-finance/budgets"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm transition"
                >
                  <Sliders className="w-4 h-4" />
                  Đến trang Cấu hình 6 Hũ
                </Link>
              </div>

              <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs space-y-2">
                <div className="font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-sky-500 shrink-0" />
                  Hệ thống tự động chia hay người dùng tự cấu hình?
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong>1. Hệ thống mặc định TỰ ĐỘNG CHIA:</strong> Mỗi khi bạn ghi nhận dòng tiền thu nhập (Lương, Thưởng, Kinh doanh, Cổ tức...), hệ thống sẽ tự động tính ra định mức tối đa bạn được phép chi tiêu cho từng hũ. Nếu đầu tháng chưa ghi thu nhập, hệ thống lấy mốc <strong>50,000,000 ₫ (Thu nhập cơ sở)</strong> làm định mức chuẩn.
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong>2. Bạn HOÀN TOÀN CÓ THỂ TÙY CHỈNH:</strong> Bấm nút <code>⚙️ Cấu hình tỷ lệ 6 Hũ</code> trên trang Ngân sách để điều chỉnh tỷ lệ % phù hợp hoàn cảnh gia đình. Hệ thống có bộ kiểm tra tự động đảm bảo tổng tỷ lệ đúng 100%.
                </p>
              </div>

              {/* 6 Jars Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs pt-1">
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">Hũ Thiết Yếu (NEC)</span>
                    <span className="px-2 py-0.5 rounded-full font-mono font-bold text-[10px] bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">55%</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Chi phí ăn uống, điện nước, thuê/mua nhà, học phí chính khóa, <strong>xăng xe, bảo dưỡng xe Mazda 2, phí cầu đường VETC</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/40 dark:bg-sky-950/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-700 dark:text-sky-300 text-sm">Hũ Tiết Kiệm Dài Hạn (LTSS)</span>
                    <span className="px-2 py-0.5 rounded-full font-mono font-bold text-[10px] bg-sky-200 dark:bg-sky-900 text-sky-800 dark:text-sky-200">10%</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Quỹ dự phòng khẩn cấp cho gia đình (3-6 tháng sinh hoạt), mua sắm tài sản lớn trong tương lai, bảo hiểm nhân thọ.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/40 dark:bg-purple-950/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-700 dark:text-purple-300 text-sm">Hũ Giáo Dục (EDU)</span>
                    <span className="px-2 py-0.5 rounded-full font-mono font-bold text-[10px] bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">10%</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Học phí học thêm, tiếng Anh, năng khiếu cho con cái, mua sách vở giáo trình và các khóa học nâng cao kỹ năng cho bố mẹ.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-700 dark:text-amber-300 text-sm">Hũ Hưởng Thụ (PLAY)</span>
                    <span className="px-2 py-0.5 rounded-full font-mono font-bold text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200">10%</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Chi tiêu không hối tiếc: Du lịch cuối tuần, ăn nhà hàng buffet sang trọng, spa làm đẹp, phụ tùng nâng cấp đồ chơi xe Mazda.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-700 dark:text-indigo-300 text-sm">Hũ Tự Do Tài Chính (FFA)</span>
                    <span className="px-2 py-0.5 rounded-full font-mono font-bold text-[10px] bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">10%</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Đầu tư sinh lời: Mua cổ phiếu, trái phiếu, góp vốn kinh doanh phụ, tích lũy tạo dòng tiền thu nhập thụ động cho tương lai.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-950/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-700 dark:text-rose-300 text-sm">Hũ Cho Đi (GIVE)</span>
                    <span className="px-2 py-0.5 rounded-full font-mono font-bold text-[10px] bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">5%</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Biếu quà ông bà nội ngoại hai bên, làm từ thiện, quyên góp xã hội, quà sinh nhật, cưới hỏi, hiếu hỉ người thân bạn bè.
                  </p>
                </div>
              </div>
            </div>

            {/* Wallets & Accounts */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-500" />
                Hệ Thống Ví & Tài Khoản Thanh Toán Độc Lập
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Mỗi khoản chi tiêu hoặc thu nhập đều được gắn với một tài khoản nguồn để kiểm soát số dư chính xác từng đồng:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-center font-semibold text-slate-700 dark:text-slate-300">
                  💵 Tiền mặt
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-center font-semibold text-slate-700 dark:text-slate-300">
                  🏦 Techcombank
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-center font-semibold text-slate-700 dark:text-slate-300">
                  🏦 Vietcombank
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-center font-semibold text-slate-700 dark:text-slate-300">
                  💳 Visa Signature
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-center font-semibold text-slate-700 dark:text-slate-300">
                  📱 Ví MoMo
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-center font-semibold text-slate-700 dark:text-slate-300">
                  🐷 Sổ Tiết Kiệm
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 4: ĐỒNG BỘ 2 CHIỀU (SYNC MECHANISM)
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'SYNC' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-sky-500" />
                Cơ Chế Đồng Bộ Tự Động 2 Chiều: Xe Ô Tô ⟷ Tài Chính Chung
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Trước đây, chi phí xe và chi tiêu tài chính gia đình thường bị rời rạc khiến việc theo dõi dòng tiền bị trùng hoặc sót. FMMS đã giải quyết triệt để vấn đề này bằng cơ chế <strong>Đồng bộ tự động 2 chiều (Bidirectional Sync)</strong>.
              </p>

              {/* Sync Diagram */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-4">
                <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] text-center">
                  SƠ ĐỒ LUỒNG ĐỒNG BỘ DỮ LIỆU TỨC THỜI
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-cyan-200 dark:border-cyan-800/60 text-center space-y-2">
                    <div className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">🚗 PHÂN HỆ XE (FMMS)</div>
                    <ul className="text-[11px] text-slate-500 dark:text-slate-400 text-left space-y-1">
                      <li>• Đổ xăng RON 95 (Lít / Giá)</li>
                      <li>• Bảo dưỡng hãng Mazda / Gara</li>
                      <li>• Nạp tiền VETC / ePass</li>
                      <li>• Vé gửi xe tháng / Bãi đỗ</li>
                      <li>• Rửa xe & Thay phụ tùng</li>
                    </ul>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center p-3 rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/30">
                      <RefreshCw className="w-5 h-5 animate-spin-slow" />
                    </div>
                    <div className="font-bold text-sky-600 dark:text-sky-400 text-[11px]">
                      ÁNH XẠ TỰ ĐỘNG & KHỬ TRÙNG
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Đồng bộ 2 chiều tức thời không phân biệt nhập từ đâu
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 text-center space-y-2">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">💰 SỔ TÀI CHÍNH GIA ĐÌNH</div>
                    <ul className="text-[11px] text-slate-500 dark:text-slate-400 text-left space-y-1">
                      <li>• Tổng chi tiêu tháng & Donut Chart</li>
                      <li>• Hạch toán đúng Hũ Thiết Yếu (NEC)</li>
                      <li>• Hiển thị huy hiệu gắn xe Mazda 2</li>
                      <li>• Trừ số dư ví thanh toán chuẩn</li>
                      <li>• Phân tích thặng dư / thâm hụt</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Rules Table */}
              <div className="space-y-2 pt-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Bảng quy tắc ánh xạ tự động danh mục:
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold">
                      <tr>
                        <th className="p-3">Hạng mục ở mục Xe</th>
                        <th className="p-3">Tự động ánh xạ sang Danh mục Gia đình</th>
                        <th className="p-3">Hũ phân bổ (6 Jars)</th>
                        <th className="p-3">Phân loại</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      <tr>
                        <td className="p-3 font-semibold">Xăng RON 95 (FUEL)</td>
                        <td className="p-3">Xăng RON 95 / Dầu Diesel (`cat-mob-fuel`)</td>
                        <td className="p-3 text-emerald-600 font-bold">Hũ Thiết Yếu (NEC)</td>
                        <td className="p-3">Bắt buộc (Needs)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Bảo dưỡng định kỳ (MAINTENANCE)</td>
                        <td className="p-3">Bảo dưỡng định kỳ hãng & Gara (`cat-mob-maint`)</td>
                        <td className="p-3 text-emerald-600 font-bold">Hũ Thiết Yếu (NEC)</td>
                        <td className="p-3">Bắt buộc (Needs)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Cầu đường BOT (TOLL)</td>
                        <td className="p-3">Phí cầu đường VETC / ePass (`cat-mob-toll`)</td>
                        <td className="p-3 text-emerald-600 font-bold">Hũ Thiết Yếu (NEC)</td>
                        <td className="p-3">Bắt buộc (Needs)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Gửi xe tháng (PARKING)</td>
                        <td className="p-3">Vé gửi xe tháng & Bãi đỗ (`cat-mob-parking`)</td>
                        <td className="p-3 text-emerald-600 font-bold">Hũ Thiết Yếu (NEC)</td>
                        <td className="p-3">Bắt buộc (Needs)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Bảo hiểm / Đăng kiểm (INSURANCE)</td>
                        <td className="p-3">Bảo hiểm thân vỏ / TNDS & Đăng kiểm (`cat-mob-insurance`)</td>
                        <td className="p-3 text-emerald-600 font-bold">Hũ Thiết Yếu (NEC)</td>
                        <td className="p-3">Bắt buộc (Needs)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Đồ chơi xe / Phụ tùng (PARTS)</td>
                        <td className="p-3">Phụ tùng, Nâng cấp & Đồ chơi xe (`cat-mob-parts`)</td>
                        <td className="p-3 text-amber-600 font-bold">Hũ Hưởng Thụ (PLAY)</td>
                        <td className="p-3">Mong muốn (Wants)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Rửa xe & Spa xe (CAR_WASH)</td>
                        <td className="p-3">Rửa xe & Chăm sóc Spa xe (`cat-mob-wash`)</td>
                        <td className="p-3 text-amber-600 font-bold">Hũ Hưởng Thụ (PLAY)</td>
                        <td className="p-3">Mong muốn (Wants)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Trả nợ vay mua xe TPBank (LOAN)</td>
                        <td className="p-3">Gốc vay mua xe ô tô ngân hàng (`cat-debt-car-principal`)</td>
                        <td className="p-3 text-emerald-600 font-bold">Hũ Thiết Yếu (NEC)</td>
                        <td className="p-3">Bắt buộc (Needs)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 5: CÂU HỎI THƯỜNG GẶP (FAQ)
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'FAQ' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sky-500" />
                1. Khi nhập một khoản chi tiêu xe thì tiền bị trừ ở ví nào?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Mặc định hệ thống gán vào ví chi tiêu chính của gia đình (<strong>Techcombank Chi tiêu</strong>). Bạn có thể vào Sổ thu chi (`/family-finance/transactions`) để đổi sang ví khác (Ví dụ: Tiền mặt, Thẻ tín dụng Visa Signature hoặc MoMo) bất cứ lúc nào.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sky-500" />
                2. Nếu tôi xóa một giao dịch xăng xe ở sổ tài chính thì bên xe có mất không?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong>Có, tự động xóa cả hai nơi!</strong> Hệ thống đồng bộ 2 chiều hoàn toàn: khi bạn xóa giao dịch ở sổ tài chính, bản ghi chi phí bên xe tương ứng cũng được dọn sạch để TCO xe và số dư tiền không bị lệch.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sky-500" />
                3. Tôi có thể thêm danh mục cha - con mới cho gia đình không?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Hoàn toàn được! Bạn có thể thêm danh mục mới trong phần Cài đặt danh mục hoặc tạo nhanh khi ghi chép giao dịch. Hệ thống hỗ trợ phân cấp danh mục Mẹ (Ăn uống, Nhà cửa, Xe cộ, Giáo dục...) và danh mục Con chi tiết.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sky-500" />
                4. Dữ liệu của tôi được lưu ở đâu? Có bị mất khi tải lại trang không?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Dữ liệu được lưu trữ trên <strong>Supabase Cloud Database (PostgreSQL)</strong>. Đồng thời hệ thống có tầng đệm <strong>Local Persistence Cache</strong> giúp ứng dụng chạy cực nhanh và có thể sử dụng ngay cả khi kết nối mạng chập chờn.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sky-500" />
                5. Muốn thay đổi tỷ lệ 6 Hũ (ví dụ muốn tiết kiệm nhiều hơn) thì làm thế nào?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Vào mục <strong>Ngân sách 6 Hũ</strong> (`/family-finance/budgets`), bấm nút <code>⚙️ Cấu hình tỷ lệ 6 Hũ</code>. Bạn chỉ cần nhập số % mong muốn cho từng hũ (miễn là tổng bằng 100%) rồi bấm Lưu. Mọi báo cáo và thanh tiến độ sẽ lập tức tính lại theo tỷ lệ mới của bạn!
              </p>
            </div>
          </div>
        )}
      </div>
    </FinanceErrorBoundary>
  );
}
