import React,{useEffect,useState}from'react';
import{TitleBar}from'./components/TitleBar';import{Sidebar}from'./components/Sidebar';import{ProductionDashboardView}from'./components/ProductionDashboardView';import{ProductionCamerasView}from'./components/ProductionCamerasView';import{ProductionVideoAnalysisView}from'./components/ProductionVideoAnalysisView';import{ProductionStatisticsView}from'./components/ProductionStatisticsView';import{AlertsView}from'./components/AlertsView';import{SettingsView}from'./components/SettingsView';import{CodeViewerModal}from'./components/CodeViewerModal';import{CameraSourceItem,SystemAlert,AppSettingsState,NightVisionMode}from'./types';import{persistenceService}from'./services/persistenceService';import{detectionService}from'./services/detectionService';
const EMPTY_CAMERA:CameraSourceItem={id:'NO-CAMERA',name:'No Camera Connected',type:'webcam',source:'',status:'Offline',aiStatus:'Standby',resolution:'N/A',fps:0,location:'Not configured',nightVisionType:'Software Night Vision',lastConnected:'Never'};
function Dashboard(){
 const[activeTab,setActiveTab]=useState('dashboard'),[cameras,setCameras]=useState<CameraSourceItem[]>([]),[activeCameraId,setActiveCameraId]=useState('NO-CAMERA'),[alerts,setAlerts]=useState<SystemAlert[]>([]),[isCodeModalOpen,setIsCodeModalOpen]=useState(false),[backend,setBackend]=useState('Detecting...');
 const[settings,setSettings]=useState<AppSettingsState>({appearance:'dark',confidenceThreshold:.45,inferenceResolution:640,classThresholds:{person:.6,car:.5,bicycle:.5,camera:.4},trackingEngine:'ByteTrack',computeDevice:'CPU',speedThreshold:80,calibrationFactor:0,autoEnhancePoorCrops:true,nightVisionMode:'auto',autoNightThreshold:50});
 useEffect(()=>{let alive=true;detectionService.initModel().then(()=>{if(alive)setBackend(detectionService.getStatus().device)});persistenceService.cameras().then(setCameras).catch(()=>{});persistenceService.alerts().then(setAlerts).catch(()=>{});return()=>{alive=false}},[]);
 const activeCamera=cameras.find(c=>c.id===activeCameraId)||cameras[0]||EMPTY_CAMERA;const unreadAlertsCount=alerts.filter(a=>!a.acknowledged).length;
 const handleAddAlert=async(msg:string,type:SystemAlert['type'],severity:SystemAlert['severity'])=>{const a:SystemAlert={id:Date.now(),timestamp:new Date().toTimeString().split(' ')[0],type,severity,message:msg,cameraId:activeCameraId,acknowledged:false};setAlerts(p=>[a,...p]);try{await persistenceService.saveAlert(a)}catch{}};
 const handleAddCamera=async(cam:CameraSourceItem)=>{setCameras(p=>[...p,cam]);setActiveCameraId(cam.id);try{await persistenceService.saveCamera(cam)}catch{}};
 const handleRemoveCamera=async(id:string)=>{setCameras(p=>p.filter(c=>c.id!==id));if(activeCameraId===id)setActiveCameraId('NO-CAMERA');try{await persistenceService.removeCamera(id)}catch{}};
 const handleReconnectCamera=(id:string)=>setCameras(p=>p.map(c=>c.id===id?{...c,status:'Connecting'}:c));
 const handleCycleNightVision=()=>setSettings(p=>({...p,nightVisionMode:p.nightVisionMode==='auto'?'night':p.nightVisionMode==='night'?'day':'auto'}));
 return <div className="flex flex-col h-[100dvh] min-h-0 w-full overflow-hidden bg-[#080A0D] font-sans antialiased text-[#F4F6F8]"><TitleBar activeCameraName={`${activeCamera.id} (${activeCamera.name})`} fps={0} computeDevice={backend} nightVisionMode={settings.nightVisionMode} isNightVisionActive={settings.nightVisionMode==='night'} onToggleDevice={()=>{}} onCycleNightVision={handleCycleNightVision} onOpenCode={()=>setIsCodeModalOpen(true)}/><div className="relative flex-1 min-h-0 flex overflow-hidden"><Sidebar activeTab={activeTab} onTabChange={setActiveTab} unreadAlertsCount={unreadAlertsCount} computeDevice={backend}/><main className="min-w-0 min-h-0 flex-1 flex overflow-hidden bg-[#080A0D] pb-16 md:pb-0">{activeTab==='dashboard'&&<ProductionDashboardView settings={settings} activeCamera={activeCamera} onAddAlert={handleAddAlert}/>} {activeTab==='cameras'&&<ProductionCamerasView cameras={cameras} activeCameraId={activeCameraId} onSelectCamera={id=>{setActiveCameraId(id);setActiveTab('dashboard')}} onAddCamera={handleAddCamera} onRemoveCamera={handleRemoveCamera} onReconnectCamera={handleReconnectCamera}/>} {activeTab==='video_analysis'&&<ProductionVideoAnalysisView settings={settings} onAddAlert={handleAddAlert}/>} {activeTab==='statistics'&&<ProductionStatisticsView/>} {activeTab==='alerts'&&<AlertsView alerts={alerts} onAcknowledgeAlert={id=>{setAlerts(p=>p.map(a=>a.id===id?{...a,acknowledged:true}:a));void persistenceService.acknowledgeAlert(id)}} onAcknowledgeAll={()=>setAlerts(p=>p.map(a=>({...a,acknowledged:true})))}/>} {activeTab==='settings'&&<SettingsView settings={settings} onUpdateSettings={v=>setSettings(p=>({...p,...v}))}/>}</main></div>{isCodeModalOpen&&<CodeViewerModal onClose={()=>setIsCodeModalOpen(false)}/>}</div>;
}


import { useEffect as useAuthEffect, useState as useAuthState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import AuthScreen from './components/AuthScreen';

export default function App() {
  const [user, setUser] = useAuthState<User | null>(null);
  const [authLoading, setAuthLoading] = useAuthState(true);

  useAuthEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.error('Supabase session check failed:', error.message);
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (authLoading) {
    return <div className="min-h-screen bg-[#080A0D] text-white grid place-items-center"><div className="text-sm text-slate-400">Checking secure session…</div></div>;
  }
  if (!supabase || !user) return <AuthScreen configurationMissing={!supabase} />;
  return <div className="relative h-full w-full"><Dashboard /><div className="fixed right-3 top-3 z-[100] flex items-center gap-2 rounded-xl border border-white/10 bg-[#10151d]/95 px-3 py-2 text-xs text-slate-300 shadow-xl backdrop-blur"><span className="max-w-[160px] truncate">{user.email}</span><button className="rounded-lg bg-white/10 px-2.5 py-1.5 font-semibold text-white hover:bg-white/20" onClick={() => void supabase.auth.signOut()}>Sign out</button></div></div>;
}
