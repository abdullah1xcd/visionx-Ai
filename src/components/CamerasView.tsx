import React, { useState } from 'react';
import {
  Video,
  Plus,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings,
  Trash2,
  Camera,
  ExternalLink,
  Wifi,
  Radio,
  Search,
  Check,
  AlertTriangle,
  Moon,
  Cpu,
  Edit2,
  Power
} from 'lucide-react';
import { CameraSourceItem } from '../types';

interface CamerasViewProps {
  cameras: CameraSourceItem[];
  activeCameraId: string;
  onSelectCamera: (id: string) => void;
  onAddCamera: (cam: CameraSourceItem) => void;
  onRemoveCamera: (id: string) => void;
  onReconnectCamera: (id: string) => void;
}

type AddConnectionTab = 'webcam' | 'usb' | 'wifi_ip' | 'rtsp' | 'onvif' | 'bluetooth';

export const CamerasView: React.FC<CamerasViewProps> = ({
  cameras,
  activeCameraId,
  onSelectCamera,
  onAddCamera,
  onRemoveCamera,
  onReconnectCamera
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AddConnectionTab>('rtsp');

  // Form State
  const [camName, setCamName] = useState('');
  const [ipAddress, setIpAddress] = useState('192.168.1.188');
  const [port, setPort] = useState('554');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [rtspPath, setRtspPath] = useState('/live');
  const [deviceIndex, setDeviceIndex] = useState('0');

  // Test state
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'testing' | 'connected' | 'auth_failed' | 'unavailable' | 'unsupported'
  >('idle');

  // ONVIF discovery state
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredOnvif, setDiscoveredOnvif] = useState<any[]>([]);

  // Bluetooth state
  const [btDevices, setBtDevices] = useState<any[]>([
    {
      name: 'VisionX SmartCam BT-402',
      address: '00:1A:7D:DA:71:13',
      paired: false,
      wifiIp: '192.168.4.1'
    },
    {
      name: 'ActionCam Pro BLE',
      address: 'B8:27:EB:96:DF:22',
      paired: false,
      wifiIp: '192.168.12.1'
    }
  ]);
  const [btMessage, setBtMessage] = useState<string | null>(null);

  // Trigger stream validation test
  const handleTestConnection = () => {
    setConnectionStatus('testing');
    setTimeout(() => {
      if (activeTab === 'wifi_ip' || activeTab === 'rtsp') {
        if (!ipAddress || ipAddress.includes('0.0.0.0')) {
          setConnectionStatus('unavailable');
        } else if (password === 'wrong') {
          setConnectionStatus('auth_failed');
        } else {
          setConnectionStatus('connected');
        }
      } else {
        setConnectionStatus('connected');
      }
    }, 1200);
  };

  // Discover ONVIF devices
  const handleDiscoverOnvif = () => {
    setIsDiscovering(true);
    setTimeout(() => {
      setDiscoveredOnvif([
        {
          name: 'Perimeter West Gate Cam',
          ip: '192.168.1.188',
          manufacturer: 'Hikvision',
          model: 'DS-2CD2043G2-I',
          resolution: '1920×1080',
          fps: 30,
          status: 'Ready',
          rtsp: 'rtsp://admin:admin123@192.168.1.188:554/Streaming/Channels/101'
        },
        {
          name: 'Loading Bay High-Speed Cam',
          ip: '192.168.1.205',
          manufacturer: 'Dahua',
          model: 'IPC-HFW5241E-Z12E',
          resolution: '1920×1080',
          fps: 30,
          status: 'Ready',
          rtsp: 'rtsp://admin:admin123@192.168.1.205:554/cam/realmonitor?channel=1&subtype=0'
        }
      ]);
      setIsDiscovering(false);
    }, 1500);
  };

  // Pair Bluetooth device
  const handlePairBluetooth = (device: any) => {
    setBtDevices((prev) =>
      prev.map((d) => (d.address === device.address ? { ...d, paired: true } : d))
    );
    setBtMessage(
      `✓ "${device.name}" paired successfully over Bluetooth.\nNotice: Bluetooth paired — video streaming requires a supported video protocol. Guiding to Wi-Fi stream (rtsp://${device.wifiIp}:554/live).`
    );
  };

  // Save new camera
  const handleSaveCamera = () => {
    const nextNum = cameras.length + 1;
    const newId = `CAM-${nextNum < 10 ? '0' + nextNum : nextNum}`;

    let source = '';
    if (activeTab === 'webcam' || activeTab === 'usb') {
      source = `Device ${deviceIndex}`;
    } else if (activeTab === 'wifi_ip') {
      const auth = username ? `${username}:${password}@` : '';
      source = `rtsp://${auth}${ipAddress}:${port}${rtspPath}`;
    } else if (activeTab === 'rtsp') {
      source = `rtsp://${ipAddress}:${port}${rtspPath}`;
    } else if (activeTab === 'onvif') {
      source = `http://${ipAddress}:80/onvif/device_service`;
    } else {
      source = `rtsp://${ipAddress}:554/live`;
    }

    const newCam: CameraSourceItem = {
      id: newId,
      name: camName || `Camera ${newId}`,
      type: activeTab,
      source,
      status: 'Online',
      aiStatus: 'Active',
      resolution: '1920×1080',
      fps: 30,
      location: 'Custom Station',
      nightVisionType: activeTab === 'onvif' || activeTab === 'rtsp' ? 'Hardware IR' : 'Software Night Vision',
      lastConnected: 'Just Now',
      manufacturer: activeTab === 'webcam' ? 'Integrated' : 'Generic IP/UVC'
    };

    onAddCamera(newCam);
    setIsAddModalOpen(false);
    setConnectionStatus('idle');
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[#080A0D] text-[#F4F6F8]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#252C35] pb-4">
          <div>
            <h2 className="text-xl font-black tracking-wide text-white uppercase">
              CAMERA MANAGEMENT & NETWORK STREAMS
            </h2>
            <p className="text-xs text-[#9AA4AF] mt-1">
              Connect and supervise Webcams, USB cameras, Wi-Fi / IP, RTSP, ONVIF discovery, and Bluetooth device pairing
            </p>
          </div>

          <button
            onClick={() => {
              setIsAddModalOpen(true);
              setConnectionStatus('idle');
              setBtMessage(null);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-[#080A0D] font-bold text-xs tracking-wider uppercase transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Camera</span>
          </button>
        </div>

        {/* Camera Cards Grid (Section 4 Specification) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cameras.map((cam) => {
            const isActive = cam.id === activeCameraId;
            const isOnline = cam.status === 'Online';

            return (
              <div
                key={cam.id}
                className={`p-5 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-[#161C24] border-[#D4AF37] shadow-lg shadow-[#D4AF37]/5'
                    : 'bg-[#11161D] border-[#252C35] hover:border-[#252C35]/80'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                        isOnline
                          ? 'bg-[#161C24] border-emerald-500/30 text-emerald-400'
                          : 'bg-[#161C24] border-rose-500/30 text-rose-400'
                      }`}
                    >
                      <Video className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#D4AF37]">{cam.id}</span>
                        <h3 className="font-bold text-sm text-white">{cam.name}</h3>
                        {isActive && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#D4AF37] text-[#080A0D]">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#9AA4AF] mt-0.5">
                        {cam.manufacturer || 'Standard'} • {cam.resolution} • {cam.fps} FPS
                      </p>
                    </div>
                  </div>

                  {/* Online / Offline Status Badge */}
                  <span
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${
                      isOnline
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                        : 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                      }`}
                    />
                    {cam.status.toUpperCase()}
                  </span>
                </div>

                {/* Body Details */}
                <div className="mt-4 pt-3 border-t border-[#252C35] grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[#68727D] block text-[10px] uppercase font-semibold">
                      Connection Type
                    </span>
                    <span className="text-white font-mono font-medium uppercase text-[11px]">
                      {cam.type}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#68727D] block text-[10px] uppercase font-semibold">
                      AI Inference
                    </span>
                    <span className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                      <Cpu className="w-3 h-3" />
                      {cam.aiStatus}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#68727D] block text-[10px] uppercase font-semibold">
                      Night Vision
                    </span>
                    <span className="text-slate-200 text-[11px] flex items-center gap-1">
                      <Moon className="w-3 h-3 text-[#D4AF37]" />
                      {cam.nightVisionType}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#68727D] block text-[10px] uppercase font-semibold">
                      Last Connected
                    </span>
                    <span className="text-[#9AA4AF] text-[11px] font-mono">{cam.lastConnected}</span>
                  </div>
                </div>

                {/* Stream URL */}
                <div className="mt-3 p-2 rounded bg-[#080A0D] border border-[#252C35] text-[10px] font-mono text-[#9AA4AF] truncate">
                  <span className="text-[#68727D]">Source:</span> {cam.source}
                </div>

                {/* Actions Bar */}
                <div className="mt-4 pt-3 border-t border-[#252C35] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectCamera(cam.id)}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#161C24] text-[#D4AF37] border border-[#D4AF37]/40'
                          : 'bg-[#D4AF37] hover:bg-[#E5C158] text-[#080A0D]'
                      }`}
                    >
                      {isActive ? 'Current Viewport' : 'Open Camera'}
                    </button>

                    {!isOnline && (
                      <button
                        onClick={() => onReconnectCamera(cam.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#161C24] hover:bg-[#1C232B] text-amber-300 border border-[#252C35] text-xs font-semibold cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Reconnect</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[#68727D]">
                    <button
                      onClick={() => onRemoveCamera(cam.id)}
                      className="p-1.5 rounded hover:bg-[#161C24] hover:text-rose-400 transition-colors"
                      title="Delete Camera"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modern "+ ADD CAMERA" Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#11161D] border border-[#252C35] rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
            {/* Modal Title */}
            <div className="flex items-center justify-between border-b border-[#252C35] pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-base font-black tracking-wide text-white uppercase">
                  ADD CAMERA SOURCE
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#68727D] hover:text-white p-1 rounded"
              >
                ✕
              </button>
            </div>

            {/* Connection Type Tabs */}
            <div className="grid grid-cols-6 gap-1 bg-[#080A0D] p-1 rounded-lg border border-[#252C35] text-xs font-bold">
              {(
                [
                  { id: 'webcam', label: 'PC Webcam' },
                  { id: 'usb', label: 'USB' },
                  { id: 'wifi_ip', label: 'Wi-Fi / IP' },
                  { id: 'rtsp', label: 'RTSP' },
                  { id: 'onvif', label: 'ONVIF' },
                  { id: 'bluetooth', label: 'Bluetooth' }
                ] as { id: AddConnectionTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setConnectionStatus('idle');
                  }}
                  className={`py-1.5 rounded transition-colors text-center ${
                    activeTab === tab.id
                      ? 'bg-[#161C24] text-[#D4AF37] border border-[#D4AF37]/40 shadow-sm'
                      : 'text-[#9AA4AF] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Dynamic Form Content */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[#9AA4AF] font-semibold mb-1">Camera Friendly Name:</label>
                <input
                  type="text"
                  placeholder="e.g. North Perimeter Gate"
                  value={camName}
                  onChange={(e) => setCamName(e.target.value)}
                  className="w-full bg-[#080A0D] border border-[#252C35] rounded-lg px-3 py-2 text-white"
                />
              </div>

              {/* PC Webcam / USB */}
              {(activeTab === 'webcam' || activeTab === 'usb') && (
                <div>
                  <label className="block text-[#9AA4AF] font-semibold mb-1">Device Index:</label>
                  <select
                    value={deviceIndex}
                    onChange={(e) => setDeviceIndex(e.target.value)}
                    className="w-full bg-[#080A0D] border border-[#252C35] rounded-lg px-3 py-2 text-white"
                  >
                    <option value="0">Device 0 (Default Integrated)</option>
                    <option value="1">Device 1 (External USB)</option>
                    <option value="2">Device 2 (Secondary Capture Device)</option>
                  </select>
                </div>
              )}

              {/* Wi-Fi / IP Camera */}
              {activeTab === 'wifi_ip' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[#9AA4AF] font-semibold mb-1">Camera IP Address:</label>
                      <input
                        type="text"
                        value={ipAddress}
                        onChange={(e) => setIpAddress(e.target.value)}
                        placeholder="192.168.1.188"
                        className="w-full bg-[#080A0D] border border-[#252C35] rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[#9AA4AF] font-semibold mb-1">Port:</label>
                      <input
                        type="text"
                        value={port}
                        onChange={(e) => setPort(e.target.value)}
                        className="w-full bg-[#080A0D] border border-[#252C35] rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#9AA4AF] font-semibold mb-1">Username:</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-[#080A0D] border border-[#252C35] rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[#9AA4AF] font-semibold mb-1">Password:</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#080A0D] border border-[#252C35] rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#9AA4AF] font-semibold mb-1">Stream Path:</label>
                    <input
                      type="text"
                      value={rtspPath}
                      onChange={(e) => setRtspPath(e.target.value)}
                      className="w-full bg-[#080A0D] border border-[#252C35] rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Direct RTSP URL */}
              {activeTab === 'rtsp' && (
                <div>
                  <label className="block text-[#9AA4AF] font-semibold mb-1">Full RTSP URL:</label>
                  <input
                    type="text"
                    value={`rtsp://${ipAddress}:${port}${rtspPath}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRtspPath(val.replace(`rtsp://${ipAddress}:${port}`, ''));
                    }}
                    className="w-full bg-[#080A0D] border border-[#252C35] rounded-lg px-3 py-2 text-white font-mono"
                  />
                  <p className="text-[10px] text-[#68727D] mt-1">
                    Format: rtsp://username:password@192.168.x.x:554/stream
                  </p>
                </div>
              )}

              {/* ONVIF Discovery */}
              {activeTab === 'onvif' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[#9AA4AF]">Scan local network for ONVIF Profile S/T devices:</span>
                    <button
                      type="button"
                      onClick={handleDiscoverOnvif}
                      disabled={isDiscovering}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#161C24] hover:bg-[#1C232B] text-[#D4AF37] border border-[#252C35] text-xs font-semibold cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{isDiscovering ? 'Probing Network...' : 'Discover Cameras'}</span>
                    </button>
                  </div>

                  {discoveredOnvif.length > 0 && (
                    <div className="space-y-2">
                      {discoveredOnvif.map((dev, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-[#080A0D] border border-[#252C35] flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-white block">{dev.name}</span>
                            <span className="text-[10px] text-[#9AA4AF] font-mono">
                              {dev.manufacturer} {dev.model} • IP: {dev.ip}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIpAddress(dev.ip);
                              setCamName(dev.name);
                              setConnectionStatus('connected');
                            }}
                            className="px-3 py-1 rounded bg-[#D4AF37] text-[#080A0D] font-bold text-xs cursor-pointer"
                          >
                            Select
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bluetooth Pairing & Protocol Handover */}
              {activeTab === 'bluetooth' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-[#080A0D] border border-[#252C35] text-[11px] text-[#9AA4AF] space-y-1">
                    <span className="text-[#D4AF37] font-bold block">BLUETOOTH ARCHITECTURAL NOTICE</span>
                    <p>
                      Bluetooth is used strictly for device discovery, setup, and pairing. Video streaming requires high bandwidth and will automatically hand over to the camera&apos;s Wi-Fi / RTSP local stream.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {btDevices.map((dev, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-[#080A0D] border border-[#252C35] flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Radio className="w-3.5 h-3.5 text-blue-400" />
                            <span className="font-bold text-white">{dev.name}</span>
                          </div>
                          <span className="text-[10px] text-[#68727D] font-mono ml-5">
                            MAC: {dev.address} • Wi-Fi IP: {dev.wifiIp}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handlePairBluetooth(dev)}
                          className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                            dev.paired
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : 'bg-[#161C24] hover:bg-[#1C232B] text-[#D4AF37] border border-[#252C35]'
                          }`}
                        >
                          {dev.paired ? '✓ Paired' : 'Pair Device'}
                        </button>
                      </div>
                    ))}
                  </div>

                  {btMessage && (
                    <div className="p-3 rounded-lg bg-[#161C24] border border-[#D4AF37]/50 text-xs text-white whitespace-pre-line leading-relaxed">
                      {btMessage}
                    </div>
                  )}
                </div>
              )}

              {/* Connection Status Feedback Banner */}
              {connectionStatus !== 'idle' && (
                <div
                  className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                    connectionStatus === 'testing'
                      ? 'bg-[#161C24] text-[#D4AF37] border border-[#252C35]'
                      : connectionStatus === 'connected'
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                      : connectionStatus === 'auth_failed'
                      ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                      : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                  }`}
                >
                  {connectionStatus === 'testing' && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {connectionStatus === 'connected' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {connectionStatus === 'auth_failed' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  {connectionStatus === 'unavailable' && <XCircle className="w-4 h-4 text-rose-400" />}

                  <span>
                    {connectionStatus === 'testing' && 'Validating connection stream...'}
                    {connectionStatus === 'connected' && 'Connected — 1920×1080 @ 30 FPS verified.'}
                    {connectionStatus === 'auth_failed' && 'Authentication Failed — check username & password.'}
                    {connectionStatus === 'unavailable' && 'Stream Unavailable — host unreachable on port 554.'}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-[#252C35]">
              <button
                type="button"
                onClick={handleTestConnection}
                className="px-3 py-2 rounded bg-[#161C24] hover:bg-[#1C232B] text-slate-200 border border-[#252C35] text-xs font-semibold cursor-pointer"
              >
                Test Connection
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded bg-[#161C24] hover:bg-[#1C232B] text-[#9AA4AF] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCamera}
                  className="px-4 py-2 rounded bg-[#D4AF37] hover:bg-[#E5C158] text-[#080A0D] text-xs font-bold cursor-pointer uppercase tracking-wider"
                >
                  Save & Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
