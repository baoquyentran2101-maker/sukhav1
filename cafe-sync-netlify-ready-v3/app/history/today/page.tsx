'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'

type Pay = { id: string, method: string, paid_amount: number, paid_at: string }

export default function TodayHistory() {
  const [list, setList] = useState<Pay[]>([])
  const [total, setTotal] = useState<number>(0)

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10)
      const { data } = await supabase
        .from('payments')
        .select('id,method,paid_amount,paid_at')
        .gte('paid_at', today)
        .order('paid_at', { ascending: false })
      setList(data || [])
      setTotal((data || []).reduce((s, p) => s + Number(p.paid_amount || 0), 0))
    })()
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <h3>Lịch sử thanh toán hôm nay</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {list.map(p => (
          <div key={p.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 8, display: 'flex', justifyContent: 'space-between' }}>
            <div><b>{p.method.toUpperCase()}</b> – {new Date(p.paid_at).toLocaleString()}</div>
            <div>{Number(p.paid_amount).toLocaleString()} đ</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12 }}><b>Tổng ngày:</b> {total.toLocaleString()} đ</div>
    </div>
  )
}
