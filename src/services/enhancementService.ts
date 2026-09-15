export interface EnhancementResult { dataUrl:string; width:number; height:number; applied:string[]; }

export function enhanceCanvas(source:HTMLCanvasElement, strength:number=0.65):EnhancementResult {
  const w=source.width,h=source.height;if(!w||!h)throw new Error('No frame available for enhancement.');
  const src=source.getContext('2d',{willReadFrequently:true})?.getImageData(0,0,w,h);if(!src)throw new Error('Unable to read frame pixels.');
  const input=src.data,out=new Uint8ClampedArray(input.length),s=Math.max(0,Math.min(1,strength));
  for(let i=0;i<input.length;i+=4){
    const avg=(input[i]+input[i+1]+input[i+2])/3;
    const gain=1.08+0.22*s; const bias=(128-avg)*0.10*s;
    out[i]=Math.max(0,Math.min(255,input[i]*gain+bias));out[i+1]=Math.max(0,Math.min(255,input[i+1]*gain+bias));out[i+2]=Math.max(0,Math.min(255,input[i+2]*gain+bias));out[i+3]=input[i+3];
  }
  const dst=document.createElement('canvas');dst.width=w;dst.height=h;const ctx=dst.getContext('2d');if(!ctx)throw new Error('Canvas unavailable.');ctx.putImageData(new ImageData(out,w,h),0,0);
  return {dataUrl:dst.toDataURL('image/png'),width:w,height:h,applied:['exposure normalization','contrast enhancement']};
}

export function cropDetection(source:HTMLCanvasElement,bbox:[number,number,number,number],padding=0.12){
 const [x1,y1,x2,y2]=bbox;const w=Math.max(1,x2-x1),h=Math.max(1,y2-y1);const c=document.createElement('canvas');c.width=Math.round(w*(1+padding*2));c.height=Math.round(h*(1+padding*2));c.getContext('2d')?.drawImage(source,Math.max(0,x1-w*padding),Math.max(0,y1-h*padding),w*(1+padding*2),h*(1+padding*2),0,0,c.width,c.height);return c;
}
