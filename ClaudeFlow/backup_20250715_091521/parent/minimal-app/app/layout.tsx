import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Task Management App',
  description: 'Minimal task management application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}