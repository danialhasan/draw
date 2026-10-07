export type BoardElement = {id:string;type:string;version:number;versionNonce:number;isDeleted:boolean;x:number;y:number;[key:string]:unknown};
export const UPSERT_ELEMENT=`INSERT INTO elements (board_id,id,version,nonce,data) VALUES (?,?,?,?,?)
ON CONFLICT (board_id,id) DO UPDATE SET version=excluded.version,nonce=excluded.nonce,data=excluded.data
WHERE excluded.version > elements.version OR (excluded.version = elements.version AND excluded.nonce < elements.nonce)`;
export function isNewer(a:Pick<BoardElement,'version'|'versionNonce'>,b:Pick<BoardElement,'version'|'versionNonce'>){return a.version>b.version||(a.version===b.version&&a.versionNonce<b.versionNonce);}
export function validId(id:string){return /^[a-f0-9]{8}-[a-f0-9-]{27}$/.test(id);}
export function validateElements(value:unknown):BoardElement[]{
  if(!Array.isArray(value)||value.length>100)throw new Error('Send up to 100 changed objects at a time.');
  const types=new Set(['rectangle','ellipse','diamond','line','arrow','text','freedraw','frame','image']);
  const ids=new Set<string>();
  return value.map(item=>{
    if(!item||typeof item!=='object'||typeof item.id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(item.id)||ids.has(item.id)||!types.has(item.type)||!Number.isSafeInteger(item.version)||item.version<1||item.version>1e9||!Number.isSafeInteger(item.versionNonce)||item.versionNonce<0||typeof item.isDeleted!=='boolean'||!Number.isFinite(item.x)||!Number.isFinite(item.y)||Math.abs(item.x)>1e7||Math.abs(item.y)>1e7||JSON.stringify(item).length>150000)throw new Error('An object could not be saved. Export a local copy and reload.');
    if(item.type==='image')throw new Error('Image uploads are not supported in shared boards yet.');
    if(item.type==='text'&&(typeof item.text!=='string'||item.text.length>10000))throw new Error('A text object is too large.');
    if(['line','arrow','freedraw'].includes(item.type)&&(!Array.isArray(item.points)||item.points.length>10000||item.points.some((p:unknown)=>!Array.isArray(p)||p.length!==2||p.some(v=>typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1e7))))throw new Error('Invalid stroke coordinates.');
    ids.add(item.id);return item as BoardElement;
  });
}
export function signature(e:{version:number;versionNonce:number}){return `${e.version}:${e.versionNonce}`;}
