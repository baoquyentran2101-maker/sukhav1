'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'

type Tbl = { id:string, code:string, status:string }
type Area = { id:string, name:string }

export default function Home() {
  const [areas, setAreas] = useState<Area[]>([])
  const [tables, setTables] = useState<Tbl[]>([])

  useEffect(() => {
    (async () => {
      const { data: ars } = await supabase.from('areas').select('id,name').order('sort')
      setAreas(ars || [])
      if (ars?.[0]?.id) {
        const { data: tbs } = await supabase.from('tables').select('id,code,status').eq('area_id', ars[0].id).order('code')
        setTables(tbs || [])
      }
      const ch = supabase.channel('rt-tables')
        .on('postgres_changes', { event:'*', schema:'public', table:'tables' }, async () => {
          if (areas?.[0]?.id) {
            const { data: tbs } = await supabase.from('tables').select('id,code,status').eq('area_id', areas[0].id).order('code')
            setTables(tbs || [])
          }
        }).subscribe()
      return () => { supabase.removeChannel(ch) }
    })()
  }, [])

  const color = (s:string)=> s==='empty' ? '#e6ffed' : '#fff5e6'

  return (
    <div style={{ padding:16 }}>
      <h2>{areas[0]?.name ? `Khu ${areas[0].name}` : 'Khu —'} – Chọn bàn</h2>
      <div style={{display:'flex',gap:8,margin:'8px 0 16px'}}>
        <Link href="/menu"><button>Quản lý Menu</button></Link>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(90px,1fr))', gap:8 }}>
        {tables.map(t=>(
          <Link key={t.id} href={`/table/${t.id}`}>
            <div style={{ border:'1px solid #ddd', borderRadius:8, padding:12, background:color(t.status), textAlign:'center' }}>
              <div>{t.code}</div>
              <small>{t.status}</small>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
