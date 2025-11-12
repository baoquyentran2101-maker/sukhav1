'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import Link from 'next/link'

type Group = { id:string, name:string }
type Item  = { id:string, name:string, price:number, group_id:string }
type OI    = { id:string, item_id:string, qty:number, price:number, amount:number, name?:string }

export default function TablePage({ params }:{ params:{ id:string }}) {
  const [tableCode, setTableCode] = useState('')
  const [orderId, setOrderId] = useState<string>('')
  const [groups, setGroups] = useState<Group[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [activeGroup, setActiveGroup] = useState<string>()
  const [orderItems, setOrderItems] = useState<OI[]>([])

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from('tables').select('code,status').eq('id', params.id).single()
      setTableCode(t?.code || '')
      if (t?.status === 'empty') await supabase.from('tables').update({ status:'in_use' }).eq('id', params.id)

      let { data: od } = await supabase.from('orders').select('id').eq('table_id', params.id).eq('status','open').maybeSingle()
      if (!od) {
        const { data: ins } = await supabase.from('orders').insert({ table_id: params.id }).select('id').single()
        od = ins!
      }
      setOrderId(od.id)

      const { data: gs } = await supabase.from('menu_groups').select('id,name').order('sort')
      setGroups(gs || []); setActiveGroup(gs?.[0]?.id)
      const { data: it } = await supabase.from('menu_items').select('id,name,price,group_id').eq('is_active',true).order('sort')
      setItems(it || [])

      await refreshItems(od.id)

      const ch = supabase.channel('rt-order')
        .on('postgres_changes', { event:'*', schema:'public', table:'order_items', filter:`order_id=eq.${od.id}`}, ()=>refreshItems(od.id))
        .subscribe()
      return () => { supabase.removeChannel(ch) }
    })()
  }, [params.id])

  async function refreshItems(oid:string){
    const { data } = await supabase.from('order_items').select('id,item_id,qty,price,amount').eq('order_id', oid)
    const joined = (data||[]).map(oi => ({ ...oi, name: items.find(i=>i.id===oi.item_id)?.name }))
    setOrderItems(joined)
  }

  async function addItem(itemId:string){
    const it = items.find(i=>i.id===itemId)!;
    await supabase.from('order_items').insert({ order_id: orderId, item_id: itemId, qty:1, price: it.price })
  }
  async function inc(id:string){ await supabase.rpc('inc_qty',{ p_id:id }) }
  async function dec(id:string){ await supabase.rpc('dec_qty',{ p_id:id }) }

  const total = useMemo(()=> orderItems.reduce((s,i)=>s+Number(i.amount||0),0), [orderItems])

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, padding:12 }}>
      <div>
        <h3>Bàn {tableCode}</h3>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
          {groups.map(g=>(
            <button key={g.id} onClick={()=>setActiveGroup(g.id)}
              style={{ padding:'6px 10px', border: activeGroup===g.id?'2px solid #1976d2':'1px solid #ccc', borderRadius:8 }}>
              {g.name}
            </button>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:8 }}>
          {items.filter(i=>i.group_id===activeGroup).map(i=>(
            <button key={i.id} onClick={()=>addItem(i.id)} style={{ border:'1px solid #ddd', borderRadius:8, padding:10, textAlign:'left' }}>
              <div style={{ fontWeight:600 }}>{i.name}</div>
              <small>{Number(i.price).toLocaleString()} đ</small>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3>Đơn hiện tại</h3>
        <div style={{ border:'1px solid #eee', borderRadius:8, padding:8, display:'grid', gap:8, maxHeight:420, overflow:'auto' }}>
          {orderItems.map(oi=>(
            <div key={oi.id} style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:8, alignItems:'center' }}>
              <div>{oi.name}</div>
              <div>{Number(oi.price).toLocaleString()}</div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <button onClick={()=>dec(oi.id)}>-</button>
                <span>{oi.qty}</span>
                <button onClick={()=>inc(oi.id)}>+</button>
              </div>
              <div style={{ textAlign:'right' }}>{Number(oi.amount).toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>Tổng: <b>{total.toLocaleString()} đ</b></div>
          <a href="/history/today"><button>Thanh toán</button></a>
        </div>

        <div style={{ marginTop:8 }}>
          <a href="/">← Về bàn</a>
        </div>
      </div>
    </div>
  )
}
