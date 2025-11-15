'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import Link from 'next/link'

type Area = { id:string, name:string }
type Tbl = { id:string, code:string, status:string }

export default function AreaPage({ params }: { params: { id: string } }) {
  const [area, setArea] = useState<Area|undefined>()
  const [tables, setTables] = useState<Tbl[]>([])

  useEffect(() => {
    (async () => {
      const { data: a } = await supabase.from('areas').select('id,name').eq('id', params.id).single()
      setArea(a || undefined)
      const { data: t } = await supabase.from('tables').select('id,code,status').eq('area_id', params.id).order('code')
      setTables(t || [])
      const ch = supabase.channel('rt-tables')
        .on('postgres_changes', { event:'*', schema:'public', table:'tables', filter:`area_id=eq.${params.id}` },
          async () => {
            const { data: t2 } = await supabase.from('tables').select('id,code,status').eq('area_id', params.id).order('code')
            setTables(t2 || [])
          })
        .subscribe()
      return () => { supabase.removeChannel(ch) }
    })()
  }, [params.id])

  const color = (s:string) => s==='empty' ? '#e6ffed' : '#fff5e6'

  return (
    <div style={{ padding:16 }}>
      <h3>{area?.name || 'Khu'} – Chọn bàn</h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(110px,1fr))', gap:10 }}>
        {tables.map(t => (
          <Link key={t.id} href={`/table/${t.id}`}>
            <div style={{ border:'1px solid #ddd', borderRadius:8, padding:12, background:color(t.status), textAlign:'center' }}>
              <div style={{ fontWeight:700 }}>{t.code}</div>
              <small>{t.status}</small>
            </div>
          </Link>
        ))}
      </div>
      <div style={{marginTop:12}}><Link href="/">{'←'} Về chọn khu</Link></div>
    </div>
  )
}
