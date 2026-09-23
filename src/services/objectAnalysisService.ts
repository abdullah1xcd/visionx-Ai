import { DetectionResult } from '../types';
import { estimateSpeedKmh } from './speedService';

export interface ObjectAnalysisInfo {
  trackId:number; category:'person'|'car'|'bicycle'|'camera'; confidence:number;
  color:string; colorConfidence:number; activity:string; posture:string; direction:string;
  speedKmh:number|null; speedCalibrated:boolean; speedReason:string;
  vehicleType:string; plateStatus:string; quality:string;
}

type RGB = [number,number,number];
const COLOR_NAMES: Array<[string,RGB]> = [
  ['black',[20,20,20]],['white',[235,235,235]],['gray',[128,128,128]],
  ['red',[190,45,45]],['orange',[225,125,35]],['yellow',[220,190,45]],
  ['green',[55,150,75]],['blue',[55,115,195]],['purple',[130,70,175]],
  ['pink',[215,105,145]],['brown',[120,75,45]],['beige',[205,175,125]]
];

function rgbToHsv(r:number,g:number,b:number):[number,number,number] {
  const rn=r/255,gn=g/255,bn=b/255,max=Math.max(rn,gn,bn),min=Math.min(rn,gn,bn),d=max-min;
  let h=0;
  if(d){if(max===rn)h=((gn-bn)/d)%6;else if(max===gn)h=(bn-rn)/d+2;else h=(rn-gn)/d+4;h*=60;if(h<0)h+=360;}
  return [h,max===0?0:d/max,max];
}

function classifyColor(r:number,g:number,b:number){
  const [h,s,v]=rgbToHsv(r,g,b);
  if(v<.16) return ['black',.94] as const;
  if(s<.12 && v>.82) return ['white',.94] as const;
  if(s<.16) return ['gray',.86] as const;
  if(v<.32 && s<.55) return ['dark gray',.72] as const;

  let hueName='red';
  if(h<15||h>=345)hueName='red'; else if(h<45)hueName=v>.75?'orange':'brown';
  else if(h<70)hueName='yellow'; else if(h<165)hueName='green';
  else if(h<255)hueName='blue'; else if(h<290)hueName='purple'; else if(h<345)hueName='pink';

  const target=COLOR_NAMES.find(([n])=>n===hueName)?.[1] ?? [128,128,128];
  const distance=Math.hypot(r-target[0],g-target[1],b-target[2])/441.67;
  return [hueName,Math.max(.45,Math.min(.93,1-distance))] as const;
}

function sampleRegion(source:CanvasImageSource,bbox:[number,number,number,number]){
  const c=document.createElement('canvas'); c.width=128;c.height=128;
  const ctx=c.getContext('2d',{willReadFrequently:true}); if(!ctx)return null;
  const w=source instanceof HTMLVideoElement?source.videoWidth:source instanceof HTMLImageElement?source.naturalWidth:(source as HTMLCanvasElement).width;
  const h=source instanceof HTMLVideoElement?source.videoHeight:source instanceof HTMLImageElement?source.naturalHeight:(source as HTMLCanvasElement).height;
  const x=Math.max(0,Math.min(w-1,bbox[0])),y=Math.max(0,Math.min(h-1,bbox[1]));
  const bw=Math.max(1,Math.min(w-x,bbox[2]-bbox[0])),bh=Math.max(1,Math.min(h-y,bbox[3]-bbox[1]));
  ctx.drawImage(source,x,y,bw,bh,0,0,128,128);
  return ctx.getImageData(0,0,128,128).data;
}

/**
 * Estimates the dominant clothing/object color while deliberately avoiding the
 * outer 20% of a person box, where the camera background is most likely to be.
 * For people, torso pixels are weighted more heavily than head/legs.
 */
