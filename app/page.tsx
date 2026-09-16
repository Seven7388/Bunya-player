"use client";
import { useEffect, useRef, useState } from "react";

type Ch = { name:string; group:string; url:string; kid?:string; key?:string; logo?:string };

// YOUR LAST 8 CHANNELS ONLY - these work
const CHANNELS: Ch[] = [
  { name:"Dodoma TV (360p)", group:"General", url:"https://goliveafrica.media:9998/live/625965017ed69/index.m3u8" },
  { name:"IBN TV (480p)", group:"Religious", url:"http://138.68.138.119:8080/live/5a8993709ea19/index.m3u8" },
  { name:"IBN TV Africa (720p)", group:"Religious", url:"http://68.183.41.209:8080/live/5d9a537c64b9c/index.m3u8" },
  { name:"Mahaasin TV", group:"Religious", url:"https://mahaasintv.livebox.co.in/mahaasintvhls/mahaasintv.m3u8" },
  { name:"Tanzania Safari Channel (576p)", group:"Travel", url:"https://stream-134630.castr.net/5fe35eae8c53540cab83659a/live_31dabe40323511f08b8efff0016f3b67/index.m3u8" },
  { name:"TBC1", group:"General", url:"https://tbc.maintek.co/LiveApp/streams/YF43nTzH0duMyUA2130641323343587.m3u8" },
  { name:"TBC1 (1080p)", group:"General", url:"https://stream-134630.castr.net/5fe35eae8c53540cab83659a/live_67aeec90584911f1ab60174d68f7c06e/index.fmp4.m3u8" },
  { name:"TBC2 (1080p)", group:"Entertainment", url:"https://stream-134630.castr.net/5fe35eae8c53540cab83659a/live_17ad3c50323511f08f79733d2dd68583/index.fmp4.m3u8" },
];

export default function Page(){
  const vRef=useRef<HTMLVideoElement>(null);
  const hlsRef=useRef<any>(null); const shakaRef=useRef<any>(null);
  const [cur,setCur]=useState<Ch>(CHANNELS[0]);
  const [search,setSearch]=useState("");
  const [quals,setQuals]=useState<{id:number,label:string}[]>([]);
  const [qId,setQId]=useState(-1);
  const [status,setStatus]=useState("Tap a channel");

  useEffect(()=>{
    if(!vRef.current) return;
    const video=vRef.current;
    setQuals([]); setQId(-1); setStatus("Loading "+cur.name+"...");
    (async()=>{
      if(hlsRef.current){try{hlsRef.current.destroy();}catch{} hlsRef.current=null;}
      if(shakaRef.current){try{await shakaRef.current.destroy();}catch{} shakaRef.current=null;}
      try{
        if(cur.url.includes(".mpd")){
          const shaka=(await import("shaka-player")).default; shaka.polyfill.installAll();
          const p=new shaka.Player(video); shakaRef.current=p;
          if(cur.kid&&cur.key) p.configure({drm:{clearKeys:{[cur.kid]:cur.key}}});
          await p.load(cur.url); setStatus("▶ Playing: "+cur.name);
          const tracks=p.getVariantTracks().sort((a:any,b:any)=>a.height-b.height);
          setQuals([{id:-1,label:"Auto"},...tracks.map((t:any)=>({id:t.id,label:(t.height||0)+"p"}))]);
        }else{
          const Hls=(await import("hls.js")).default;
          if(Hls.isSupported()){
            const h=new Hls(); hlsRef.current=h;
            h.loadSource(cur.url); h.attachMedia(video);
            h.on(Hls.Events.MANIFEST_PARSED,()=>{
              video.play().catch(()=>{});
              const lv=h.levels.map((l:any,i:number)=>({id:i,label:(l.height?l.height+"p":Math.round(l.bitrate/1000)+"k")}));
              setQuals([{id:-1,label:"Auto"},...lv]); setStatus("▶ Playing: "+cur.name);
            });
            h.on(Hls.Events.ERROR,(_:any,d:any)=>{ if(d.fatal) setStatus("Stream failed - try another"); });
          }else{ video.src=cur.url; await video.play(); setStatus("▶ Playing: "+cur.name); }
        }
      }catch(e:any){ setStatus("Error: "+(e.message||"Cannot play")); }
    })();
  },[cur]);

  const changeQ=(id:number)=>{
    setQId(id);
    if(hlsRef.current) hlsRef.current.currentLevel=id;
    if(shakaRef.current){
      if(id===-1) shakaRef.current.configure({abr:{enabled:true}});
      else{ const tr=shakaRef.current.getVariantTracks()[id]; if(tr){ shakaRef.current.configure({abr:{enabled:false}}); shakaRef.current.selectVariantTrack(tr,true);} }
    }
  };

  const filtered=CHANNELS.filter(c=>c.name.toLowerCase().includes(search.toLowerCase()));

  return(
    <div style={{background:"#000",color:"#fff",minHeight:"100vh",fontFamily:"system-ui"}}>
      <div style={{padding:12,position:"sticky",top:0,background:"#000",borderBottom:"1px solid #222",zIndex:10}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search channel..." style={{width:"100%",padding:"10px 14px",borderRadius:10,background:"#111",border:"1px solid #333",color:"#fff"}}/>
        <div style={{marginTop:10,position:"relative",background:"#000",borderRadius:12,overflow:"hidden"}}>
          <video ref={vRef} controls autoPlay playsInline style={{width:"100%",aspectRatio:"16/9",background:"#000"}}/>
          {quals.length>1&&<select value={qId} onChange={e=>changeQ(parseInt(e.target.value))} style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.8)",color:"#fff",border:"1px solid #444",borderRadius:6,padding:"5px"}}>{quals.map(q=><option key={q.id} value={q.id}>{q.label}</option>)}</select>}
        </div>
        <div style={{fontSize:12,color:"#888",marginTop:6}}>{status}</div>
      </div>
      <div style={{padding:10,display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(c=><button key={c.url} onClick={()=>setCur(c)} style={{textAlign:"left",padding:"14px",borderRadius:12,border:"1px solid #222",background:c.url===cur.url?"#fff":"#111",color:c.url===cur.url?"#000":"#fff",display:"flex",justifyContent:"space-between"}}><span>{c.name}</span><span style={{fontSize:10,background:c.url===cur.url?"#000":"#222",color:c.url===cur.url?"#fff":"#999",padding:"3px 8px",borderRadius:20}}>{c.group}</span></button>)}
      </div>
    </div>
  );
   }
