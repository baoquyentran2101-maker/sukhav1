CAFÉ SYNC — Next.js + Supabase (Realtime) — Netlify Ready (v3, kèm schema.sql)
=============================================================================

1) Tạo .env.local ở gốc:
NEXT_PUBLIC_SUPABASE_URL=<Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase anon key>

2) Tạo DB trong Supabase:
- Mở Supabase -> SQL -> dán và chạy file schema.sql trong bộ zip này (hoặc upload và Run).
- File bao gồm bảng, seed mẫu (Khu A, 8 bàn, vài món) & 2 hàm RPC inc_qty/dec_qty.

3) Local:
npm i
npm run dev  # http://localhost:3000

4) Netlify (Import from Git):
- Build: npm run build
- Publish: .next
- ENV: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
