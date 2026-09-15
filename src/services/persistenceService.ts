import { CameraSourceItem, SystemAlert, VideoAnalysisStats } from '../types';

const api = async <T>(path:string, init?:RequestInit):Promise<T> => {
  const r = await fetch(path, { headers:{'Content-Type':'application/json', ...(init?.headers||{})}, ...init });
  if (!r.ok) throw new Error((await r.text()) || `API ${r.status}`);
  return r.json();
};

export const persistenceService = {
  health:()=>api<{ok:boolean;sqlite:boolean;node:string}>('/api/health'),
  cameras:()=>api<CameraSourceItem[]>('/api/cameras'),
  saveCamera:(camera:CameraSourceItem)=>api('/api/cameras',{method:'POST',body:JSON.stringify(camera)}),
  removeCamera:(id:string)=>api(`/api/cameras/${encodeURIComponent(id)}`,{method:'DELETE'}),
  alerts:()=>api<SystemAlert[]>('/api/alerts'),
  saveAlert:(alert:SystemAlert)=>api('/api/alerts',{method:'POST',body:JSON.stringify(alert)}),
  acknowledgeAlert:(id:number)=>api(`/api/alerts/${id}`,{method:'PATCH',body:JSON.stringify({acknowledged:true})}),
  createVideoRun:(payload:Record<string,unknown>)=>api<{ok:boolean;id:string}>('/api/video-runs',{method:'POST',body:JSON.stringify(payload)}),
  updateVideoRun:(id:string,payload:Record<string,unknown>)=>api(`/api/video-runs/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(payload)}),
  saveDetections:(id:string,items:unknown[])=>items.length?api(`/api/video-runs/${encodeURIComponent(id)}/detections`,{method:'POST',body:JSON.stringify({items})}):Promise.resolve({ok:true}),
  statistics:()=>api<{totals:any[];unique:any[];videos:number;cameras:number}>('/api/statistics'),
};

export type PersistedVideoSummary = { id:string; filename:string; duration:number; status:string; progress:number; current_frame:number; total_detections:number; unique_person:number; unique_car:number; unique_bicycle:number; unique_camera:number; created_at:string; updated_at:string };
export const persistVideoCompletion = async (id:string,filename:string,duration:number,stats:VideoAnalysisStats) => persistenceService.updateVideoRun(id,{status:'COMPLETED',progress:100,currentFrame:0,totalDetections:stats.totalDetections.person+stats.totalDetections.car+stats.totalDetections.bicycle+stats.totalDetections.camera,uniquePerson:stats.uniqueObjects.person,uniqueCar:stats.uniqueObjects.car,uniqueBicycle:stats.uniqueObjects.bicycle,uniqueCamera:stats.uniqueObjects.camera});
