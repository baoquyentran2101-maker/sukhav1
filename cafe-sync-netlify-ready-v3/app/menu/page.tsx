'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

type Group = { id:string, name:string }
type Item  = { id:string, name:string, price:number, group_id:string }
type OI    = { id:string, item_id:string, qty:number, price:number, amount:number, name?:string }
type Table = { code:string, status:string }
type Order = { id:string, is_takeaway:boolean, status:string }

export default function TablePage({ params }:{ params:{ id:string }}) {
  const router = useRouter()
  const [table, setTable] = useState<Table>({code:'', status:'empty'})
  const [orderId, setOrderId] = useState<string>('')
  const [isTakeaway, setIsTakeaway] = useState<boolean>(false)

  const [groups, setGroups] = useState<Group[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [activeGroup, setActiveGroup] = useState<string>()
  const [orderItems, setOrderItems] = useState<OI[]>([])
  const [payMethod, setPayMethod] = useState<'cash'|'bank'>('cash')
  const total = useMemo(()=> orderItems.reduce((s,i)=>s+Number(i.amount||0),0), [orderItems])

  useEffect(() => {
    (async () => {
      // Thông tin bàn + xác định có phải “Mang về” không
      const { data: t } = await supabase.from('tables').select('code,status,area_id').eq('id', params.id).single()
      setTable({code: t?.code || '', status: t?.status || 'empty'})
      // Khu có tên "Mang về"?
      const { data: area } = await supabase.from('areas').select('name').eq('id', t?.area_id).single()
      const takeaway = area?.name === 'Mang về'
      setIsTakeaway(!!takeaway)
      if (t?.status === 'empty' && !takeaway) await supabase.from('tables').update({ status:'in_use' }).eq('id', params.id)

      // Tìm/ tạo order mở
      let { data: od } = await supabase
        .from('orders').select('id,is_takeaway,status')
        .eq('status','open')
        .eq('is_takeaway', takeaway)
        .maybeSingle()
      if (!od) {
        // Bàn bình thường: gán table_id; Mang về: table_id = null, is_takeaway=true
        const payload:any = takeaway ? { is_takeaway:true, status:'open' } : { table_id: params.id, is_takeaway:false, status:'open' }
        const { data: ins } = await supabase.from('orders').insert(payload).select('id,is_takeaway,status').single()
        od = ins!
      }
      setOrderId(od.id)

      // Menu
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

  async function doPay(){
    if (!orderId) return
    // Lưu payment
    await supabase.from('payments').insert({ order_id: orderId, method: payMethod, paid_amount: total })
    // Đóng order
    await supabase.from('orders').update({ status:'paid' }).eq('id', orderId)
    // Trả bàn rỗng nếu không phải Mang về
    if (!isTakeaway) await supabase.from('tables').update({ status:'empty' }).eq('id', params.id)
    // Tạo order mới sẵn cho phiên sau (tuỳ ý)
    if (isTakeaway) {
      const { data: od } = await supabase.from('orders').insert({ is_takeaway:true, status:'open' }).select('id').single()
      setOrderId(od!.id)
    } else {
      const { data: od } = await supabase.from('orders').insert({ table_id: params.id, is_takeaway:false, status:'open' }).select('id').single()
      setOrderId(od!.id)
    }
    // Xoá list cũ
    setOrderItems([])
    alert('Đã thanh toán!')
    router.push('/history/today')
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, padding:12 }}>
      <div>
        <h3>{isTakeaway ? 'Mang về' : `Bàn ${table.code}`}</h3>
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

        <div style={{ marginTop:12 }}>
          <div style={{marginBottom:8}}>Tổng: <b>{total.toLocaleString()} đ</b></div>
          <div style={{display:'flex', gap:12, alignItems:'center', marginBottom:8}}>
            <label><input type="radio" checked={payMethod==='cash'} onChange={()=>setPayMethod('cash')} /> Tiền mặt</label>
            <label><input type="radio" checked={payMethod==='bank'} onChange={()=>setPayMethod('bank')} /> Chuyển khoản</label>
          </div>
          <button onClick={doPay} disabled={total<=0}>Thanh toán</button>
        </div>

        <div style={{ marginTop:8 }}>
          <a href={isTakeaway ? '/' : `/area/${params.id}`}>{'←'} Quay lại</a>
        </div>
      </div>
    </div>
  )
}
