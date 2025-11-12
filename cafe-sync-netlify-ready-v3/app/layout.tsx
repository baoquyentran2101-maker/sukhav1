export const metadata = { title: 'BQ Café (Demo)' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto' }}>
        {children}
      </body>
    </html>
  )
}
