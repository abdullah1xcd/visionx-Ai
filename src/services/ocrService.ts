export interface OcrResult { text:string; confidence:number; }

let workerPromise:Promise<any>|null=null;
const getWorker=async()=>{
  if(!workerPromise){
    workerPromise=(async()=>{const mod:any=await import('tesseract.js');const worker=await mod.createWorker('eng',1,{logger:()=>{}});return worker;})();
  }
  return workerPromise;
};

export async function readLicensePlateCandidate(crop:HTMLCanvasElement):Promise<OcrResult>{
  if(crop.width<40||crop.height<15)return{text:'',confidence:0};
  const worker=await getWorker();
  const result=await worker.recognize(crop.toDataURL('image/png'),{tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'} as any);
  const text=String(result?.data?.text||'').replace(/[^A-Z0-9]/gi,'').toUpperCase();
  const confidence=Number(result?.data?.confidence||0)/100;
  // OCR is only a candidate reader here; a dedicated plate detector/model is still required for production-grade localization.
  return {text,confidence:Number.isFinite(confidence)?confidence:0};
}
