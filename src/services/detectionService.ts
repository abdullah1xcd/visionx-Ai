import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { CategoryType, DetectionQualityStatus } from '../types';

export interface DetectionResult { class_id:number; class_name:string; category:CategoryType; confidence:number; x1:number; y1:number; x2:number; y2:number; tracking_id:number; timestamp:string; frame_number:number; }
export type AIEngineStatus='INITIALIZING'|'ACTIVE'|'DEGRADED'|'ERROR'|'NOT_READY';
export interface DiagnosticsData { modelName:string; modelStatus:AIEngineStatus; device:string; inputResolution:string; inferenceResolution:string; inferenceFps:number; cameraFps:number; lastInferenceMs:number; totalDetectionsCurrentFrame:number; currentCounts:{person:number;car:number;bicycle:number;camera:number}; uniqueTrackedCounts:{person:number;car:number;bicycle:number;camera:number}; trackingMethod:string; recentLogs:string[]; }
export interface EngineTestResult { modelLoaded:boolean; frameCaptured:boolean; inferenceSuccess:boolean; device:string; inferenceTimeMs:number; detectedCount:number; detections:{class_name:string;confidence:number;bbox:[number,number,number,number]}[]; timestamp:string; }
type Source=HTMLVideoElement|HTMLCanvasElement|HTMLImageElement;
type BackendDetection={class_id:number;class_name:string;category:'person'|'car'|'bicycle';confidence:number;x1:number;y1:number;x2:number;y2:number;tracking_id:number};

class RealDetectionService {
 private model:cocoSsd.ObjectDetection|null=null; private isModelLoading=false; private engineStatus:AIEngineStatus='INITIALIZING'; private statusMessage='Initializing VisionX AI Engine...'; private deviceName='Detecting...'; private backendAvailable=false; private nextTrackId=1;
 private activeTracks:{id:number;category:CategoryType;bbox:[number,number,number,number];confidence:number;lastSeenFrame:number;hits:number}[]=[];
 private uniqueCategoryTrackIds={person:new Set<number>(),car:new Set<number>(),bicycle:new Set<number>(),camera:new Set<number>()};
 private lastInferenceTimeMs=0; private inferenceFrameTimes:number[]=[]; private diagnosticLogs:string[]=[]; private isInferenceRunning=false;

 constructor(){this.initModel();}

 async initModel(){
  if(this.isModelLoading)return false; this.isModelLoading=true; this.engineStatus='INITIALIZING'; this.addLog('Checking Python YOLO/ByteTrack engine...');
  try{
   const r=await fetch('http://127.0.0.1:8000/health',{signal:AbortSignal.timeout(2500)});
   if(r.ok){const data=await r.json();if(data.ok){this.backendAvailable=true;this.deviceName=String(data.device||'CPU');this.engineStatus='ACTIVE';this.statusMessage='YOLO + ByteTrack Active ('+(data.model||'YOLO')+')';this.addLog('Python vision engine ready: '+(data.model||'YOLO')+' on '+(data.device||'CPU')+'.');return true;}}
  }catch{}
  try{
   await tf.ready();const backend=tf.getBackend();this.deviceName=backend==='webgl'?'WebGL (GPU Fallback)':backend==='wasm'?'WASM (CPU Fallback)':backend.toUpperCase()+' (CPU Fallback)';
   this.model=await cocoSsd.load({base:'mobilenet_v2'});this.engineStatus='DEGRADED';this.statusMessage='Browser fallback active — install Python AI engine for YOLO accuracy.';this.addLog('Python engine unavailable; using COCO-SSD browser fallback.');return true;
  }catch(e:any){this.engineStatus='ERROR';this.statusMessage='Model Load Error: '+(e?.message||'Failed');this.addLog('FATAL: '+this.statusMessage);return false;}
  finally{this.isModelLoading=false;}
 }

