'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import Link from 'next/link'

type Tbl = { id: string, code: string, status: string }

export default function AreaPage({ params }: { params: { id: string } }) {
  const [tables, setTables] = useState<Tbl[]>([])

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('tables').select('id,code,status').eq('area_id', params.id).order('code')
      setTables(data || [])
      const ch = supabase.channel('rt-tables')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' },
          async () => {
            const { data } = await supabase.from('tables').select('id,code,status').eq('area_id', params.id).order('code')
            setTables(data || [])
          })
        .subscribe()
      return () => { supabase.removeChannel(ch) }
    })()
  }, [params.id])

  const color = (s: string) => s === 'empty' ? '#e6ffed' : '#fff5e6'

  return (
    <div style={{ padding: 16 }}>
      <h3>Khu – Danh sách bàn</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px,1fr))', gap: 8 }}>
        {tables.map(t => (
          <Link key={t.id} href={`/table/${t.id}`}>
            <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, background: color(t.status), textAlign: 'center' }}>
              <div>{t.code}</div>
              <small>{t.status}</small>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
