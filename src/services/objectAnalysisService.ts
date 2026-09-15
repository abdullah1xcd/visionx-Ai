import { DetectionResult } from '../types';
import { estimateSpeedKmh } from './speedService';

export interface ObjectAnalysisInfo {
  trackId:number;
  category:'person'|'car'|'bicycle'|'camera';
  confidence:number;
  color:string;
  colorConfidence:number;
  activity:string;
  posture:string;
  direction:string;
  speedKmh:number|null;
  speedCalibrated:boolean;
  speedReason:string;
  vehicleType:string;
  plateStatus:string;
  quality:string;
}

const colorNames=[
  ['black',[0,0,0]],['white',[255,255,255]],['gray',[128,128,128]],['red',[210,45,45]],
  ['orange',[235,130,35]],['yellow',[225,200,45]],['green',[55,160,80]],['blue',[55,120,205]],
  ['purple',[135,75,185]],['pink',[220,110,155]],['brown',[125,80,45]],['beige',[205,180,130]]
] as const;

function classifyColor(r:number,g:number,b:number){
  const max=Math.max(r,g,b),min=Math.min(r,g,b);
  if(max<55)return ['black',0.96] as const;
  if(min>205)return ['white',0.95] as const;
  if(max-min<25)return ['gray',0.88] as const;
  let best='gray',bestD=Infinity;
  for(const [name,c] of colorNames){const d=Math.hypot(r-c[0],g-c[1],b-c[2]);if(d<bestD){bestD=d;best=name;}}
  return [best,Math.max(0,Math.min(0.98,1-bestD/300))] as const;
}

export function estimateCropColor(source:CanvasImageSource,bbox:[number,number,number,number]){
  const c=document.createElement('canvas');c.width=96;c.height=96;const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)return{color:'Unknown',confidence:0};
  const w=source instanceof HTMLVideoElement?source.videoWidth:source instanceof HTMLImageElement?source.naturalWidth:(source as HTMLCanvasElement).width;
  const h=source instanceof HTMLVideoElement?source.videoHeight:source instanceof HTMLImageElement?source.naturalHeight:(source as HTMLCanvasElement).height;
  const x=Math.max(0,Math.min(w-1,bbox[0])),y=Math.max(0,Math.min(h-1,bbox[1])),bw=Math.max(1,Math.min(w-x,bbox[2]-bbox[0])),bh=Math.max(1,Math.min(h-y,bbox[3]-bbox[1]));
  ctx.drawImage(source,x,y,bw,bh,0,0,96,96);const p=ctx.getImageData(0,0,96,96).data;let rr=0,gg=0,bb=0,n=0;
  for(let i=0;i<p.length;i+=16){const a=p[i+3];if(a<220)continue;rr+=p[i];gg+=p[i+1];bb+=p[i+2];n++;}
  if(!n)return{color:'Unknown',confidence:0};return{color:classifyColor(rr/n,gg/n,bb/n)[0],confidence:classifyColor(rr/n,gg/n,bb/n)[1]};
}

export function analyzeDetection(d:DetectionResult,previous?:DetectionResult|null,deltaSeconds=0,pixelsPerMeter=0,source?:CanvasImageSource):ObjectAnalysisInfo{
  const cx=(d.x1+d.x2)/2,cy=(d.y1+d.y2)/2;const pw=previous?((previous.x1+previous.x2)/2):cx;const ph=previous?((previous.y1+previous.y2)/2):cy;
  const dx=cx-pw,dy=cy-ph;let direction='Stationary';if(Math.hypot(dx,dy)>5){if(Math.abs(dx)>=Math.abs(dy))direction=dx>0?'Right':'Left';else direction=dy>0?'Down':'Up';}
  const speed=d.category==='car'?estimateSpeedKmh(previous?[pw,ph]:null,[cx,cy],deltaSeconds,pixelsPerMeter):{speedKmh:null,calibrated:false,reason:d.category==='car'?'Speed is only available for calibrated car tracking.':'Speed is not estimated for this object type.'};
  const width=d.x2-d.x1,height=d.y2-d.y1;const color=source&&d.category!=='car'?estimateCropColor(source,[d.x1,d.y1,d.x2,d.y2]):source&&d.category==='car'?estimateCropColor(source,[d.x1,d.y1,d.x2,d.y2]):{color:'Unknown',confidence:0};
  let activity='Detected';let posture='Not determined';
  if(d.category==='person'){activity=previous&&Math.hypot(dx,dy)>8?'Moving':'Standing / stationary';posture=height>width*1.25?'Upright / standing':'Posture not reliably determined';}
  if(d.category==='bicycle')activity=previous&&Math.hypot(dx,dy)>8?'Moving':'Stationary';
  const quality=width*height>25000&&d.confidence>=.7?'Good':width*height>8000?'Acceptable':'Poor';
  return{trackId:d.tracking_id,category:d.category as ObjectAnalysisInfo['category'],confidence:d.confidence,color:color.color,colorConfidence:color.confidence,activity,posture,direction,speedKmh:speed.speedKmh,speedCalibrated:speed.calibrated,speedReason:speed.reason,vehicleType:d.category==='car'?(width/Math.max(1,height)>1.8?'Car / sedan-like':'Vehicle'): 'N/A',plateStatus:'Not analyzed',quality};
}
