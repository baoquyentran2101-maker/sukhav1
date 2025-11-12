'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

type Group = { id:string, name:string, sort:number }
type Item  = { id:string, group_id:string, name:string, price:number, is_active:boolean, sort:number }

export default function MenuPage(){
  const [groups, setGroups] = useState<Group[]>([])
  const [items, setItems]   = useState<Item[]>([])
  const [gName, setGName]   = useState('')
  const [gSort, setGSort]   = useState<number>(0)
  const [activeGroup, setActiveGroup] = useState<string|undefined>()

  const [iName, setIName]   = useState('')
  const [iPrice, setIPrice] = useState<number>(0)
  const [iSort, setISort]   = useState<number>(0)

  async function loadAll(){
    const { data: gs } = await supabase.from('menu_groups').select('id,name,sort').order('sort, name')
    setGroups(gs || [])
    const { data: its } = await supabase.from('menu_items').select('id,group_id,name,price,is_active,sort').order('sort, name')
    setItems(its || [])
    if (!activeGroup && gs && gs.length) setActiveGroup(gs[0].id)
  }
  useEffect(()=>{ loadAll() },[])

  const itemsByGroup = useMemo(() =>
    items.filter(i=> i.group_id===activeGroup), [items, activeGroup]
  )

  async function createGroup(){
    if(!gName.trim()) return
    await supabase.from('menu_groups').insert({ name: gName.trim(), sort: gSort })
    setGName(''); setGSort(0)
    await loadAll()
  }
  async function renameGroup(id:string, name:string){ await supabase.from('menu_groups').update({ name }).eq('id', id); await loadAll() }
  async function sortGroup(id:string, sort:number){ await supabase.from('menu_groups').update({ sort }).eq('id', id); await loadAll() }
  async function deleteGroup(id:string){
    if (!confirm('Xoá nhóm này? Toàn bộ món thuộc nhóm sẽ bị xoá.')) return
    await supabase.from('menu_groups').delete().eq('id', id); if (activeGroup===id) setActiveGroup(undefined); await loadAll()
  }

  async function createItem(){
    if(!iName.trim() || !activeGroup) return
    await supabase.from('menu_items').insert({ group_id: activeGroup, name: iName.trim(), price: iPrice||0, sort: iSort, is_active: true })
    setIName(''); setIPrice(0); setISort(0); await loadAll()
  }
  async function updateItemName(id:string, name:string){ await supabase.from('menu_items').update({ name }).eq('id', id); await loadAll() }
  async function updateItemPrice(id:string, price:number){ await supabase.from('menu_items').update({ price }).eq('id', id); await loadAll() }
  async function updateItemSort(id:string, sort:number){ await supabase.from('menu_items').update({ sort }).eq('id', id); await loadAll() }
  async function toggleActive(id:string, is_active:boolean){ await supabase.from('menu_items').update({ is_active }).eq('id', id); await loadAll() }
  async function moveItemGroup(id:string, group_id:string){ await supabase.from('menu_items').update({ group_id }).eq('id', id); await loadAll() }
  async function deleteItem(id:string){ if (!confirm('Xoá món này?')) return; await supabase.from('menu_items').delete().eq('id', id); await loadAll() }

  return (
    <div style={{ padding:16, display:'grid', gap:16 }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2>Quản lý Menu</h2>
        <Link href="/"><button>← Về bàn</button></Link>
      </div>

      <section style={{border:'1px solid #eee',borderRadius:8,padding:12}}>
        <h3>Nhóm món</h3>
        <div style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:8,alignItems:'center'}}>
          <input placeholder="Tên nhóm mới…" value={gName} onChange={e=>setGName(e.target.value)} />
          <input type="number" placeholder="Sort" value={gSort} onChange={e=>setGSort(Number(e.target.value||0))} />
          <button onClick={createGroup}>Thêm nhóm</button>
          <span />
        </div>
        <div style={{marginTop:12,display:'grid',gap:8}}>
          {groups.map(g=>(
            <div key={g.id} style={{display:'grid',gridTemplateColumns:'auto 1fr auto auto auto',gap:8,alignItems:'center'}}>
              <input type="radio" checked={activeGroup===g.id} onChange={()=>setActiveGroup(g.id)} />
              <input value={g.name} onChange={e=>renameGroup(g.id, e.target.value)} />
              <input type="number" value={g.sort} onChange={e=>sortGroup(g.id, Number(e.target.value||0))} style={{width:90}} />
              <button onClick={()=>deleteGroup(g.id)} style={{color:'#b00020'}}>Xoá</button>
              <span />
            </div>
          ))}
        </div>
      </section>

      <section style={{border:'1px solid #eee',borderRadius:8,padding:12}}>
        <h3>Món trong nhóm: <b>{groups.find(g=>g.id===activeGroup)?.name || '—'}</b></h3>
        <div style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:8,alignItems:'center'}}>
          <input placeholder="Tên món mới…" value={iName} onChange={e=>setIName(e.target.value)} />
          <input type="number" placeholder="Giá" value={iPrice} onChange={e=>setIPrice(Number(e.target.value||0))} />
          <input type="number" placeholder="Sort" value={iSort} onChange={e=>setISort(Number(e.target.value||0))} />
          <button onClick={createItem} disabled={!activeGroup}>Thêm món</button>
        </div>

        <div style={{marginTop:12,display:'grid',gap:8}}>
          {itemsByGroup.map(it=>(
            <div key={it.id} style={{display:'grid',gridTemplateColumns:'1fr 110px 90px 130px auto auto',gap:8,alignItems:'center'}}>
              <input value={it.name} onChange={e=>updateItemName(it.id, e.target.value)} />
              <input type="number" value={it.price} onChange={e=>updateItemPrice(it.id, Number(e.target.value||0))} />
              <input type="number" value={it.sort} onChange={e=>updateItemSort(it.id, Number(e.target.value||0))} />
              <select value={it.group_id} onChange={e=>moveItemGroup(it.id, e.target.value)}>
                {groups.map(g=>(<option key={g.id} value={g.id}>{g.name}</option>))}
              </select>
              <label style={{display:'flex',alignItems:'center',gap:6}}>
                <input type="checkbox" checked={it.is_active} onChange={e=>toggleActive(it.id, e.target.checked)} />
                <span>Hiển thị</span>
              </label>
              <button onClick={()=>deleteItem(it.id)} style={{color:'#b00020'}}>Xoá</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
