import { create } from 'zustand';
import type { MedicalCard, Mapping, SessionState, AuditEntry } from './types';
import { emptyVerification } from './logic';
import * as db from './storage';
interface S { state: SessionState; sessions: SessionState[]; dirty: boolean; setState:(p:Partial<SessionState>)=>void; setCards:(c:MedicalCard[])=>void; updateCard:(id:number,p:Partial<MedicalCard['verification']>)=>void; addAudit:(cardId:number,action:string,detail:string)=>void; loadFile:(name:string,headers:string[],mapping:Mapping,cards:MedicalCard[])=>void; save:()=>Promise<void>; loadSession:(id:string)=>Promise<void>; refresh:()=>Promise<void>; newSession:()=>void; }
const blank=():SessionState=>({name:'',fileName:'',headers:[],mapping:{},cards:[],currentIndex:0,audit:[],facility:'',period:''});
export const useMedicalStore=create<S>((set,get)=>({state:blank(),sessions:[],dirty:false,
  setState:(p)=>set(s=>({state:{...s.state,...p},dirty:true})),
  setCards:(cards)=>set(s=>({state:{...s.state,cards},dirty:true})),
  updateCard:(id,p)=>set(s=>{const cards=s.state.cards.map(c=>{if(c.id!==id)return c;return {...c,verification:{...c.verification,...p,deductionByAct:{...c.verification.deductionByAct,...(p.deductionByAct||{})}}};});return {state:{...s.state,cards},dirty:true};}),
  addAudit:(cardId,action,detail)=>set(s=>({state:{...s.state,audit:[...s.state.audit,{id:`${Date.now()}-${Math.random()}`,ts:Date.now(),cardId,action,detail}]},dirty:true})),
  loadFile:(fileName,headers,mapping,cards)=>set(s=>({state:{...blank(),name:fileName.replace(/\.[^.]+$/,''),fileName,headers,mapping,cards,facility:String(cards[0]?.row[mapping.facility||'']||''),period:new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'}).toUpperCase()},dirty:true})),
  save:async()=>{const s=get().state; const id=await db.save(s); set(x=>({state:{...x.state,id},dirty:false}));},
  loadSession:async(id)=>{const s=await db.get(id);if(s)set({state:s,dirty:false});},
  refresh:async()=>set({sessions:await db.list()}),
  newSession:()=>set({state:blank(),dirty:false}),
}));