export function estimateCropColor(source:CanvasImageSource,bbox:[number,number,number,number],category:'person'|'car'|'bicycle'|'camera'='person'){
  const [x1,y1,x2,y2]=bbox;
  let region:[number,number,number,number]=[x1,y1,x2,y2];
  if(category==='person'){
    const w=x2-x1,h=y2-y1;
    region=[x1+w*.18,y1+h*.22,x2-w*.18,y1+h*.68];
  } else {
    const w=x2-x1,h=y2-y1;
    region=[x1+w*.08,y1+h*.12,x2-w*.08,y2-h*.12];
  }
  const p=sampleRegion(source,region); if(!p)return{color:'Unknown',confidence:0};
  const buckets=new Map<string,{n:number,r:number,g:number,b:number}>();
  // Ignore a border and very low-alpha pixels. Sample every 2nd pixel.
  for(let i=0;i<p.length;i+=8){
    const a=p[i+3]; if(a<220)continue;
    const r=p[i],g=p[i+1],b=p[i+2], key=Math.floor(r/24)+','+Math.floor(g/24)+','+Math.floor(b/24);
    const v=buckets.get(key)||{n:0,r:0,g:0,b:0};v.n++;v.r+=r;v.g+=g;v.b+=b;buckets.set(key,v);
  }
  if(!buckets.size)return{color:'Unknown',confidence:0};
  const ranked=[...buckets.values()].sort((a,b)=>b.n-a.n).slice(0,5);
  let total=0,rr=0,gg=0,bb=0;
  for(const v of ranked){total+=v.n;rr+=v.r;gg+=v.g;bb+=v.b;}
  const q=classifyColor(rr/total,gg/total,bb/total);
  const dominance=ranked[0].n/Math.max(1,total);
  return {color:q[0],confidence:Math.max(.35,Math.min(.95,q[1]*(.7+.3*dominance)))};
}

export function analyzeDetection(
  d:DetectionResult, previous?:DetectionResult|null, deltaSeconds=.1,
  pixelsPerMeter=0, source?:CanvasImageSource
):ObjectAnalysisInfo {
  const cat=d.category;
  const cx=(d.x1+d.x2)/2,cy=(d.y1+d.y2)/2;
  const pw=previous?((previous.x1+previous.x2)/2):cx,ph=previous?((previous.y1+previous.y2)/2):cy;
  const dx=cx-pw,dy=cy-ph;
  const displacement=Math.hypot(dx,dy);
  // A single-frame displacement is noisy; 8 px is a conservative local threshold.
  const moving=!!previous && displacement>=8;
  let direction='Stationary';
  if(moving) direction=Math.abs(dx)>=Math.abs(dy)?(dx>0?'Right':'Left'):(dy>0?'Down':'Up');

  const isCar=cat==='car';
  const speed=isCar?estimateSpeedKmh(previous?[pw,ph]:null,[cx,cy],deltaSeconds,pixelsPerMeter):
    {speedKmh:null,calibrated:false,reason:'Speed requires camera calibration and stable multi-frame tracking.'};

  const color=source?estimateCropColor(source,[d.x1,d.y1,d.x2,d.y2],cat as 'person'|'car'|'bicycle'|'camera'):{color:'Unknown',confidence:0};
  const width=d.x2-d.x1,height=d.y2-d.y1,aspect=height/Math.max(1,width);

  let activity='Detected',posture='Not reliably determined';
  if(cat==='person'){
    if(!previous) activity='Observed';
    else activity=moving?'Moving':'Stationary';
    // Bounding-box aspect ratio is not sufficient to claim posture.
    posture=aspect>=1.45?'Likely upright (pose model recommended)':'Pose not reliably determined';
  } else if(cat==='bicycle') activity=previous?(moving?'Moving':'Stationary'):'Observed';

  const vehicleType=isCar?(width/Math.max(1,height)>1.8?'Car / sedan-like':'Vehicle'):'N/A';
  const quality=width*height>50000&&d.confidence>=.8?'Good':width*height>12000&&d.confidence>=.55?'Acceptable':'Low evidence';

  return {
    trackId:d.tracking_id,category:cat as ObjectAnalysisInfo['category'],confidence:d.confidence,
    color:color.color,colorConfidence:color.confidence,activity,posture,direction,
    speedKmh:speed.speedKmh,speedCalibrated:speed.calibrated,speedReason:speed.reason,
    vehicleType,plateStatus:'Not analyzed',quality
  };
}
