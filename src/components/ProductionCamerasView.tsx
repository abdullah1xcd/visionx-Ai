import React, { useEffect, useState } from 'react';
import { Camera, Plus, Trash2, Video, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import { CameraSourceItem } from '../types';

interface Props {
  cameras: CameraSourceItem[];
  activeCameraId: string;
  onSelectCamera: (id: string) => void;
  onAddCamera: (camera: CameraSourceItem) => void;
  onRemoveCamera: (id: string) => void;
  onReconnectCamera: (id: string) => void;
}

export const ProductionCamerasView: React.FC<Props> = ({
  cameras, activeCameraId, onSelectCamera, onAddCamera, onRemoveCamera,
}) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [cameraName, setCameraName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const refreshDevices = async () => {
    setLoading(true);
    setMessage('');
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        throw new Error('Camera discovery requires HTTPS and a supported browser.');
      }
      const available = (await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind === 'videoinput');
      setDevices(available);
      if (!selectedDevice && available[0]) setSelectedDevice('0');
      if (!available.length) setMessage('No camera is currently visible to this browser. Allow camera permission from the Live AI Detection page, then refresh.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to list browser cameras.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refreshDevices(); }, []);

  const addCamera = () => {
    const deviceIndex = Number(selectedDevice);
    if (deviceIndex < 0) {
      setMessage('Select an available browser camera first.');
      return;
    }
    const device = devices[deviceIndex];
    const id = `CAM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const camera: CameraSourceItem = {
      id,
      name: cameraName.trim() || device.label || `Browser Camera ${deviceIndex + 1}`,
      type: deviceIndex === 0 ? 'webcam' : 'usb',
      source: device.deviceId ? `device:${device.deviceId}` : 'default',
      status: 'Offline',
      aiStatus: 'Standby',
      resolution: 'Browser camera',
      fps: 0,
      location: 'This device',
      nightVisionType: 'Software Night Vision',
      lastConnected: 'Never',
    };
    onAddCamera(camera);
    setCameraName('');
    setMessage('Camera saved in this browser. Select OPEN to start a live session.');
  };

  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-[#080A0D] text-white p-3 sm:p-6 pb-24 md:pb-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="text-xl font-black tracking-wider">CAMERA MANAGEMENT</h2>
            <p className="text-xs text-[#9AA4AF] mt-1">Connect cameras available to this browser. Camera permission is requested only when you start a live session.</p>
          </div>
          <button onClick={() => void refreshDevices()} disabled={loading} className="px-4 py-2 border border-[#D4AF37]/50 rounded-lg text-xs font-bold disabled:opacity-50">
            <RefreshCw className={`inline w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> REFRESH DEVICES
          </button>
        </header>

        <section className="bg-[#11161D] border border-[#252C35] rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-[#D4AF37]"><Plus className="w-4 h-4"/><h3 className="text-sm font-bold">ADD A BROWSER CAMERA</h3></div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
            <input value={cameraName} onChange={event => setCameraName(event.target.value)} placeholder="Camera name (optional)" className="min-w-0 p-3 bg-[#080A0D] border border-[#252C35] rounded-lg text-xs"/>
            <select value={selectedDevice} onChange={event => setSelectedDevice(event.target.value)} className="min-w-0 p-3 bg-[#080A0D] border border-[#252C35] rounded-lg text-xs text-white">
              <option value="">Choose a camera</option>
              {devices.map((device, index) => <option key={device.deviceId || index} value={String(index)}>{device.label || `Camera ${index + 1}`}</option>)}
            </select>
            <button onClick={addCamera} disabled={!selectedDevice} className="px-4 py-3 bg-[#D4AF37] text-black rounded-lg text-xs font-bold disabled:opacity-40"><CheckCircle2 className="inline w-4 h-4 mr-1"/> SAVE CAMERA</button>
          </div>
          {message && <p role="status" className="text-xs text-amber-300">{message}</p>}
          <p className="text-[10px] text-[#68727D] flex items-start gap-2"><ShieldCheck className="w-4 h-4 shrink-0"/>Camera names and device references are stored locally in this browser. No camera credentials are uploaded. RTSP/ONVIF network discovery is intentionally unavailable on the public demo.</p>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          {cameras.length ? cameras.map(camera => (
            <article key={camera.id} className={`bg-[#11161D] border rounded-xl p-5 ${camera.id === activeCameraId ? 'border-[#D4AF37]' : 'border-[#252C35]'}`}>
              <div className="flex justify-between gap-3">
                <div className="flex gap-3 min-w-0"><Video className="w-5 h-5 text-[#D4AF37] shrink-0"/><div className="min-w-0"><b className="block truncate">{camera.name}</b><div className="text-[10px] text-[#9AA4AF]">{camera.id} • {camera.type} • {camera.resolution}</div></div></div>
                <span className="text-[10px] font-bold text-[#9AA4AF]">{camera.status.toUpperCase()}</span>
              </div>
              <div className="mt-3 text-[10px] font-mono text-[#68727D]">{camera.location}</div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => onSelectCamera(camera.id)} className="px-3 py-1.5 rounded border border-[#D4AF37]/50 text-xs">OPEN LIVE VIEW</button>
                <button onClick={() => onRemoveCamera(camera.id)} className="px-3 py-1.5 rounded border border-[#252C35] text-xs text-rose-400"><Trash2 className="inline w-3 h-3 mr-1"/>REMOVE</button>
              </div>
            </article>
          )) : <div className="md:col-span-2 bg-[#11161D] border border-[#252C35] rounded-xl p-10 text-center text-[#68727D]"><Camera className="mx-auto w-10 h-10 mb-3"/>No saved browser cameras yet. Add a camera above or use the Live AI Detection page directly.</div>}
        </section>
      </div>
    </div>
  );
};
