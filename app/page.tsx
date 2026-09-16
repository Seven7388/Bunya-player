"use client";
import { useEffect, useRef, useState } from "react";
type Ch = { name: string; group: string; logo: string; url: string; kid?: string; key?: string; };
type Quality = { id: number; label: string; height: number };

const PLAYLIST = "https://raw.githubusercontent.com/azamstv00-cpu/Public_Iptv_Channels/main/playlist.m3u8";
const TZ: Ch[] = [
  { name: "TBC1 Tanzania", group: "Tanzania", logo: "", url: "https://tbc1.cdn.netplus.co.tz/live/tbc1/playlist.m3u8" },
  { name: "ITV Tanzania", group: "Tanzania", logo: "", url: "https://itv.cdn.netplus.co.tz/live/itv/playlist.m3u8" },
  { name: "Clouds TV", group: "Tanzania", logo: "", url: "https://clouds.cdn.netplus.co.tz/live/clouds/playlist.m3u8" },
  { name: "Wasafi TV", group: "Tanzania", logo: "", url: "https://wasafitv.cdn.netplus.co.tz/live/wasafitv/playlist.m3u8" },
];

export default function Page(){
  const vRef=useRef<HTMLVideoElement>(null);
  const hlsRef=useRef<any>(null);
  const shakaRef=useRef<any>(null);
  const [all,setAll]=useState<Ch[]>([]);
  const [search,setSearch]=useState("");
  const [activeGroup,setActiveGroup]=useState("All");
  const [cur,setCur]=useState<Ch|null>(null);
  const [status,setStatus]=useState("Loading...");
  const [qualities,setQualities]=useState<Quality[]>([]);
  const [currentQ,setCurrentQ]=useState<number>(-1);
  const [showQ,setShowQ]=useState(false);

  useEffect(()=>{
    fetch(PLAYLIST).then(r=>r.text()).then(txt=>{
      const lines=txt.split("\n"); const list: Ch[]=[]; let tmp:any={};
      for(const line of lines){
        const l=line.trim();
        if(l.startsWith("#EXTINF")) tmp={ name:(l.split(",").pop()||"Unknown").trim(), group:(l.match(/group-title="([^"]+)"/)||[])[1]||"Other", logo:"" };
        else if(l.includes("license_key=")){ const [kid,key]=l.split("license_key=")[1].split(":"); tmp.kid=kid.trim(); tmp.key=key.trim(); }
        else if(l.includes("drmLicense=")){ const m=l.match(/drmLicense=([^:]+):([^&]+)/); if(m){ tmp.kid=m[1]; tmp.key=m[2]; } }
        else if(l.startsWith("http")&&tmp.name){ list.push({...tmp,url:l}); tmp={}; }
      }
      const merged=[...TZ,...list]; setAll(merged); setCur(merged[0]); setStatus(`${merged.length} channels`);
    });
  },[]);

  useEffect(()=>{
    if(!cur||!vRef.current) return;
    setQualities([]); setCurrentQ(-1); setShowQ(false);
    let p:any,h:any;
    (async()=>{
      const video=vRef.current!;
      const shaka=(await import("shaka-player")).default; shaka.polyfill.installAll();
      if(cur.url.includes(".mpd")){
        p=new shaka.Player(video); shakaRef.current=p; hlsRef.current=null;
        if(cur.kid&&cur.key) p.configure({drm:{clearKeys:{[cur.kid]:cur.key}}});
        await p.load(cur.url);
        const tracks=p.getVariantTracks().filter((t:any)=>t.type==="variant").sort((a:any,b:any)=>a.height-b.height);
        const qs:Quality[]=tracks.map((t:any,i:number)=>({id:t.id,label:`${t.height}p ${t.bandwidth?Math.round(t.bandwidth/1000)+'kbps':''}`.trim(),height:t.height}));
        // dedup by height
        const uniq=Array.from(new Map(qs.map(q=>[q.height,q])).values()).sort((a,b)=>a.height-b.height) as Quality[];
        setQualities([{id:-1,label:"Auto",height:0},...uniq]); setStatus(`▶ ${cur.name}`);
      }else{
        const Hls=(await import("hls.js")).default;
        if(Hls.isSupported()){
          h=new Hls(); hlsRef.current=h; shakaRef.current=null;
          h.loadSource(cur.url); h.attachMedia(video);
          h.on(Hls.Events.MANIFEST_PARSED,()=>{
            const levels=h.levels||[];
            const qs:Quality[]=levels.map((l:any,i:number)=>({id:i,label:`${l.height||l.bitrate/1000}p ${l.bitrate?Math.round(l.bitrate/1000)+'k':''}`.trim(),height:l.height||0})).sort((a,b)=>a.height-b.height);
            const uniq=Array.from(new Map(qs.map(q=>[q.height,q])).values()).sort((a,b)=>a.height-b.height) as Quality[];
            setQualities([{id:-1,label:"Auto",height:0},...uniq]);
            setStatus(`▶ ${cur.name}`);
          });
        }else video.src=cur.url;
      }
    })();
    return()=>{ try{p?.destroy(); h?.destroy();}catch{} }
  },[cur]);

  const changeQuality=(q:Quality)=>{
    setCurrentQ(q.id); setShowQ(false);
    if(hlsRef.current){ hlsRef.current.currentLevel=q.id; }
    if(shakaRef.current){
      if(q.id===-1) shakaRef.current.configure({abr:{enabled:true}});
      else { shakaRef.current.configure({abr:{enabled:false}}); const track=shakaRef.current.getVariantTracks().find((t:any)=>t.height===q.height); if(track) shakaRef.current.selectVariantTrack(track,true); }
    }
  };

  const groups=Array.from(new Set(all.map(c=>c.group)));
  const filtered=all.filter(c=>(c.name.toLowerCase().includes(search.toLowerCase()))&&(activeGroup==="All"||c.group===activeGroup));

  return(
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="sticky top-0 z-20 bg-[#0a0a0a] border-b border-zinc-800">
        <div className="p-3 flex gap-2">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search channel..." className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm outline-none"/>
          {qualities.length>1&&(
            <div className="relative">
              <button onClick={()=>setShowQ(!showQ)} className="px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">⚙️ {currentQ===-1?"Auto":qualities.find(q=>q.id===currentQ)?.label||"Quality"}</button>
              {showQ&&(
                <div className="absolute right-0 mt-2 w-40 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
                  {qualities.map(q=><button key={q.id+q.label} onClick={()=>changeQuality(q)} className={`w-full text-left px-3 py-2 text-xs ${currentQ===q.id?"bg-white text-black":"hover:bg-zinc-800"}`}>{q.label}</button>)}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="w-full aspect-video bg-black"><video ref={vRef} controls autoPlay playsInline className="w-full h-full"/></div>
        <div className="px-3 py-2 flex justify-between bg-zinc-900/50 text-xs"><span className="truncate">{cur?.name}</span><span className="text-zinc-400 shrink-0 ml-2">{status}</span></div>
      </div>
      <div className="p-3 flex gap-2 overflow-x-auto">
        <button onClick={()=>setActiveGroup("All")} className={`px-3 py-1.5 rounded-full text-xs border ${activeGroup==="All"?"bg-white text-black":"bg-zinc-900 border-zinc-800"}`}>All ({all.length})</button>
        {groups.map(g=><button key={g} onClick={()=>setActiveGroup(g)} className={`px-3 py-1.5 rounded-full text-xs border whitespace-nowrap ${activeGroup===g?"bg-white text-black":"bg-zinc-900 border-zinc-800"}`}>{g}</button>)}
      </div>
      <div className="p-2 grid gap-1.5 pb-20">
        {filtered.map(c=><button key={c.url+c.name} onClick={()=>setCur(c)} className={`w-full p-3 rounded-xl flex justify-between border ${cur?.url===c.url?"bg-white text-black":"bg-zinc-900 border-zinc-800"}`}><span className="text-sm truncate pr-3">{c.name}</span><span className={`text-[10px] px-2 py-1 rounded-full ${cur?.url===c.url?"bg-black text-white":"bg-zinc-800 text-zinc-400"}`}>{c.group}</span></button>)}
      </div>
    </div>
  )
      }
