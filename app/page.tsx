"use client";
import { useEffect, useRef, useState } from "react";
type Ch={name:string;group:string;url:string;kid?:string;key?:string};
const PLAYLIST="https://raw.githubusercontent.com/azamstv00-cpu/Public_Iptv_Channels/main/playlist.m3u8";
const TZ:Ch[]=[
 {name:"TBC1",group:"Tanzania",url:"https://tbc1.cdn.netplus.co.tz/live/tbc1/playlist.m3u8"},
 {name:"ITV",group:"Tanzania",url:"https://itv.cdn.netplus.co.tz/live/itv/playlist.m3u8"},
 {name:"Clouds TV",group:"Tanzania",url:"https://clouds.cdn.netplus.co.tz/live/clouds/playlist.m3u8"},
];

export default function Page(){
 const vRef=useRef<HTMLVideoElement>(null);
 const hlsRef=useRef<any>(null); const shakaRef=useRef<any>(null);
 const [all,setAll]=useState<Ch[]>([]); const [search,setSearch]=useState("");
 const [cur,setCur]=useState<Ch|null>(null); const [quals,setQuals]=useState<any[]>([]);
 const [qId,setQId]=useState(-1); const [showQ,setShowQ]=useState(false);

 useEffect(()=>{
  fetch(PLAYLIST).then(r=>r.text()).then(t=>{
   const L=t.split("\n"); const list:Ch[]=[]; let tmp:any={};
   for(const line of L){const l=line.trim();
    if(l.startsWith("#EXTINF")){const name=(l.split(",").pop()||"").trim(); const g=(l.match(/group-title="([^"]+)"/)||[])[1]||"Other"; tmp={name,group:g};}
    else if(l.startsWith("http")&&tmp.name){list.push({...tmp,url:l}); tmp={};}
   }
   const m=[...TZ,...list]; setAll(m); setCur(m[0]);
  });
 },[]);

 useEffect(()=>{
  if(!cur||!vRef.current) return; setQuals([]);
  (async()=>{
   const video=vRef.current!;
   if(cur.url.includes(".mpd")){
    const shaka=(await import("shaka-player")).default; shaka.polyfill.installAll();
    const p=new shaka.Player(video); shakaRef.current=p;
    await p.load(cur.url);
    const tr=p.getVariantTracks().sort((a:any,b:any)=>a.height-b.height);
    const uniq=Array.from(new Map(tr.map((x:any)=>[x.height,x])).values()) as any[];
    setQuals([{id:-1,label:"Auto",h:0},...uniq.map((x:any)=>({id:x.id,label:x.height+"p",h:x.height}))]);
   }else{
    const Hls=(await import("hls.js")).default;
    if(Hls.isSupported()){const h=new Hls(); hlsRef.current=h; h.loadSource(cur.url); h.attachMedia(video);
     h.on(Hls.Events.MANIFEST_PARSED,()=>{const lv=h.levels.map((l:any,i:number)=>({id:i,label:(l.height||0)+"p",h:l.height})).sort((a:any,b:any)=>a.h-b.h); setQuals([{id:-1,label:"Auto",h:0},...lv]);});
    } else video.src=cur.url;
   }
  })();
 },[cur]);

 const setQuality=(q:any)=>{setQId(q.id); setShowQ(false); if(hlsRef.current)hlsRef.current.currentLevel=q.id; if(shakaRef.current){if(q.id===-1)shakaRef.current.configure({abr:{enabled:true}}); else{shakaRef.current.configure({abr:{enabled:false}}); const t=shakaRef.current.getVariantTracks().find((x:any)=>x.height===q.h); if(t)shakaRef.current.selectVariantTrack(t,true);}}};

 const groups=Array.from(new Set(all.map(c=>c.group)));
 const filtered=all.filter(c=>c.name.toLowerCase().includes(search.toLowerCase()));

 return(
  <div className="min-h-screen bg-black text-white p-2">
   <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search channel..." className="w-full p-2 mb-2 rounded bg-zinc-900 border border-zinc-700"/>
   <div className="relative w-full aspect-video bg-black rounded overflow-hidden">
    <video ref={vRef} controls autoPlay className="w-full h-full"/>
    {quals.length>1&&<div className="absolute top-2 right-2">
     <button onClick={()=>setShowQ(!showQ)} className="bg-black/80 px-3 py-1 rounded text-xs border">⚙️ {qId===-1?"Auto":quals.find(x=>x.id===qId)?.label}</button>
     {showQ&&<div className="mt-1 bg-zinc-900 border rounded overflow-hidden">{quals.map((q:any)=><button key={q.id+q.label} onClick={()=>setQuality(q)} className="block w-full text-left px-3 py-2 text-xs hover:bg-white hover:text-black">{q.label}</button>)}</div>}
    </div>}
   </div>
   <div className="flex gap-2 overflow-x-auto mt-2 pb-2">{groups.map(g=><span key={g} className="px-2 py-1 bg-zinc-800 rounded-full text-[11px] whitespace-nowrap">{g}</span>)}</div>
   <div className="grid gap-1 mt-2">{filtered.map(c=><button key={c.url} onClick={()=>setCur(c)} className={`text-left p-3 rounded border text-sm flex justify-between ${cur?.url===c.url?"bg-white text-black":"bg-zinc-900 border-zinc-800"}`}><span>{c.name}</span><span className="text-[10px] opacity-60">{c.group}</span></button>)}</div>
  </div>
 )
    }
