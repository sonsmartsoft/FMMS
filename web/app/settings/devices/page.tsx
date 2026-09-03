'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Radio, Wifi, WifiOff, MapPin, Car, Clock, Gauge,
  RefreshCw, Signal, AlertCircle, CheckCircle2, Edit3, X, Save, Trash2,
} from 'lucide-react';
import { getAssets } from '@/lib/services/assetService';
import { getDeviceLatestPositions, subscribeToLivePositions, DeviceLatestPosition } from '@/lib/services/gpsService';
import { getDevices, updateDevice, assignDeviceToVehicle, deleteDevice, DeviceRecord } from '@/lib/services/deviceService';
import { Asset } from '@/types/mobility';
import DraggableModal from '@/components/ui/DraggableModal';

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function isOnline(pos: DeviceLatestPosition): boolean {
  return Date.now() - new Date(pos.recorded_at).getTime() < OFFLINE_THRESHOLD_MS;
}

function getLastSeenText(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)}ph trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}g trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

export default function DeviceManagementPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [devices, setDevices] = useState<DeviceLatestPosition[]>([]);
  const [registeredDevices, setRegisteredDevices] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Edit Modal State
  const [editingDevice, setEditingDevice] = useState<{
    id: string;
    name: string;
    vehicleId: string;
    deviceType: string;
    macAddress: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const a = await getAssets();
      setAssets(a);
      const d = await getDeviceLatestPositions(a.map(x => x.id));
      setDevices(d);
      const reg = await getDevices();
      setRegisteredDevices(reg);
      setLastUpdate(new Date());
    } catch {
      // silent — empty state
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Live subscription
  useEffect(() => {
    if (!isLive || assets.length === 0) return;
    const unsub = subscribeToLivePositions(
      assets.map(a => a.id),
      (point) => {
        setDevices(prev => {
          const existing = prev.find(d => d.device_id === point.device_id);
          if (existing) {
            return prev.map(d => d.device_id === point.device_id
              ? { ...d, lat: point.lat, lng: point.lng, speed_kmh: point.speed_kmh, heading_deg: point.heading_deg, recorded_at: point.recorded_at, trip_id: point.trip_id }
              : d
            );
          }
          return [...prev, {
            device_id: point.device_id,
            device_name: point.device_name,
            vehicle_id: point.vehicle_id,
            lat: point.lat,
            lng: point.lng,
            speed_kmh: point.speed_kmh,
            heading_deg: point.heading_deg,
            recorded_at: point.recorded_at,
            trip_id: point.trip_id,
          }];
        });
        setLastUpdate(new Date());
      }
    );
    return unsub;
  }, [isLive, assets]);

  const handleEditDevice = (device: DeviceLatestPosition) => {
    const reg = registeredDevices.find(r => r.id === device.device_id);
    setEditingDevice({
      id: device.device_id,
      name: device.device_name || reg?.device_name || `Tracker ${device.device_id.slice(0, 6)}`,
      vehicleId: device.vehicle_id || reg?.vehicle_id || reg?.asset_id || '',
      deviceType: reg?.device_type || 'GPS-TRACKER',
      macAddress: reg?.mac_address || '',
    });
  };

  const handleSaveDevice = async () => {
    if (!editingDevice) return;
    setSaving(true);

    try {
      const { success } = await assignDeviceToVehicle(
        editingDevice.id,
        editingDevice.vehicleId || null
      );

      await updateDevice(editingDevice.id, {
        device_name: editingDevice.name,
        device_type: editingDevice.deviceType,
        mac_address: editingDevice.macAddress || null,
      });

      if (success) {
        showToast('✓ Cập nhật thiết bị & gán xe thành công!');
        setEditingDevice(null);
        await load();
      } else {
        showToast('❌ Cập nhật thất bại. Vui lòng thử lại.');
      }
    } catch {
      showToast('❌ Đã xảy ra lỗi khi lưu.');
    }
    setSaving(false);
  };

  const handleDeleteDevice = async (id: string, name?: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn thiết bị "${name || id}" khỏi hệ thống?`)) return;
    setSaving(true);
    try {
      // Optimistic instant state cleanup
      setDevices(prev => prev.filter(d => d.device_id !== id));
      setRegisteredDevices(prev => prev.filter(r => r.id !== id));
      setEditingDevice(null);

      const { success, error } = await deleteDevice(id, name);
      if (success) {
        showToast('✓ Đã xóa thiết bị thành công.');
      } else {
        showToast(`❌ Không thể xóa: ${error?.message || 'Lỗi cơ sở dữ liệu'}`);
      }
      await load();
    } catch {
      showToast('❌ Đã xảy ra lỗi khi xóa thiết bị.');
      await load();
    }
    setSaving(false);
  };

  const assetMap = new Map(assets.map(a => [a.id, a]));
  const onlineDevices = devices.filter(isOnline);
  const offlineDevices = devices.filter(d => !isOnline(d));

  return (
    <div className="space-y-6 animate-fadeIn relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[10000] px-4 py-3 rounded-xl text-xs font-bold text-white shadow-2xl transition animate-bounce"
          style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
            <Radio className="w-6 h-6 text-purple-400" />
            Quản lý Thiết bị Tracker
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            OBD · GPS-only · Web Nguồn Sự Thật · Gán phương tiện
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl transition hover:opacity-80"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsLive(p => !p)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: isLive ? 'rgba(239,68,68,0.85)' : 'linear-gradient(135deg,#8B5CF6,#6366F1)' }}
          >
            {isLive ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            {isLive ? 'Dừng Live' : 'Bật Live'}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {[
          { label: 'Tổng thiết bị', value: devices.length, color: 'var(--text-primary)', icon: Radio },
          { label: 'Online', value: onlineDevices.length, color: 'var(--status-green)', icon: CheckCircle2 },
          { label: 'Offline', value: offlineDevices.length, color: 'var(--status-red)', icon: AlertCircle },
          { label: 'Đang chạy', value: devices.filter(d => d.trip_id).length, color: 'var(--accent-cyan)', icon: Signal },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="p-3 rounded-2xl flex items-center gap-3"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${s.color}20`, color: s.color }}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-extrabold text-sm" style={{ color: s.color }}>{s.value}</p>
                <p style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {lastUpdate && (
        <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
          Cập nhật lần cuối: {lastUpdate.toLocaleString('vi-VN')}
        </p>
      )}

      {/* Device list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Radio className="w-12 h-12 mx-auto opacity-20" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Chưa có thiết bị nào gửi GPS</p>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            Kết nối Android app với Supabase và chạy 1 chuyến để thấy tracker ở đây.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {devices.map((d) => {
            const asset = assetMap.get(d.vehicle_id);
            const online = isOnline(d);
            const isActive = !!d.trip_id;
            return (
              <div key={d.device_id} className="p-4 rounded-2xl space-y-3 relative group"
                style={{
                  background: 'var(--bg-secondary)',
                  border: `1px solid ${online ? 'var(--accent-cyan-border)' : 'var(--border-default)'}`,
                }}>
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white font-bold"
                      style={{ background: online ? 'linear-gradient(135deg,#8B5CF6,#6366F1)' : 'var(--bg-hover)' }}>
                      <Radio className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {d.device_name ?? `Device ${d.device_id.slice(0, 8)}`}
                      </p>
                      <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
                        {d.device_id.slice(0, 18)}…
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleEditDevice(d)}
                      className="p-1.5 rounded-lg transition hover:bg-white/10"
                      style={{ color: 'var(--accent-cyan)' }}
                      title="Chỉnh sửa & gán xe"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDevice(d.device_id, d.device_name || undefined)}
                      className="p-1.5 rounded-lg transition text-rose-400 hover:bg-rose-500/10"
                      title="Xóa thiết bị"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        background: online ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                        color: online ? 'var(--status-green)' : 'var(--text-muted)',
                      }}>
                      {online ? '● Online' : '○ Offline'}
                    </span>
                  </div>
                </div>

                {/* Vehicle link */}
                <div className="flex items-center justify-between text-xs p-2 rounded-xl"
                  style={{ background: 'var(--bg-hover)' }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Car className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <span className="truncate" style={{ color: 'var(--text-secondary)' }}>
                      {asset ? `${asset.name} (${asset.license_plate || asset.brand})` : 'Chưa gán xe'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleEditDevice(d)}
                    className="text-[10px] font-semibold text-cyan-400 hover:underline shrink-0 ml-1"
                  >
                    Đổi xe
                  </button>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Tốc độ</p>
                    <p className="font-bold" style={{ color: 'var(--accent-cyan)' }}>
                      {d.speed_kmh != null ? `${d.speed_kmh.toFixed(0)} km/h` : '—'}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Trạng thái</p>
                    <p className="font-bold" style={{ color: isActive ? 'var(--status-green)' : 'var(--text-muted)' }}>
                      {isActive ? '🚀 Đang chạy' : '⊙ Dừng'}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl col-span-2" style={{ background: 'var(--bg-hover)' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Vị trí GPS</p>
                    <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {d.lat.toFixed(6)}, {d.lng.toFixed(6)}
                    </p>
                  </div>
                </div>

                {/* Last seen */}
                <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--text-faint)' }}>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>Lần cuối: {getLastSeenText(d.recorded_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT & DEVICE ASSIGNMENT MODAL */}
      {editingDevice && (
        <DraggableModal isOpen={true} onClose={() => () => {}}>
<div className="cursor-grab active:cursor-grabbing relative w-[90vw] sm:w-[600px] max-w-md p-6 rounded-2xl space-y-4 border shadow-2xl animate-scaleIn"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <h3 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Edit3 className="w-5 h-5 text-cyan-400" />
                  Chỉnh sửa & Gán xe cho Thiết bị
                </h3>
                <button onClick={() => setEditingDevice(null)} className="p-1 rounded-lg hover:bg-white/10">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block mb-1 font-bold" style={{ color: 'var(--text-muted)' }}>Device ID (UUID)</label>
                  <input
                    type="text"
                    disabled
                    value={editingDevice.id}
                    className="w-full p-2.5 rounded-xl font-mono text-[11px]"
                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold" style={{ color: 'var(--text-primary)' }}>Tên thiết bị (Tracker Name)</label>
                  <input
                    type="text"
                    value={editingDevice.name}
                    onChange={e => setEditingDevice({ ...editingDevice, name: e.target.value })}
                    placeholder="VD: Tracker xe đạp Uti"
                    className="w-full p-2.5 rounded-xl"
                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold" style={{ color: 'var(--text-primary)' }}>Phương tiện gán (`vehicle_id`)</label>
                  <select
                    value={editingDevice.vehicleId}
                    onChange={e => setEditingDevice({ ...editingDevice, vehicleId: e.target.value })}
                    className="w-full p-2.5 rounded-xl text-xs font-medium"
                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  >
                    <option value="">-- Chưa gán xe --</option>
                    {assets.map(a => (
                      <option key={a.id} value={a.id}>
                        🚗 {a.name} ({a.license_plate || a.brand}) — {a.asset_type}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>
                    Gán xe ở đây sẽ đồng bộ tức thì về Android app khi app gọi `get_fleet_vehicles`.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block mb-1 font-bold" style={{ color: 'var(--text-primary)' }}>Loại thiết bị</label>
                    <select
                      value={editingDevice.deviceType}
                      onChange={e => setEditingDevice({ ...editingDevice, deviceType: e.target.value })}
                      className="w-full p-2.5 rounded-xl"
                      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    >
                      <option value="GPS-TRACKER">GPS-TRACKER (Xe đạp)</option>
                      <option value="ELM327-BT">ELM327-BT (OBD Ô tô)</option>
                      <option value="ZESTECH_ADAS">ZESTECH ADAS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-bold" style={{ color: 'var(--text-primary)' }}>Bluetooth MAC (nếu có)</label>
                    <input
                      type="text"
                      value={editingDevice.macAddress}
                      onChange={e => setEditingDevice({ ...editingDevice, macAddress: e.target.value })}
                      placeholder="AA:BB:CC:11:22:33"
                      className="w-full p-2.5 rounded-xl font-mono text-[11px]"
                      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button
                  onClick={() => handleDeleteDevice(editingDevice.id, editingDevice.name)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa thiết bị
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingDevice(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/10"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Hủy
                  </button>
                  <button
                    disabled={saving}
                    onClick={handleSaveDevice}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </div>
            
</div>
</DraggableModal>

      )}
    </div>
  );
}
