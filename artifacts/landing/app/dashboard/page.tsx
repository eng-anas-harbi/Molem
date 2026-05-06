"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { 
  Plus, 
  FileText, 
  Trash2, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Search,
  BookOpen
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { contractsApi, Contract } from "@/lib/api"

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth()
  
  const [contracts, setContracts] = useState<Contract[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadContracts()
    }
  }, [isAuthenticated])

  const loadContracts = async () => {
    try {
      const data = await contractsApi.getAll()
      setContracts(data)
    } catch (error) {
      console.error("Failed to load contracts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا العقد؟")) return
    
    setDeletingId(id)
    try {
      await contractsApi.delete(id)
      setContracts(contracts.filter(c => c.id !== id))
    } catch (error) {
      console.error("Failed to delete contract:", error)
      alert("فشل في حذف العقد")
    } finally {
      setDeletingId(null)
    }
  }

  const getStatusBadge = (status: Contract["analysisStatus"]) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3" />
            مكتمل
          </span>
        )
      case "analyzing":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Loader2 className="w-3 h-3 animate-spin" />
            جاري التحليل
          </span>
        )
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertCircle className="w-3 h-3" />
            فشل
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <Clock className="w-3 h-3" />
            في الانتظار
          </span>
        )
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex flex-col w-full min-h-dvh">
      <SiteHeader />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                مرحباً، {user?.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                إدارة العقود والتحليلات القانونية
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a href="/نظام-العمل-ولوائحه-التنفيذية.pdf" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  نظام العمل
                </Button>
              </a>
              <Link href="/contracts/new">
                <Button className="gap-2 bg-[oklch(0.50_0.08_55)] hover:bg-[oklch(0.45_0.09_55)] text-white">
                  <Plus className="w-4 h-4" />
                  عقد جديد
                </Button>
              </Link>
              <Button variant="ghost" onClick={logout} className="text-muted-foreground">
                تسجيل الخروج
              </Button>
            </div>
          </div>

          {/* Contracts List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                لا توجد عقود بعد
              </h3>
              <p className="text-muted-foreground mb-6">
                ابدأ بإضافة عقد جديد لتحليله
              </p>
              <Link href="/contracts/new">
                <Button className="gap-2 bg-[oklch(0.50_0.08_55)] hover:bg-[oklch(0.45_0.09_55)] text-white">
                  <Plus className="w-4 h-4" />
                  إضافة عقد جديد
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="bg-card border border-border rounded-xl p-4 sm:p-6 hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {contract.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(contract.createdAt).toLocaleDateString("ar-SA", {
                              year: "numeric",
                              month: "long",
                              day: "numeric"
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {getStatusBadge(contract.analysisStatus)}
                      
                      <Link href={`/contracts/${contract.id}`}>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Search className="w-4 h-4" />
                          عرض
                        </Button>
                      </Link>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(contract.id)}
                        disabled={deletingId === contract.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {deletingId === contract.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
