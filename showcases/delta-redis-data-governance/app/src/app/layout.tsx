export const metadata = {
  title: 'Delta Lake + Redis: Data Governance',
  description: 'RLS/CLS masked, paginated search demo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        margin: 0,
        background: 'linear-gradient(120deg, #0f172a 0%, #111827 100%)',
        color: '#e5e7eb'
      }}>
        <div style={{
          maxWidth: 1080,
          margin: '0 auto',
          padding: '24px 24px 48px 24px'
        }}>
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, margin: 0 }}>Delta Lake + Redis: Data Governance</h1>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="#" style={{ color: '#93c5fd', textDecoration: 'none' }}>Docs</a>
              <a href="#" style={{ color: '#93c5fd', textDecoration: 'none' }}>GitHub</a>
            </div>
          </header>
          <div style={{
            background: 'rgba(17, 24, 39, 0.6)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: 12,
            padding: 16,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}

