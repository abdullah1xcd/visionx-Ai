import { detectionService, DetectionResult } from './detectionService';
import { CategoryType, VideoAnalysisStats, VideoQualityMetrics, TrackedVideoObject, VideoTimelineEvent } from '../types';

export interface VideoAnalysisSnapshot { frameNumber:number; timeSeconds:number; detections:DetectionResult[]; currentCounts:Record<CategoryType,number>; uniqueCounts:Record<CategoryType,number>; }
export interface VideoAnalysisCallbacks { onFrame?:(snapshot:VideoAnalysisSnapshot)=>void; onProgress?:(progress:number,frameNumber:number,timeSeconds:number)=>void; onError?:(error:Error)=>void; onComplete?:()=>void; }
export interface VideoAnalysisRun { stop:()=>void; pause:()=>void; resume:()=>void; }
const emptyCounts=():Record<CategoryType,number>=>({all:0,person:0,car:0,bicycle:0,camera:0});

export class VideoAnalysisService {
 private cancelled=false; private paused=false;
 public stop(){this.cancelled=true;this.paused=false;} public pause(){this.paused=true;} public resume(){this.paused=false;}
 public async analyzeVideo(video:HTMLVideoElement, options:{confidenceThreshold?:number;sampleEveryFrames?:number;callbacks?:VideoAnalysisCallbacks}={}):Promise<VideoAnalysisRun>{
   this.cancelled=false;this.paused=false;
   const threshold=options.confidenceThreshold??0.4; const sampleEvery=Math.max(1,Math.floor(options.sampleEveryFrames??3)); const cb=options.callbacks??{};
   await this.waitForMetadata(video);
   if(!Number.isFinite(video.duration)||video.duration<=0||video.videoWidth<=0||video.videoHeight<=0)throw new Error('The selected video has no usable duration or dimensions.');
   detectionService.resetTracking();
   const run={stop:()=>this.stop(),pause:()=>this.pause(),resume:()=>this.resume()};
   void this.process(video,threshold,sampleEvery,cb);
   return run;
 }
 private async process(video:HTMLVideoElement,threshold:number,sampleEvery:number,cb:VideoAnalysisCallbacks){
   try{
    let frameNumber=0,lastTime=-1;
    // This is an analysis sampling interval, not a claim about the video's native FPS.
    const stepSeconds=sampleEvery/10;
    while(!this.cancelled&&video.currentTime<video.duration-0.001){
      while(this.paused&&!this.cancelled)await this.sleep(50); if(this.cancelled)break;
      const time=video.currentTime; if(time<=lastTime+0.0001){await this.seek(video,Math.min(video.duration,time+stepSeconds));continue;}
      const detections=await detectionService.detectFrame(video,frameNumber,threshold); const current=emptyCounts();
      for(const d of detections)current[d.category]++; current.all=detections.length;
      const diag=detectionService.getDiagnostics(video.videoWidth,video.videoHeight,0); const unique:Record<CategoryType,number>={all:diag.uniqueTrackedCounts.person+diag.uniqueTrackedCounts.car+diag.uniqueTrackedCounts.bicycle+diag.uniqueTrackedCounts.camera,person:diag.uniqueTrackedCounts.person,car:diag.uniqueTrackedCounts.car,bicycle:diag.uniqueTrackedCounts.bicycle,camera:diag.uniqueTrackedCounts.camera};
      cb.onFrame?.({frameNumber,timeSeconds:time,detections,currentCounts:current,uniqueCounts:unique}); cb.onProgress?.(Math.min(100,time/video.duration*100),frameNumber,time); lastTime=time; frameNumber+=sampleEvery;
      if(time>=video.duration-0.001)break; await this.seek(video,Math.min(video.duration,time+stepSeconds));
    }
    cb.onComplete?.();
   }catch(e){cb.onError?.(e instanceof Error?e:new Error(String(e)));}
 }
 public buildStats(snaps:VideoAnalysisSnapshot[],enhancedFramesCount=0,enhancedCropsCount=0):VideoAnalysisStats{const total={person:0,car:0,bicycle:0,camera:0};let unique={person:0,car:0,bicycle:0,camera:0};const timelineDensity=snaps.map(s=>({time:this.formatTime(s.timeSeconds),seconds:s.timeSeconds,people:s.currentCounts.person,cars:s.currentCounts.car,bicycles:s.currentCounts.bicycle,cameras:s.currentCounts.camera}));for(const s of snaps){total.person+=s.currentCounts.person;total.car+=s.currentCounts.car;total.bicycle+=s.currentCounts.bicycle;total.camera+=s.currentCounts.camera;unique={person:s.uniqueCounts.person,car:s.uniqueCounts.car,bicycle:s.uniqueCounts.bicycle,camera:s.uniqueCounts.camera};}return{totalDetections:total,uniqueObjects:unique,timelineDensity,enhancedFramesCount,enhancedCropsCount};}
 public buildTrackedObjects(snaps:VideoAnalysisSnapshot[]):TrackedVideoObject[]{const map=new Map<number,TrackedVideoObject>();for(const s of snaps)for(const d of s.detections){const old=map.get(d.tracking_id);const id=`${d.category.toUpperCase()} #${d.tracking_id}`;if(!old)map.set(d.tracking_id,{id,trackId:d.tracking_id,category:d.category as any,firstSeenTime:this.formatTime(s.timeSeconds),firstSeenSeconds:s.timeSeconds,lastSeenTime:this.formatTime(s.timeSeconds),lastSeenSeconds:s.timeSeconds,durationVisible:'00:00',detectionCount:1,avgConfidence:d.confidence,maxConfidence:d.confidence,minConfidence:d.confidence,movementDirection:'Unknown',approxPath:'Not calculated',currentBbox:[d.x1,d.y1,d.x2,d.y2]});else{old.lastSeenTime=this.formatTime(s.timeSeconds);old.lastSeenSeconds=s.timeSeconds;old.durationVisible=this.formatTime(Math.max(0,old.lastSeenSeconds-old.firstSeenSeconds));old.detectionCount++;old.avgConfidence=((old.avgConfidence*(old.detectionCount-1))+d.confidence)/old.detectionCount;old.maxConfidence=Math.max(old.maxConfidence,d.confidence);old.minConfidence=Math.min(old.minConfidence,d.confidence);old.currentBbox=[d.x1,d.y1,d.x2,d.y2];}}return Array.from(map.values());}
 public buildTimeline(snaps:VideoAnalysisSnapshot[]):VideoTimelineEvent[]{const events:VideoTimelineEvent[]=[];const seen=new Set<number>();for(const s of snaps)for(const d of s.detections){const objectId=`${d.category.toUpperCase()} #${d.tracking_id}`;const type=seen.has(d.tracking_id)?'detected':'entered';events.push({id:`${d.tracking_id}-${s.frameNumber}`,timestamp:this.formatTime(s.timeSeconds),timestampSeconds:s.timeSeconds,type,objectId,category:d.category as any,message:type==='entered'?`${objectId} detected`:`${objectId} detected again`});seen.add(d.tracking_id);}return events;}
 public async measureQuality(video:HTMLVideoElement):Promise<VideoQualityMetrics>{await this.waitForMetadata(video);const canvas=document.createElement('canvas');const width=Math.min(640,video.videoWidth),height=Math.max(1,Math.round(video.videoHeight*(width/video.videoWidth)));canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Canvas 2D context is unavailable.');ctx.drawImage(video,0,0,width,height);const p=ctx.getImageData(0,0,width,height).data;let sum=0,sum2=0;for(let i=0;i<p.length;i+=4){const l=.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];sum+=l;sum2+=l*l;}const n=p.length/4,b=n?sum/n:0,v=n?Math.max(0,sum2/n-b*b):0;const avgBrightness:VideoQualityMetrics['avgBrightness']=b<65?'Low':b>195?'High':b>=105?'Optimal':'Medium';const exposure:VideoQualityMetrics['exposure']=b<55?'Underexposed':b>215?'Overexposed':'Normal';const contrast=v>=1600?'High':v>=500?'Medium':'Low';const score=Math.round(Math.max(0,Math.min(100,45+Math.min(25,v/80)+(exposure==='Normal'?30:10))));return{overallScore:score,resolution:`${video.videoWidth} × ${video.videoHeight}`,fps:0,avgBrightness,brightnessValue:Math.round(b),contrast,contrastRatio:Math.round(Math.sqrt(v)*100)/100,blurScore:0,blurLevel:'Medium',noiseLevel:'Medium',sharpness:'Medium',exposure,dynamicRange:`${Math.round(Math.max(0,Math.min(255,b-2*Math.sqrt(v))))}–${Math.round(Math.max(0,Math.min(255,b+2*Math.sqrt(v))))}`};}
 private waitForMetadata(video:HTMLVideoElement){if(video.readyState>=HTMLMediaElement.HAVE_METADATA)return Promise.resolve();return new Promise<void>((resolve,reject)=>{const ok=()=>{cleanup();resolve();},bad=()=>{cleanup();reject(new Error('Unable to load video metadata.'));},cleanup=()=>{video.removeEventListener('loadedmetadata',ok);video.removeEventListener('error',bad)};video.addEventListener('loadedmetadata',ok,{once:true});video.addEventListener('error',bad,{once:true});});}
 private seek(video:HTMLVideoElement,time:number){return new Promise<void>(resolve=>{const target=Math.max(0,Math.min(video.duration,time));if(Math.abs(video.currentTime-target)<.001){resolve();return;}const done=()=>{video.removeEventListener('seeked',done);resolve();};video.addEventListener('seeked',done,{once:true});video.currentTime=target;});}
 private sleep(ms:number){return new Promise(r=>setTimeout(r,ms));} private formatTime(seconds:number){const s=Math.max(0,Math.floor(seconds));return`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
}
export const videoAnalysisService=new VideoAnalysisService();export default videoAnalysisService;
