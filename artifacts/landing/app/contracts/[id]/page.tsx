"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { 
  ArrowRight, 
  Loader2,
  FileText,
  Users,
  AlertTriangle,
  BookOpen,
  RefreshCw,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  Info
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { contractsApi, ContractWithAnalysis, Analysis } from "@/lib/api"

type TabType = "summary" | "employee" | "employer" | "alerts" | "citations"

export default function ContractDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  
  const [data, setData] = useState<ContractWithAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>("summary")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && id) {
      loadContract()
    }
  }, [isAuthenticated, id])

  const loadContract = async () => {
    try {
      const result = await contractsApi.getById(id)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل في تحميل العقد")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setError("")
    
    try {
      const analysis = await contractsApi.analyze(id)
      setData(prev => prev ? { ...prev, analysis } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل في تحليل العقد")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSeverityColor = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getSeverityIcon = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "high":
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case "medium":
        return <AlertTriangle className="w-5 h-5 text-amber-600" />
      case "low":
        return <Info className="w-5 h-5 text-gray-600" />
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (error && !data) {
    return (
      <div className="flex flex-col w-full min-h-dvh">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center bg-background p-4">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Link href="/dashboard">
              <Button variant="outline">العودة للوحة التحكم</Button>
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  const contract = data?.contract
  const analysis = data?.analysis

  const tabs = [
    { id: "summary" as TabType, label: "الملخص", icon: FileText },
    { id: "employee" as TabType, label: "حقوق العامل", icon: User },
    { id: "employer" as TabType, label: "حقوق صاحب العمل", icon: Building2 },
    { id: "alerts" as TabType, label: "التنبيهات", icon: AlertTriangle, count: analysis?.alerts?.length },
    { id: "citations" as TabType, label: "المواد المُستشهد بها", icon: BookOpen },
  ]

  return (
    <div className="flex flex-col w-full min-h-dvh">
      <SiteHeader />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للوحة التحكم
          </Link>

          {/* Contract Header */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  {contract?.title}
                </h1>
                <p className="text-muted-foreground mt-1">
                  تاريخ الإنشاء: {contract && new Date(contract.createdAt).toLocaleDateString("ar-SA")}
                </p>
              </div>
              
              {!analysis && (
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="gap-2 bg-[oklch(0.50_0.08_55)] hover:bg-[oklch(0.45_0.09_55)] text-white"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري التحليل...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      تحليل العقد
                    </>
                  )}
                </Button>
              )}
            </div>

            {isAnalyzing && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">جاري تحليل العقد...</p>
                    <p className="text-sm text-blue-600">قد يستغرق هذا من 20 إلى 60 ثانية</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Analysis Content */}
          {analysis ? (
            <>
              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 min-w-fit flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="px-1.5 py-0.5 text-xs rounded-full bg-destructive/10 text-destructive">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="bg-card border border-border rounded-2xl p-6">
                {activeTab === "summary" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-3">ملخص العقد</h3>
                      <p className="text-foreground leading-relaxed">{analysis.summary}</p>
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/50 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">نوع العقد</p>
                        <p className="font-medium text-foreground">{analysis.contractType}</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">الأطراف</p>
                        <p className="font-medium text-foreground">{analysis.partiesDescription}</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "employee" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      حقوق العامل ({analysis.employeeRights?.length || 0})
                    </h3>
                    {analysis.employeeRights?.length > 0 ? (
                      analysis.employeeRights.map((right, index) => (
                        <div key={index} className="p-4 bg-green-50 border border-green-200 rounded-xl">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-green-800">{right.title}</h4>
                              <p className="text-green-700 mt-1">{right.description}</p>
                              {right.citations?.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {right.citations.map((citation, i) => (
                                    <span key={i} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                                      {citation}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">لا توجد حقوق مُحددة للعامل</p>
                    )}
                  </div>
                )}

                {activeTab === "employer" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      حقوق صاحب العمل ({analysis.employerRights?.length || 0})
                    </h3>
                    {analysis.employerRights?.length > 0 ? (
                      analysis.employerRights.map((right, index) => (
                        <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                          <div className="flex items-start gap-3">
                            <Building2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-blue-800">{right.title}</h4>
                              <p className="text-blue-700 mt-1">{right.description}</p>
                              {right.citations?.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {right.citations.map((citation, i) => (
                                    <span key={i} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                                      {citation}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">لا توجد حقوق مُحددة لصاحب العمل</p>
                    )}
                  </div>
                )}

                {activeTab === "alerts" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      التنبيهات والمخاطر ({analysis.alerts?.length || 0})
                    </h3>
                    {analysis.alerts?.length > 0 ? (
                      analysis.alerts.map((alert, index) => (
                        <div key={index} className={`p-4 border rounded-xl ${getSeverityColor(alert.severity)}`}>
                          <div className="flex items-start gap-3">
                            {getSeverityIcon(alert.severity)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{alert.issue}</h4>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  alert.severity === "high" ? "bg-red-200 text-red-800" :
                                  alert.severity === "medium" ? "bg-amber-200 text-amber-800" :
                                  "bg-gray-200 text-gray-800"
                                }`}>
                                  {alert.severity === "high" ? "عالي" : alert.severity === "medium" ? "متوسط" : "منخفض"}
                                </span>
                              </div>
                              <p className="text-sm opacity-90 mb-2">{alert.explanation}</p>
                              {alert.suggestedFix && (
                                <div className="p-2 bg-white/50 rounded-lg">
                                  <p className="text-sm"><strong>الإصلاح المقترح:</strong> {alert.suggestedFix}</p>
                                </div>
                              )}
                              {alert.citations?.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {alert.citations.map((citation, i) => (
                                    <span key={i} className="px-2 py-1 text-xs bg-white/50 rounded">
                                      {citation}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <p className="text-green-700 font-medium">لا توجد تنبيهات</p>
                        <p className="text-muted-foreground text-sm">العقد يبدو متوافقاً مع نظام العمل</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "citations" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      المواد المُستشهد بها ({analysis.citations?.length || 0})
                    </h3>
                    {analysis.citations?.length > 0 ? (
                      analysis.citations.map((citation, index) => (
                        <div key={index} className="p-4 bg-muted/50 border border-border rounded-xl">
                          <div className="flex items-start gap-3">
                            <BookOpen className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-foreground">{citation.label}</span>
                                <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                                  {citation.source === "law" ? "نظام العمل" : "اللائحة التنفيذية"}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">المادة {citation.articleNumber}</p>
                              {citation.snippet && (
                                <p className="text-sm text-foreground mt-2 p-2 bg-background rounded-lg">
                                  {citation.snippet}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">لا توجد مواد مُستشهد بها</p>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : !isAnalyzing && (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                لم يتم تحليل هذا العقد بعد
              </h3>
              <p className="text-muted-foreground mb-6">
                اضغط على زر "تحليل العقد" لبدء التحليل
              </p>
              <Button
                onClick={handleAnalyze}
                className="gap-2 bg-[oklch(0.50_0.08_55)] hover:bg-[oklch(0.45_0.09_55)] text-white"
              >
                <RefreshCw className="w-4 h-4" />
                تحليل العقد
              </Button>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
