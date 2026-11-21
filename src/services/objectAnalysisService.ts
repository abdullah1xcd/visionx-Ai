import { DetectionResult } from '../types';
import { estimateSpeedKmh } from './speedService';

export interface ObjectAnalysisInfo {
  trackId:number; category:'person'|'car'|'bicycle'|'camera'; confidence:number;
  color:string; colorConfidence:number; activity:string; posture:string; direction:string;
  speedKmh:number|null; speedCalibrated:boolean; speedReason:string;
  vehicleType:string; plateStatus:string; quality:string;
}

const colorNames = [
  ['black',[20,20,20]], ['white',[238,238,238]], ['gray',[128,128,128]],
  ['red',[190,45,45]], ['orange',[225,125,35]], ['yellow',[220,195,45]],
  ['green',[45,135,65]], ['blue',[45,105,185]], ['purple',[125,70,165]],
  ['pink',[210,115,150]], ['brown',[115,75,45]], ['beige',[205,180,135]]
] as const;

const median = (values:number[]) => {
  values.sort((a,b)=>a-b);
  const mid=Math.floor(values.length/2);
  return values.length%2 ? values[mid] : (values[mid-1]+values[mid])/2;
};

function classifyColor(r:number,g:number,b:number){
  const max=Math.max(r,g,b),min=Math.min(r,g,b),chroma=max-min;
  if(max<48)return ['black',0.72] as const;
  if(min>205&&chroma<42)return ['white',0.7] as const;
  if(chroma<Math.max(22,max*0.16))return ['gray',0.62] as const;
  let best='Unknown',bestD=Infinity;
  for(const [name,c] of colorNames){
    if(name==='black'||name==='white'||name==='gray')continue;
    const d=Math.hypot(r-c[0],g-c[1],b-c[2]);
    if(d<bestD){bestD=d;best=name;}
  }
  return [best,Math.max(0.25,Math.min(0.68,0.68-bestD/650))] as const;
}

/** Estimates the dominant visible crop color. This is a visual heuristic, not a clothing classifier. */
export function estimateCropColor(source:CanvasImageSource,bbox:[number,number,number,number],person=false){
  const canvas=document.createElement('canvas');
  canvas.width=96;canvas.height=96;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)return {color:'Unknown',confidence:0};
  const w=source instanceof HTMLVideoElement?source.videoWidth:source instanceof HTMLImageElement?source.naturalWidth:(source as HTMLCanvasElement).width;
  const h=source instanceof HTMLVideoElement?source.videoHeight:source instanceof HTMLImageElement?source.naturalHeight:(source as HTMLCanvasElement).height;
  if(!w||!h)return {color:'Unknown',confidence:0};
  const x1=Math.max(0,Math.min(w-1,bbox[0])),y1=Math.max(0,Math.min(h-1,bbox[1]));
  const x2=Math.max(x1+1,Math.min(w,bbox[2])),y2=Math.max(y1+1,Math.min(h,bbox[3]));
  const cropW=x2-x1,cropH=y2-y1;
  // For people, sample the torso region rather than the whole person/background.
  const left=person?0.18:0.12,top=person?0.2:0.15,right=person?0.82:0.88,bottom=person?0.72:0.85;
  ctx.drawImage(source,x1+cropW*left,y1+cropH*top,cropW*(right-left),cropH*(bottom-top),0,0,96,96);
  const pixels=ctx.getImageData(0,0,96,96).data;
  const rs:number[]=[],gs:number[]=[],bs:number[]=[];
  for(let y=4;y<96;y+=4)for(let x=4;x<96;x+=4){
    const i=(y*96+x)*4;
    if(pixels[i+3]<220)continue;
    const brightness=(pixels[i]+pixels[i+1]+pixels[i+2])/3;
    if(brightness<12||brightness>248)continue;
    rs.push(pixels[i]);gs.push(pixels[i+1]);bs.push(pixels[i+2]);
  }
  if(rs.length<12)return {color:'Unknown',confidence:0};
  const r=median(rs),g=median(gs),b=median(bs);
  const [name,baseConfidence]=classifyColor(r,g,b);
  const deviations=rs.map((v,i)=>Math.abs(v-r)+Math.abs(gs[i]-g)+Math.abs(bs[i]-b));
  const spread=median(deviations);
  const consistency=Math.max(0.35,Math.min(1,1-spread/190));
  return {color:name,confidence:Math.round(baseConfidence*consistency*100)/100};
}

export function analyzeDetection(
  d:DetectionResult,previous?:DetectionResult|null,deltaSeconds=0.5,pixelsPerMeter=0,source?:CanvasImageSource
):ObjectAnalysisInfo {
  const cat=d.category;
  const cx=(d.x1+d.x2)/2,cy=(d.y1+d.y2)/2;
  const px=previous?(previous.x1+previous.x2)/2:cx,py=previous?(previous.y1+previous.y2)/2:cy;
  const dx=cx-px,dy=cy-py,width=d.x2-d.x1,height=d.y2-d.y1;
  // Scale the motion dead-zone to object size to reduce detector jitter.
  const movementThreshold=Math.max(5,height*0.035);
  const moving=Math.hypot(dx,dy)>movementThreshold;
  let direction='No clear movement';
  if(moving)direction=Math.abs(dx)>=Math.abs(dy)?(dx>0?'Right':'Left'):(dy>0?'Down':'Up');
  const isCar=cat==='car';
  const speed=isCar?estimateSpeedKmh(previous?[px,py]:null,[cx,cy],Math.max(0.05,deltaSeconds),pixelsPerMeter):
    {speedKmh:null,calibrated:false,reason:'Speed is only estimated for calibrated car tracking.'};
  const remoteColors=d.aiAttributes?.colors;
  const upperName=remoteColors?.upper?.name||'Unknown',lowerName=remoteColors?.lower?.name||'Unknown';
  const remoteColorLabel=upperName!=='Unknown'||lowerName!=='Unknown'?(`Upper: ${upperName} / Lower: ${lowerName}`):'Unknown';
  const remoteColorConfidence=[remoteColors?.upper?.confidence,remoteColors?.lower?.confidence].filter((v):v is number=>typeof v==='number');
  const color=remoteColors?{color:remoteColorLabel,confidence:remoteColorConfidence.length?remoteColorConfidence.reduce((a,b)=>a+b,0)/remoteColorConfidence.length:0}:(source?estimateCropColor(source,[d.x1,d.y1,d.x2,d.y2],cat==='person'):{color:'Unknown',confidence:0});
  let activity='Detected',posture='Not estimated';
  if(cat==='person'){
    activity=previous?(moving?'Moving':'No clear movement'):'Waiting for motion history';
    posture=d.aiAttributes?.pose?.posture||'Pose sample pending';
  }else if(cat==='bicycle')activity=moving?'Moving':'Stationary';
  const vehicleType=isCar?(width/Math.max(1,height)>1.8?'Car / sedan-like':'Vehicle'):'N/A';
  return {
    trackId:d.tracking_id,category:cat as ObjectAnalysisInfo['category'],confidence:d.confidence,
    color:color.color,colorConfidence:color.confidence,activity,posture,direction,
    speedKmh:speed.speedKmh,speedCalibrated:speed.calibrated,speedReason:speed.reason,
    vehicleType,plateStatus:'Not analyzed',
    quality:width*height>25000&&d.confidence>=0.7?'Good':width*height>8000?'Acceptable':'Poor'
  };
}
