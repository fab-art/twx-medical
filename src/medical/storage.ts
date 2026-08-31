import type { SessionState } from './types';
const DB='medical-counter-verification'; const STORE='sessions';
const open=()=>new Promise<IDBDatabase>((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
const id=()=>crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
export async function list(){const db=await open();return new Promise<any[]>((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
export async function save(s: SessionState){const db=await open();const record={...s,id:s.id||id(),updatedAt:new Date().toISOString()};return new Promise<string>((res,rej)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).put(record);r.onsuccess=()=>res(record.id);r.onerror=()=>rej(r.error);});}
export async function get(sid:string){const db=await open();return new Promise<SessionState | undefined>((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).get(sid);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
export async function remove(sid:string){const db=await open();await new Promise<void>((res,rej)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).delete(sid);r.onsuccess=()=>res();r.onerror=()=>rej(r.error);});}
