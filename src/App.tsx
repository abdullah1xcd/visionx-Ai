import React, { useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { ProductionDashboardView } from './components/ProductionDashboardView';
import { ProductionCamerasView } from './components/ProductionCamerasView';
import { ProductionVideoAnalysisView } from './components/ProductionVideoAnalysisView';
import { ProductionStatisticsView } from './components/ProductionStatisticsView';
import { AlertsView } from './components/AlertsView';
import { SettingsView } from './components/SettingsView';
import { CodeViewerModal } from './components/CodeViewerModal';
import { CameraSourceItem, SystemAlert, AppSettingsState, NightVisionMode } from './types';

const EMPTY_CAMERA: CameraSourceItem = { id:'NO-CAMERA', name:'No Camera Connected', type:'webcam', source:'', status:'Offline', aiStatus:'Standby', resolution:'N/A', fps:0, location:'Not configured', nightVisionType:'Software Night Vision', lastConnected:'Never' };

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [cameras, setCameras] = useState<CameraSourceItem[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>('NO-CAMERA');
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettingsState>({
    appearance:'dark', confidenceThreshold:0.45, inferenceResolution:640,
    classThresholds:{person:0.60,car:0.50,bicycle:0.50,camera:0.40}, trackingEngine:'ByteTrack', computeDevice:'CPU',
    speedThreshold:80, calibrationFactor:0.05, autoEnhancePoorCrops:true, nightVisionMode:'auto', autoNightThreshold:50
  });
  const activeCamera = cameras.find(c=>c.id===activeCameraId) || cameras[0] || EMPTY_CAMERA;
  const unreadAlertsCount = alerts.filter(a=>!a.acknowledged).length;
  const handleAddAlert=(msg:string,type:SystemAlert['type'],severity:SystemAlert['severity'])=>setAlerts(prev=>[{id:Date.now(),timestamp:new Date().toTimeString().split(' ')[0],type,severity,message:msg,cameraId:activeCameraId,acknowledged:false},...prev]);
  const handleAddCamera=(cam:CameraSourceItem)=>{setCameras(prev=>[...prev,cam]);setActiveCameraId(cam.id);};
  const handleRemoveCamera=(id:string)=>{setCameras(prev=>prev.filter(c=>c.id!==id));if(activeCameraId===id)setActiveCameraId('NO-CAMERA');};
  const handleReconnectCamera=(id:string)=>setCameras(prev=>prev.map(c=>c.id===id?{...c,status:'Connecting'}:c));
  const handleCycleNightVision=()=>{const next:NightVisionMode=settings.nightVisionMode==='auto'?'night':settings.nightVisionMode==='night'?'day':'auto';setSettings(p=>({...p,nightVisionMode:next}));};
  return <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#080A0D] font-sans antialiased text-[#F4F6F8]">
    <TitleBar activeCameraName={`${activeCamera.id} (${activeCamera.name})`} fps={0} computeDevice={settings.computeDevice} nightVisionMode={settings.nightVisionMode} isNightVisionActive={settings.nightVisionMode==='night'} onToggleDevice={()=>setSettings(p=>({...p,computeDevice:p.computeDevice==='CPU'?'CUDA':'CPU'}))} onCycleNightVision={handleCycleNightVision} onOpenCode={()=>setIsCodeModalOpen(true)}/>
    <div className="flex-1 flex overflow-hidden"><Sidebar activeTab={activeTab} onTabChange={setActiveTab} unreadAlertsCount={unreadAlertsCount} computeDevice={settings.computeDevice}/><main className="flex-1 flex overflow-hidden bg-[#080A0D]">
      {activeTab==='dashboard'&&<ProductionDashboardView settings={settings} onAddAlert={handleAddAlert}/>} 
      {activeTab==='cameras'&&<ProductionCamerasView cameras={cameras} activeCameraId={activeCameraId} onSelectCamera={id=>{setActiveCameraId(id);setActiveTab('dashboard')}} onAddCamera={handleAddCamera} onRemoveCamera={handleRemoveCamera} onReconnectCamera={handleReconnectCamera}/>} 
      {activeTab==='video_analysis'&&<ProductionVideoAnalysisView settings={settings} onAddAlert={handleAddAlert}/>} 
      {activeTab==='statistics'&&<ProductionStatisticsView/>}
      {activeTab==='alerts'&&<AlertsView alerts={alerts} onAcknowledgeAlert={id=>setAlerts(p=>p.map(a=>a.id===id?{...a,acknowledged:true}:a))} onAcknowledgeAll={()=>setAlerts(p=>p.map(a=>({...a,acknowledged:true})))}/>} 
      {activeTab==='settings'&&<SettingsView settings={settings} onUpdateSettings={v=>setSettings(p=>({...p,...v}))}/>} 
    </main></div>
    {isCodeModalOpen&&<CodeViewerModal onClose={()=>setIsCodeModalOpen(false)}/>} 
  </div>;
}
