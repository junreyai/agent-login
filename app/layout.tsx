import './globals.css'
import { Inter } from 'next/font/google'
import NavbarWrapper from './components/NavbarWrapper'
import type { ReactNode } from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Next-Login',
  description: 'A secure authentication system built with Next.js and Supabase',
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NavbarWrapper />
        {children}
      </body>
    </html>
  )
} 