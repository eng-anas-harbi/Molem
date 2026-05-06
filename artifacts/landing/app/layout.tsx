import type { Metadata, Viewport } from 'next'
import { Cairo } from 'next/font/google'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo"
})

export const metadata: Metadata = {
  title: 'Molem - محلل العقود القانونية بالذكاء الاصطناعي',
  description: 'محللك القانوني الذكي للعقود والاتفاقيات - تحليل البنود، كشف المخاطر، واستشارات قانونية',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" className="bg-background w-full min-w-full">
      <body className={`${cairo.variable} font-sans antialiased w-full min-w-full`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
