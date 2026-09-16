'use client'
import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

const PLAYLIST_URL = 'https://raw.githubusercontent.com/Seven7388/bunya-stream/main/index.m3u'
// If you have streams.m3u use that instead

export default function Page(){
  const videoRef = useRef<HTMLVideoElement>(null)
  const [channels, setChannels] = useState<any[]>([])
  const [playing, setPlaying] = useState<any>(null)
  const [search, setSearch] = useState('')

  useEffect(()=>{
    fetch(PLAYLIST_URL).then(r=>r.text()).then(text=>{
      const lines = text.split('\n')
      const parsed:any[] = []
      let current:any = {}
      lines.forEach(line=>{
        if(line.startsWith('#EXTINF')){
          const name = line.split(',')[1] || 'Unknown'
          const logoMatch = line.match(/tvg-logo="([^"]+)"/)
          const groupMatch = line.match(/group-title="([^"]+)"/)
          current = { name, logo: logoMatch?.[1] || '', group: groupMatch?.[1] || 'General' }
        } else if(line.startsWith('http')){
          current.url = line.trim()
          parsed.push({...current})
        }
      })
      setChannels(parsed)
    })
  },[])

  const play = (ch:any)=>{
    setPlaying(ch)
    if(!videoRef.current) return
    if(Hls.isSupported()){
      const hls = new Hls()
      hls.loadSource(ch.url)
      hls.attachMedia(videoRef.current)
    } else {
      videoRef.current.src = ch.url
    }
    videoRef.current.play().catch(()=>{})
  }

  const filtered = channels.filter(c=> c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <header className="flex gap-4 items-center mb-4">
        <h1 className="text-2xl font-bold text-green-400">BUNYA TV</h1>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search channel..." className="bg-zinc-800 px-4 py-2 rounded w-full max-w-md" />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 bg-zinc-900 rounded p-2 h-[80vh] overflow-y-auto">
          <p className="text-sm text-zinc-400 mb-2">{filtered.length} channels found</p>
          {filtered.map((c,i)=>(
            <div key={i} onClick={()=>play(c)} className={`flex items-center gap-2 p-2 rounded hover:bg-zinc-800 cursor-pointer ${playing?.url===c.url?'bg-zinc-800 border border-green-500':''}`}>
              <img src={c.logo} className="w-8 h-8 bg-white rounded" alt="" />
              <div className="truncate"><p className="truncate text-sm">{c.name}</p><p className="text-xs text-zinc-500">{c.group}</p></div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-2">
          <video ref={videoRef} controls className="w-full aspect-video bg-zinc-900 rounded" />
          {playing && <div className="mt-3"><h2 className="text-xl">{playing.name}</h2><p className="text-zinc-400">{playing.group}</p></div>}
          {!playing && <p className="text-zinc-500 mt-10 text-center">Select a channel to start streaming</p>}
        </div>
      </div>
    </div>
  )
}
