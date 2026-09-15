export interface SpeedSample { speedKmh:number|null; calibrated:boolean; reason:string; }

export function estimateSpeedKmh(previous:[number,number]|null,current:[number,number],deltaSeconds:number,pixelsPerMeter:number):SpeedSample{
  if(!previous||!Number.isFinite(deltaSeconds)||deltaSeconds<=0)return{speedKmh:null,calibrated:false,reason:'Waiting for two tracked positions.'};
  if(!Number.isFinite(pixelsPerMeter)||pixelsPerMeter<=0)return{speedKmh:null,calibrated:false,reason:'Camera calibration is required (pixels per meter).'};
  const px=Math.hypot(current[0]-previous[0],current[1]-previous[1]);
  const meters=px/pixelsPerMeter;const kmh=meters/deltaSeconds*3.6;
  return{speedKmh:Number.isFinite(kmh)?Math.round(kmh*10)/10:null,calibrated:true,reason:'Estimated from calibrated image displacement and elapsed time.'};
}
