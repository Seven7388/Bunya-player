"use client";
import { useEffect, useRef, useState } from "react";
type Ch = { name: string; group: string; logo: string; url: string; kid?: string; key?: string; };

const PLAYLIST = "https://raw.githubusercontent.com/azamstv00-cpu/Public_Iptv_Channels/main/playlist.m3u8";

// Working Tanzania list (added to that playlist)
const TZ: Ch[] = [
  { name: "TBC1 Tanzania", group: "Tanzania", logo: "", url: "https://tbc1.cdn.netplus.co.tz/live/tbc1/playlist.m3u8" },
  { name: "ITV Tanzania", group: "Tanzania", logo: "", url: "https://itv.cdn.netplus.co.tz/live/itv/playlist.m3u8" },
  { name: "Clouds TV", group: "Tanzania", logo: "", url: "https://clouds.cdn.netplus.co.tz/live/clouds/playlist.m3u8" },
  { name: "Wasafi TV", group: "Tanzania", logo: "", url: "https://wasafitv.cdn.netplus.co.tz/live/wasafitv/playlist.m3u8" },
];

export default function Page(){
  const vRef=useRef<HTMLVideoElement>(null);
  const [all,setAll]=useState<Ch[]>([]);
  const [search,setSearch]=useState("");
  const [cur,setCur]=useState<Ch|null>(null);
  const [status,setStatus]=useState("Loading playlist.m3u8...");

  useEffect(()=>{
    fetch(PLAYLIST).then(r=>r.text()).then(txt=>{
      const lines=txt.split("\n");
      const list: Ch[]=[]; let tmp:any={};
      for(const line of lines){
        const l=line.trim();
        if(l.startsWith("#EXTINF")){
          tmp={ name:l.split(",").pop(), group:(l.match(/group-title="([^"]+)"/)||[])[1]||"Other", logo:(l.match(/tvg-logo="([^"]+)"/)||[])[1]||"" };
        } else if(l.includes("license_key=")){ const [kid,key]=l.split("license_key=")[1].split(":"); tmp.kid=kid; tmp.key=key; }
        else if(l.includes("drmLicense=")){ const m=l.match(/drmLicense=([^:]+):([^&]+)/); if(m){ tmp.kid=m[1]; tmp.key=m[2]; } }
        else if(l.startsWith("http")){ if(tmp.name){ list.push({...tmp, url:l }); tmp={}; } }
      }
      const merged=[...TZ,...list]; // Tanzania first
      setAll(merged); setCur(merged[0]); setStatus(`Loaded ${merged.length} channels`);
    });
  },[]);

  useEffect(()=>{
    if(!cur||!vRef.current) return;
    let p:any,h:any;
    (async()=>{
      const video=vRef.current!;
      const shaka=(await import("shaka-player")).default;
      shaka.polyfill.installAll();
      if(cur.url.includes(".mpd")){
        p=new shaka.Player(video);
        if(cur.kid&&cur.key) p.configure({drm:{clearKeys:{[cur.kid]:cur.key}}});
        try{ await p.load(cur.url); setStatus("Playing: "+cur.name);}catch(e:any){ setStatus("Error: "+e.message); }
      }else{
        const Hls=(await import("hls.js")).default;
        if(Hls.isSupported()){ h=new Hls(); h.loadSource(cur.url); h.attachMedia(video); setStatus("Playing: "+cur.name); }
        else video.src=cur.url;
      }
    })();
    return()=>{ try{p?.destroy(); h?.destroy();}catch{} }
  },[cur]);

  const filtered=all.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||c.group.toLowerCase().includes(search.toLowerCase()));
  const groups=[...new Set(all.map(c=>c.group))];

  return(
    <div className="min-h-screen bg-black text-white">
      <div className="p-3 sticky top-0 bg-black z-10 flex gap-2">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search channel..." className="flex-1 px-3 py-2 rounded bg-zinc-900 border border-zinc-700"/>
        <span className="text-[10px] text-zinc-400 self-center">{status}</span>
      </div>
      <div className="w-full aspect-video bg-black"><video ref={vRef} controls autoPlay playsInline className="w-full h-full"/></div>
      <div className="p-2 text-sm bg-zinc-900 truncate">{cur?.name} | {cur?.group}</div>
      <div className="p-2 flex gap-2 overflow-x-auto">{groups.map(g=><button key={g} onClick={()=>setSearch(g)} className="px-3 py-1 rounded-full bg-zinc-800 text-xs">{g}</button>)}</div>
      <div className="grid grid-cols-1 gap-1 p-2">{filtered.map(c=><button key={c.url+c.name} onClick={()=>setCur(c)} className={`p-3 rounded flex justify-between text-left ${cur?.url===c.url?"bg-white text-black":"bg-zinc-900"}`}><span className="truncate">{c.name}</span><span className="text-xs opacity-60">{c.group}</span></button>)}</div>
    </div>
  )
      }
