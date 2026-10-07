import {getChatGPTUser} from '@/app/chatgpt-auth';
import WhiteboardLoader from '@/app/whiteboard-loader';
import {validId} from '@/lib/board-data';
import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Board({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!validId(id))notFound();const u=await getChatGPTUser();return <WhiteboardLoader boardId={id} name={u?.fullName||u?.displayName.split('@')[0]||'Guest'}/>;}
