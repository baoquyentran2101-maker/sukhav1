'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'

type Area = { id:string, name:string, sort:number }

export default function Home() {
  const [areas, setAreas] = useState<Area[]>([])

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('areas').select('id,name,sort').order('sort')
      setAreas(data || [])
    })()
  }, [])

  return (
    <div style={{ padding:16 }}>
      <h2>Chọn khu (A, B, C, D, Mang về)</h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
        {areas.map(a => (
          <Link key={a.id} href={`/area/${a.id}`}>
            <div style={{ border:'1px solid #ddd', borderRadius:10, padding:14, textAlign:'center', background:'#f9fafb' }}>
              <div style={{ fontSize:18, fontWeight:700 }}>{a.name}</div>
              <small>Vào khu này</small>
            </div>
          </Link>
        ))}
      </div>
      <div style={{marginTop:16}}>
        <Link href="/menu"><button>Quản lý Menu</button></Link>
        <Link href="/history/today" style={{marginLeft:8}}><button>Lịch sử hôm nay</button></Link>
      </div>
    </div>
  )
}
