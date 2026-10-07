import {getChatGPTUser} from './chatgpt-auth';
import Lobby from './lobby';
export const dynamic='force-dynamic';
export default async function Home(){const u=await getChatGPTUser();return <Lobby name={u?.fullName||u?.displayName.split('@')[0]||'Guest'}/>;}
