import React, { useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CamerasView } from './components/CamerasView';
import { VideoAnalysisView } from './components/VideoAnalysisView';
import { StatisticsView } from './components/StatisticsView';
import { AlertsView } from './components/AlertsView';
import { SettingsView } from './components/SettingsView';
import { CodeViewerModal } from './components/CodeViewerModal';
import { CameraSourceItem, SystemAlert, AppSettingsState, NightVisionMode } from './types';
import { INITIAL_CAMERAS, INITIAL_ALERTS } from './data/mockData';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [cameras, setCameras] = useState<CameraSourceItem[]>(INITIAL_CAMERAS);
  const [activeCameraId, setActiveCameraId] = useState<string>('CAM-01');
  const [alerts, setAlerts] = useState<SystemAlert[]>(INITIAL_ALERTS);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);

  const [settings, setSettings] = useState<AppSettingsState>({
    appearance: 'dark',
    confidenceThreshold: 0.45,
    inferenceResolution: 640,
    classThresholds: {
      person: 0.60,
      car: 0.50,
      bicycle: 0.50,
      camera: 0.40
    },
    trackingEngine: 'ByteTrack',
    computeDevice: 'CUDA',
    speedThreshold: 80,
    calibrationFactor: 0.05,
    autoEnhancePoorCrops: true,
    nightVisionMode: 'auto',
    autoNightThreshold: 50
  });

  const activeCamera = cameras.find((c) => c.id === activeCameraId) || cameras[0];
  const unreadAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  const handleToggleDevice = () => {
    setSettings((prev) => ({
      ...prev,
      computeDevice: prev.computeDevice === 'CUDA' ? 'CPU' : 'CUDA'
    }));
  };

  const handleCycleNightVision = () => {
    const nextMode: NightVisionMode =
      settings.nightVisionMode === 'auto'
        ? 'night'
        : settings.nightVisionMode === 'night'
        ? 'day'
        : 'auto';
    setSettings((prev) => ({ ...prev, nightVisionMode: nextMode }));
  };

  const handleAddAlert = (
    msg: string,
    type: 'SPEED_WARNING' | 'CAMERA_STATUS' | 'OCR_LOW_CONFIDENCE' | 'QUALITY_ALERT',
    severity: 'WARNING' | 'INFO' | 'CRITICAL'
  ) => {
    const newAlert: SystemAlert = {
      id: Date.now(),
      timestamp: new Date().toTimeString().split(' ')[0],
      type,
      severity,
      message: msg,
      cameraId: activeCameraId,
      acknowledged: false
    };
    setAlerts((prev) => [newAlert, ...prev]);
  };

  const handleAcknowledgeAlert = (id: number) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  };

  const handleAcknowledgeAll = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })));
  };

  const handleAddCamera = (newCam: CameraSourceItem) => {
    setCameras((prev) => [...prev, newCam]);
    handleAddAlert(`Camera ${newCam.id} (${newCam.name}) registered.`, 'CAMERA_STATUS', 'INFO');
  };

  const handleRemoveCamera = (id: string) => {
    setCameras((prev) => prev.filter((c) => c.id !== id));
  };

  const handleReconnectCamera = (id: string) => {
    setCameras((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'Online' } : c)));
    handleAddAlert(`Camera ${id} reconnected successfully.`, 'CAMERA_STATUS', 'INFO');
  };

  const handleSelectCamera = (id: string) => {
    setActiveCameraId(id);
    setActiveTab('dashboard');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#080A0D] font-sans antialiased text-[#F4F6F8]">
      {/* 1. Windows App Title Bar */}
      <TitleBar
        activeCameraName={`${activeCamera.id} (${activeCamera.name})`}
        fps={29}
        computeDevice={settings.computeDevice}
        nightVisionMode={settings.nightVisionMode}
        isNightVisionActive={settings.nightVisionMode === 'night'}
        onToggleDevice={handleToggleDevice}
        onCycleNightVision={handleCycleNightVision}
        onOpenCode={() => setIsCodeModalOpen(true)}
      />

      {/* 2. Main Shell Layout: Sidebar + Active Page */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          unreadAlertsCount={unreadAlertsCount}
          computeDevice={settings.computeDevice}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 flex overflow-hidden bg-[#080A0D]">
          {activeTab === 'dashboard' && (
            <DashboardView
              settings={settings}
              onAddAlert={handleAddAlert}
            />
          )}

          {activeTab === 'cameras' && (
            <CamerasView
              cameras={cameras}
              activeCameraId={activeCameraId}
              onSelectCamera={handleSelectCamera}
              onAddCamera={handleAddCamera}
              onRemoveCamera={handleRemoveCamera}
              onReconnectCamera={handleReconnectCamera}
            />
          )}

          {activeTab === 'video_analysis' && (
            <VideoAnalysisView
              settings={settings}
              onAddAlert={handleAddAlert}
            />
          )}

          {activeTab === 'statistics' && (
            <StatisticsView />
          )}

          {activeTab === 'alerts' && (
            <AlertsView
              alerts={alerts}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onAcknowledgeAll={handleAcknowledgeAll}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={(newVals) => setSettings((prev) => ({ ...prev, ...newVals }))}
            />
          )}
        </main>
      </div>

      {/* Python Backend & Build Spec Modal */}
      {isCodeModalOpen && (
        <CodeViewerModal onClose={() => setIsCodeModalOpen(false)} />
      )}
    </div>
  );
}
