"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Scale, Menu, X, Home, LogIn, Phone, Users, LayoutDashboard, LogOut } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isAuthenticated, logout, isLoading } = useAuth()

  const publicNavItems = [
    { href: "/", label: "الصفحة الرئيسية", icon: Home },
    { href: "/contact", label: "إتصل بنا", icon: Phone },
    { href: "/about", label: "من نحن؟", icon: Users },
  ]

  const authNavItems = [
    { href: "/", label: "الصفحة الرئيسية", icon: Home },
    { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
    { href: "/contact", label: "إتصل بنا", icon: Phone },
    { href: "/about", label: "من نحن؟", icon: Users },
  ]

  const navItems = isAuthenticated ? authNavItems : publicNavItems

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[oklch(0.85_0.04_60)] bg-header-bg backdrop-blur-md shrink-0">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity duration-200">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[oklch(0.50_0.08_55)] flex items-center justify-center hover:bg-[oklch(0.45_0.09_55)] transition-colors duration-200">
              <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-header-foreground">Molem</h1>
              <p className="text-[10px] sm:text-xs text-header-foreground/70 hidden sm:block">محلل العقود القانونية</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button variant="ghost" className="gap-2 text-header-foreground/90 hover:bg-[oklch(0.88_0.04_60)] hover:text-header-foreground hover:scale-105 active:scale-95 transition-all duration-200">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
            {!isLoading && (
              isAuthenticated ? (
                <Button
                  variant="ghost"
                  onClick={logout}
                  className="gap-2 text-header-foreground/90 hover:bg-[oklch(0.88_0.04_60)] hover:text-header-foreground hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  تسجيل الخروج
                </Button>
              ) : (
                <Link href="/login">
                  <Button variant="ghost" className="gap-2 text-header-foreground/90 hover:bg-[oklch(0.88_0.04_60)] hover:text-header-foreground hover:scale-105 active:scale-95 transition-all duration-200">
                    <LogIn className="w-4 h-4" />
                    تسجيل الدخول
                  </Button>
                </Link>
              )
            )}
          </nav>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-header-foreground hover:bg-[oklch(0.88_0.04_60)] hover:scale-105 active:scale-95 transition-all duration-200"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-[oklch(0.85_0.04_60)]">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-2 text-header-foreground/90 hover:bg-[oklch(0.88_0.04_60)] hover:text-header-foreground hover:translate-x-1 active:scale-[0.98] transition-all duration-200">
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
              {!isLoading && (
                isAuthenticated ? (
                  <Button
                    variant="ghost"
                    onClick={() => { logout(); setMobileMenuOpen(false) }}
                    className="w-full justify-start gap-2 text-header-foreground/90 hover:bg-[oklch(0.88_0.04_60)] hover:text-header-foreground hover:translate-x-1 active:scale-[0.98] transition-all duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    تسجيل الخروج
                  </Button>
                ) : (
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-header-foreground/90 hover:bg-[oklch(0.88_0.04_60)] hover:text-header-foreground hover:translate-x-1 active:scale-[0.98] transition-all duration-200">
                      <LogIn className="w-4 h-4" />
                      تسجيل الدخول
                    </Button>
                  </Link>
                )
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
