"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { 
  ArrowRight, 
  FileText, 
  Upload, 
  Loader2,
  File,
  X
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { contractsApi } from "@/lib/api"

type InputMode = "text" | "file"

export default function NewContractPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [inputMode, setInputMode] = useState<InputMode>("text")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("حجم الملف يجب أن يكون أقل من 10 ميجابايت")
      return
    }
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"
    ]
    if (!allowedTypes.includes(selectedFile.type)) {
      setError("يرجى اختيار ملف PDF أو DOCX أو TXT")
      return
    }
    setFile(selectedFile)
    setError("")
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) validateAndSetFile(selectedFile)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) validateAndSetFile(dropped)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!title.trim()) {
      setError("يرجى إدخال عنوان العقد")
      return
    }

    if (inputMode === "text" && !content.trim()) {
      setError("يرجى إدخال نص العقد")
      return
    }

    if (inputMode === "file" && !file) {
      setError("يرجى اختيار ملف")
      return
    }

    setIsSubmitting(true)

    try {
      let contract
      if (inputMode === "text") {
        contract = await contractsApi.create(title, content)
      } else {
        contract = await contractsApi.upload(title, file!)
      }
      
      router.push(`/contracts/${contract.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء إنشاء العقد")
    } finally {
      setIsSubmitting(false)
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
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للوحة التحكم
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              إضافة عقد جديد
            </h1>
            <p className="text-muted-foreground mt-1">
              أدخل نص العقد أو ارفع ملف لتحليله
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                عنوان العقد
              </label>
              <Input
                type="text"
                placeholder="مثال: عقد عمل - شركة XYZ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-12 bg-card border-border"
              />
            </div>

            {/* Input Mode Tabs */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setInputMode("text")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  inputMode === "text"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="w-4 h-4" />
                إدخال نص
              </button>
              <button
                type="button"
                onClick={() => setInputMode("file")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  inputMode === "file"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Upload className="w-4 h-4" />
                رفع ملف
              </button>
            </div>

            {/* Content Input */}
            {inputMode === "text" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  نص العقد
                </label>
                <Textarea
                  placeholder="الصق نص العقد هنا..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[300px] bg-card border-border resize-y"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  ملف العقد
                </label>
                
                {file ? (
                  <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <File className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {file.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                      isDragging
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "bg-card border-border hover:border-primary/50"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isDragging ? "bg-primary/10" : "bg-muted"}`}>
                      <Upload className={`w-6 h-6 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground">
                        {isDragging ? "أفلت الملف هنا" : "اسحب الملف هنا أو اضغط للاختيار"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        PDF, DOCX, TXT (حد أقصى 10 MB)
                      </p>
                    </div>
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-[oklch(0.50_0.08_55)] hover:bg-[oklch(0.45_0.09_55)] text-white font-medium rounded-xl"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  جاري الإنشاء...
                </>
              ) : (
                "إنشاء العقد"
              )}
            </Button>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