 getStatus(){return{status:this.engineStatus,message:this.statusMessage,device:this.deviceName};}
 isReady(){return this.engineStatus==='ACTIVE'||this.engineStatus==='DEGRADED';}
 private getSize(source:Source){const w=source instanceof HTMLVideoElement?source.videoWidth:source instanceof HTMLImageElement?source.naturalWidth:source.width;const h=source instanceof HTMLVideoElement?source.videoHeight:source instanceof HTMLImageElement?source.naturalHeight:source.height;return{w,h};}
 private async sourceToDataUrl(source:Source){
  const {w,h}=this.getSize(source);const scale=Math.min(1,960/Math.max(w,h));const cw=Math.max(1,Math.round(w*scale)),ch=Math.max(1,Math.round(h*scale));
  const c=document.createElement('canvas');c.width=cw;c.height=ch;const ctx=c.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas unavailable');ctx.drawImage(source,0,0,cw,ch);
  return{data:c.toDataURL('image/jpeg',0.78),scaleX:w/cw,scaleY:h/ch,w,h};
 }

 async detectFrame(source:Source,frameNumber:number,threshold=0.4):Promise<DetectionResult[]>{
  if(!this.isReady()||this.isInferenceRunning)return[];this.isInferenceRunning=true;const t0=performance.now();
  try{
   if(this.backendAvailable){
    try{
     const payload=await this.sourceToDataUrl(source);
     const response=await fetch('http://127.0.0.1:8000/detect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:payload.data,frame_number:frameNumber,confidence:threshold,iou:0.5})});
     if(!response.ok)throw new Error('YOLO backend HTTP '+response.status);
     const data=await response.json() as {detections:BackendDetection[];inference_ms:number;device:string};
     this.lastInferenceTimeMs=Number(data.inference_ms)||Math.round(performance.now()-t0);this.deviceName=String(data.device||this.deviceName);this.engineStatus='ACTIVE';
     const now=performance.now();this.inferenceFrameTimes.push(now);if(this.inferenceFrameTimes.length>30)this.inferenceFrameTimes.shift();const timestamp=new Date().toLocaleTimeString('en-GB');
     return data.detections.map(d=>({class_id:d.class_id,class_name:d.class_name,category:d.category,confidence:d.confidence,x1:d.x1*payload.scaleX,y1:d.y1*payload.scaleY,x2:d.x2*payload.scaleX,y2:d.y2*payload.scaleY,tracking_id:d.tracking_id,timestamp,frame_number:frameNumber}));
    }catch(e){this.backendAvailable=false;this.engineStatus='DEGRADED';this.addLog('YOLO backend unavailable: '+(e instanceof Error?e.message:String(e))+'. Switching to browser fallback.');if(!this.model)await this.initModel();}
   }
   if(!this.model)throw new Error('No detection engine available');
   const raw=await this.model.detect(source as any);this.lastInferenceTimeMs=Math.round(performance.now()-t0);const {w,h}=this.getSize(source);
   const valid=raw.map(p=>{const category=this.mapCategory(p.class);const [x,y,bw,bh]=p.bbox;return category?{category,class_name:p.class,confidence:Number(p.score),bbox:[Math.max(0,Math.min(w,x)),Math.max(0,Math.min(h,y)),Math.max(0,Math.min(w,x+bw)),Math.max(0,Math.min(h,y+bh))] as [number,number,number,number]}:null}).filter((d):d is {category:CategoryType;class_name:string;confidence:number;bbox:[number,number,number,number]}=>!!d&&d.confidence>=threshold&&d.confidence<=1&&d.bbox[2]>d.bbox[0]&&d.bbox[3]>d.bbox[1]);
   return this.updateSpatialTracker(valid,frameNumber);
  }catch(e){this.addLog('Inference error: '+(e instanceof Error?e.message:String(e)));return[];}finally{this.isInferenceRunning=false;}
 }

 private mapCategory(c:string):CategoryType|null{const x=c.toLowerCase().trim();if(x==='person')return'person';if(x==='car'||x==='truck'||x==='bus'||x==='motorcycle')return'car';if(x==='bicycle')return'bicycle';return null;}
 private updateSpatialTracker(dets:{category:CategoryType;class_name:string;confidence:number;bbox:[number,number,number,number]}[],frame:number){
  const timestamp=new Date().toLocaleTimeString('en-GB');const matched=new Set<number>();const out:DetectionResult[]=[];
  for(const d of dets){let best=.3,idx=-1;for(let i=0;i<this.activeTracks.length;i++){const t=this.activeTracks[i];if(matched.has(i)||t.category!==d.category)continue;const iou=this.iou(d.bbox,t.bbox);if(iou>best){best=iou;idx=i;}}
   let id:number;if(idx>=0){matched.add(idx);const t=this.activeTracks[idx];t.bbox=d.bbox;t.confidence=d.confidence;t.lastSeenFrame=frame;t.hits++;id=t.id;}else{id=this.nextTrackId++;this.activeTracks.push({id,category:d.category,bbox:d.bbox,confidence:d.confidence,lastSeenFrame:frame,hits:1});this.uniqueCategoryTrackIds[d.category].add(id);}
   out.push({class_id:id,class_name:d.class_name,category:d.category,confidence:d.confidence,x1:d.bbox[0],y1:d.bbox[1],x2:d.bbox[2],y2:d.bbox[3],tracking_id:id,timestamp,frame_number:frame});
  }
  this.activeTracks=this.activeTracks.filter(t=>frame-t.lastSeenFrame<20);return out;
 }
 private iou(a:[number,number,number,number],b:[number,number,number,number]){const l=Math.max(a[0],b[0]),t=Math.max(a[1],b[1]),r=Math.min(a[2],b[2]),bt=Math.min(a[3],b[3]);if(r<=l||bt<=t)return 0;const inter=(r-l)*(bt-t),u=(a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-inter;return u>0?inter/u:0;}
 async testAiEngine(source:Source):Promise<EngineTestResult>{const timestamp=new Date().toLocaleTimeString('en-GB');const t=performance.now();const detections=await this.detectFrame(source,0,.35);return{modelLoaded:this.isReady(),frameCaptured:true,inferenceSuccess:this.isReady(),device:this.deviceName,inferenceTimeMs:Math.round(performance.now()-t),detectedCount:detections.length,detections:detections.map(d=>({class_name:d.class_name,confidence:d.confidence,bbox:[d.x1,d.y1,d.x2-d.x1,d.y2-d.y1]})),timestamp};}
 getDiagnostics(w=0,h=0,cameraFps=0):DiagnosticsData{
  const counts={person:0,car:0,bicycle:0,camera:0};for(const t of this.activeTracks)counts[t.category]++;const n=this.inferenceFrameTimes.length;const fps=n>=2?Math.round(1000*(n-1)/(this.inferenceFrameTimes[n-1]-this.inferenceFrameTimes[0])):0;
  return{modelName:this.backendAvailable?'Ultralytics YOLO + ByteTrack':'COCO-SSD MobileNetV2 fallback',modelStatus:this.engineStatus,device:this.deviceName,inputResolution:w+'x'+h,inferenceResolution:'up to 960px',inferenceFps:fps,cameraFps:Number.isFinite(cameraFps)?cameraFps:0,lastInferenceMs:this.lastInferenceTimeMs,totalDetectionsCurrentFrame:this.activeTracks.length,currentCounts:counts,uniqueTrackedCounts:{person:this.uniqueCategoryTrackIds.person.size,car:this.uniqueCategoryTrackIds.car.size,bicycle:this.uniqueCategoryTrackIds.bicycle.size,camera:this.uniqueCategoryTrackIds.camera.size},trackingMethod:this.backendAvailable?'Ultralytics ByteTrack':'IoU spatial fallback',recentLogs:[...this.diagnosticLogs]};
 }
 resetTracking(){this.nextTrackId=1;this.activeTracks=[];Object.values(this.uniqueCategoryTrackIds).forEach(s=>s.clear());fetch('http://127.0.0.1:8000/reset',{method:'POST'}).catch(()=>{});}
 getQualityStatus():DetectionQualityStatus{return this.engineStatus==='ACTIVE'?'Good':'Poor Visibility';}
 private addLog(m:string){this.diagnosticLogs.push('['+new Date().toLocaleTimeString('en-GB')+'] '+m);if(this.diagnosticLogs.length>30)this.diagnosticLogs.shift();}
}
export const detectionService=new RealDetectionService();export default detectionService;
