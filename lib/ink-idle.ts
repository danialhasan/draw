// Only local pen gestures enter this queue; loading, syncing and Undo never do.
export function inkIdle<T extends {id:string}>(run:(ink:T[],signal:AbortSignal)=>Promise<void>,delay=500){
  let timer:ReturnType<typeof setTimeout>|undefined,active:AbortController|undefined;
  let drawing=false;
  const pending=new Map<string,T>();
  function schedule(){
    clearTimeout(timer);
    if(drawing||!pending.size)return;
    timer=setTimeout(async()=>{
      if(drawing)return;
      const controller=new AbortController();active=controller;
      const batch=[...pending.values()];
      try{await run(batch,controller.signal);}
      finally{
        if(active===controller){active=undefined;if(!controller.signal.aborted)pending.clear();}
      }
    },delay);
  }
  return {
    down(){drawing=true;clearTimeout(timer);active?.abort();},
    up(ink?:T){drawing=false;if(ink)pending.set(ink.id,ink);schedule();},
    cancel(){clearTimeout(timer);active?.abort();active=undefined;pending.clear();drawing=false;},
  };
}
