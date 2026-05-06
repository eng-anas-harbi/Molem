"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Scale, Eye, EyeOff, LogIn, UserPlus, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const { login, register, isAuthenticated } = useAuth()
  
  const [showPassword, setShowPassword] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  
  // Form state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push("/dashboard")
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      if (isLogin) {
        await login(email, password)
      } else {
        if (password !== confirmPassword) {
          setError("كلمات المرور غير متطابقة")
          setIsLoading(false)
          return
        }
        if (password.length < 8) {
          setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل")
          setIsLoading(false)
          return
        }
        if (name.length < 2) {
          setError("الاسم يجب أن يكون حرفين على الأقل")
          setIsLoading(false)
          return
        }
        await register(email, password, name)
      }
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col w-full min-h-dvh">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[oklch(0.50_0.08_55)] flex items-center justify-center mb-4 shadow-lg">
              <Scale className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-header-foreground">Molem</h1>
            <p className="text-sm text-header-foreground/70">محلل العقود القانونية</p>
          </div>

          {/* Form Card */}
          <div className="bg-header-bg border border-[oklch(0.85_0.04_60)] rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-header-foreground text-center mb-6">
              {isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-header-foreground">
                    الاسم الكامل
                  </label>
                  <Input
                    type="text"
                    placeholder="أدخل اسمك الكامل"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                    className="h-12 bg-background border-[oklch(0.85_0.04_60)] text-header-foreground placeholder:text-header-foreground/50 focus:border-[oklch(0.50_0.08_55)] focus:ring-[oklch(0.50_0.08_55)]"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-header-foreground">
                  البريد الإلكتروني
                </label>
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-background border-[oklch(0.85_0.04_60)] text-header-foreground placeholder:text-header-foreground/50 focus:border-[oklch(0.50_0.08_55)] focus:ring-[oklch(0.50_0.08_55)]"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-header-foreground">
                  كلمة المرور
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="أدخل كلمة المرور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 bg-background border-[oklch(0.85_0.04_60)] text-header-foreground placeholder:text-header-foreground/50 focus:border-[oklch(0.50_0.08_55)] focus:ring-[oklch(0.50_0.08_55)] pl-12"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-header-foreground/60 hover:text-header-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-header-foreground">
                    تأكيد كلمة المرور
                  </label>
                  <Input
                    type="password"
                    placeholder="أعد إدخال كلمة المرور"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={!isLogin}
                    className="h-12 bg-background border-[oklch(0.85_0.04_60)] text-header-foreground placeholder:text-header-foreground/50 focus:border-[oklch(0.50_0.08_55)] focus:ring-[oklch(0.50_0.08_55)]"
                    dir="ltr"
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[oklch(0.50_0.08_55)] hover:bg-[oklch(0.45_0.09_55)] text-white font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isLogin ? (
                  <>
                    <LogIn className="w-5 h-5 ml-2" />
                    تسجيل الدخول
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 ml-2" />
                    إنشاء الحساب
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-header-foreground/70">
                {isLogin ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin)
                    setError("")
                  }}
                  className="mr-2 text-[oklch(0.50_0.08_55)] hover:text-[oklch(0.45_0.09_55)] font-medium transition-colors"
                >
                  {isLogin ? "إنشاء حساب جديد" : "تسجيل الدخول"}
                </button>
              </p>
            </div>
          </div>

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-header-foreground/70 hover:text-header-foreground transition-colors"
            >
              العودة للصفحة الرئيسية
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
