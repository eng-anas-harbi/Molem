"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Send, Scale, Menu, Plus, Trash2, FileText, Shield, Gavel, ChevronDown, ChevronUp, BookOpen, Loader2 } from "lucide-react"
import { chatApi, type ChatMessage, type ChatConversation, type ChatCitation } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { LogIn } from "lucide-react"

interface DisplayMessage {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: ChatCitation[]
  createdAt?: string
}

export function ChatInterface() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null)
  const [currentConversationTitle, setCurrentConversationTitle] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  }

  useEffect(() => {
    // Small delay to ensure DOM is updated before scrolling
    const timeout = setTimeout(() => {
      scrollToBottom()
    }, 50)
    return () => clearTimeout(timeout)
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }, [input])

  // Load conversations on mount
  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true)
    try {
      const convs = await chatApi.getConversations()
      setConversations(convs)
    } catch {
      // Silently fail - user may not be authenticated
    } finally {
      setIsLoadingConversations(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Load a conversation's messages
  const loadConversation = async (conversationId: number) => {
    setIsLoadingHistory(true)
    setError(null)
    try {
      const data = await chatApi.getConversation(conversationId)
      setCurrentConversationId(conversationId)
      setCurrentConversationTitle(data.conversation.title)
      setMessages(
        data.messages.map((msg) => ({
          id: msg.id.toString(),
          role: msg.role,
          content: msg.content,
          citations: msg.citations,
          createdAt: msg.createdAt,
        }))
      )
      setSidebarOpen(false)
    } catch {
      setError("فشل في تحميل المحادثة")
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] handleSubmit called", {
      inputValue: input,
      inputTrimmed: input.trim(),
      isLoading,
      currentConversationId,
    })
    
    if (!input.trim() || isLoading) {
      console.log("[v0] handleSubmit blocked by guard", {
        hasInput: !!input.trim(),
        isLoading,
      })
      return
    }

    const userMessage: DisplayMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: input.trim(),
    }

    console.log("[v0] sending chat message", {
      message: userMessage.content,
      conversationId: currentConversationId,
    })

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError(null)

    try {
      console.log("[v0] calling chatApi.sendMessage...")
      const response = await chatApi.sendMessage(
        userMessage.content,
        currentConversationId ?? undefined
      )
      console.log("[v0] chatApi.sendMessage success", response)

      // Update conversation info
      if (!currentConversationId) {
        setCurrentConversationId(response.conversation.id)
        setCurrentConversationTitle(response.conversation.title)
        // Add to conversations list
        setConversations((prev) => [response.conversation, ...prev])
      }

      // Update messages with real IDs
      setMessages((prev) => {
        const updated = prev.filter((m) => m.id !== userMessage.id)
        return [
          ...updated,
          {
            id: response.userMessage.id.toString(),
            role: response.userMessage.role,
            content: response.userMessage.content,
            createdAt: response.userMessage.createdAt,
          },
          {
            id: response.assistantMessage.id.toString(),
            role: response.assistantMessage.role,
            content: response.assistantMessage.content,
            citations: response.assistantMessage.citations,
            createdAt: response.assistantMessage.createdAt,
          },
        ]
      })
    } catch (err) {
      console.log("[v0] chatApi.sendMessage error", {
        errorName: (err as Error).name,
        errorMessage: (err as Error).message,
      })
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء إرسال الرسالة")
      // Remove the temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
    } finally {
      console.log("[v0] handleSubmit finished")
      setIsLoading(false)
    }
  }

  const startNewChat = () => {
    setMessages([])
    setCurrentConversationId(null)
    setCurrentConversationTitle(null)
    setError(null)
    setSidebarOpen(false)
  }

  const deleteConversation = async (conversationId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await chatApi.deleteConversation(conversationId)
      setConversations((prev) => prev.filter((c) => c.id !== conversationId))
      if (currentConversationId === conversationId) {
        startNewChat()
      }
    } catch {
      setError("فشل في حذف المحادثة")
    }
  }

  const toggleCitations = (messageId: string) => {
    setExpandedCitations((prev) => {
      const next = new Set(prev)
      if (next.has(messageId)) {
        next.delete(messageId)
      } else {
        next.add(messageId)
      }
      return next
    })
  }

  const formatContent = (content: string) => {
    // Preserve newlines and basic formatting
    return content.split("\n").map((line, i) => (
      <span key={i}>
        {line}
        {i < content.split("\n").length - 1 && <br />}
      </span>
    ))
  }

  const getSourceLabel = (source: "law" | "regulation") => {
    return source === "law" ? "نظام العمل" : "اللائحة التنفيذية"
  }

  return (
    <div className="flex w-full h-full bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed top-14 sm:top-16 bottom-0 right-0 z-50 w-64 sm:w-72 bg-header-bg border-l border-[oklch(0.88_0.03_45)] transform transition-transform duration-300 ease-in-out lg:relative lg:top-0 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full p-4 pt-6">
          <Button
            onClick={startNewChat}
            variant="outline"
            className="w-full justify-start gap-2 mb-4 h-12 border-[oklch(0.75_0.05_45)] text-header-foreground bg-[oklch(0.96_0.015_50)] hover:bg-[oklch(0.92_0.025_48)] hover:text-header-foreground hover:scale-[1.02] hover:shadow-md active:scale-[0.98] transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            محادثة جديدة
          </Button>

          <div className="flex-1 overflow-y-auto">
            <p className="text-sm text-header-foreground/70 px-2 mb-2">المحادثات السابقة</p>
            
            {isLoadingConversations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-header-foreground/50" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-header-foreground/50 px-2 py-4 text-center">
                لا توجد محادثات سابقة
              </p>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`group p-3 rounded-lg text-sm text-header-foreground truncate border cursor-pointer transition-all duration-200 flex items-center justify-between gap-2 ${
                      currentConversationId === conv.id
                        ? "bg-[oklch(0.92_0.025_48)] border-[oklch(0.75_0.05_45)]"
                        : "bg-[oklch(0.96_0.015_50)] border-[oklch(0.88_0.03_45)] hover:bg-[oklch(0.92_0.025_48)] hover:border-[oklch(0.75_0.05_45)]"
                    }`}
                  >
                    <span className="truncate flex-1">{conv.title}</span>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                      title="حذف المحادثة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between p-3 sm:p-4 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:scale-105 hover:bg-secondary active:scale-95 transition-all duration-200"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1 justify-center lg:justify-start">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center lg:hidden">
              <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            </div>
            {currentConversationTitle ? (
              <span className="text-sm sm:text-base font-medium text-foreground truncate max-w-[200px] sm:max-w-[300px]">
                {currentConversationTitle}
              </span>
            ) : (
              <span className="text-sm sm:text-base font-semibold text-foreground lg:hidden">Molem</span>
            )}
          </div>
          <div className="w-10" />
        </header>

        {/* Error Banner */}
        {error && (
          <div className="mx-3 sm:mx-4 mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
            <button
              onClick={() => setError(null)}
              className="mr-2 text-destructive/70 hover:text-destructive"
            >
              ✕
            </button>
          </div>
        )}

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-3 sm:px-4">
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-6">
                <Scale className="w-7 h-7 sm:w-10 sm:h-10 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2 text-balance">
                مرحباً بك في Molem
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed text-balance">
                محللك القانوني الذكي للعقود والاتفاقيات. اسألني عن أي سؤال قانوني متعلق بنظام العمل السعودي.
              </p>
              
              {/* Features */}
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-4 sm:mt-6">
                <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-card border border-border hover:bg-secondary hover:border-primary/30 hover:scale-105 transition-all duration-200 cursor-default">
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  <span className="text-xs sm:text-sm text-foreground">تحليل العقود</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-card border border-border hover:bg-secondary hover:border-primary/30 hover:scale-105 transition-all duration-200 cursor-default">
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  <span className="text-xs sm:text-sm text-foreground">كشف المخاطر</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-card border border-border hover:bg-secondary hover:border-primary/30 hover:scale-105 transition-all duration-200 cursor-default">
                  <Gavel className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  <span className="text-xs sm:text-sm text-foreground">استشارات قانونية</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-6 sm:mt-8 w-full max-w-lg">
                {[
                  "ما هي حقوق العامل في الإجازة السنوية؟",
                  "كم مدة فترة التجربة حسب نظام العمل؟",
                  "ما هي شروط إنهاء عقد العمل؟",
                  "ما هي مستحقات نهاية الخدمة؟",
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(suggestion)}
                    className="p-3 sm:p-4 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground hover:bg-secondary hover:border-primary/30 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-right"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-start" : "justify-end"
                  }`}
                >
                  <div
                    className={`max-w-[90%] sm:max-w-[85%] md:max-w-[70%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-xl sm:rounded-2xl rounded-tr-sm p-3 sm:p-4"
                        : "space-y-2"
                    }`}
                  >
                    {message.role === "user" ? (
                      <p className="text-xs sm:text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    ) : (
                      <>
                        <div className="bg-card border border-border text-foreground rounded-xl sm:rounded-2xl rounded-tl-sm p-3 sm:p-4">
                          <div className="text-xs sm:text-sm md:text-base leading-relaxed">
                            {formatContent(message.content)}
                          </div>
                        </div>
                        
                        {/* Citations */}
                        {message.citations && message.citations.length > 0 && (
                          <div className="bg-card/50 border border-border rounded-xl p-2 sm:p-3">
                            <button
                              onClick={() => toggleCitations(message.id)}
                              className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                            >
                              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span>المصادر ({message.citations.length})</span>
                              {expandedCitations.has(message.id) ? (
                                <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-auto" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-auto" />
                              )}
                            </button>
                            
                            {expandedCitations.has(message.id) && (
                              <div className="mt-2 space-y-2">
                                {message.citations.map((citation, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2 sm:p-3 rounded-lg bg-background border border-border text-xs sm:text-sm"
                                  >
                                    <div className="flex items-center gap-2 text-primary font-medium mb-1">
                                      <span className="px-2 py-0.5 rounded bg-primary/10 text-[10px] sm:text-xs">
                                        {getSourceLabel(citation.source)}
                                      </span>
                                      <span>مادة {citation.articleNumber}</span>
                                    </div>
                                    {citation.label && (
                                      <p className="text-foreground font-medium mb-1">{citation.label}</p>
                                    )}
                                    {citation.snippet && (
                                      <p className="text-muted-foreground leading-relaxed">{citation.snippet}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-end">
                  <div className="bg-card border border-border p-3 sm:p-4 rounded-xl sm:rounded-2xl rounded-tl-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-xs sm:text-sm text-muted-foreground">جاري التحليل...</span>
                    </div>
                  </div>
                </div>
              )}

            </>
          )}
        </div>

        {/* Input */}
        <div className="p-3 sm:p-4 border-t border-border bg-card/50 backdrop-blur-sm shrink-0">
          {!isAuthLoading && !isAuthenticated ? (
            <div className="max-w-3xl mx-auto text-center py-4">
              <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-sm sm:text-base text-foreground">
                  الرجاء تسجيل الدخول للتمكن من إستخدام خدمات مُلِم
                </p>
                <Link href="/login">
                  <Button className="gap-2">
                    <LogIn className="w-4 h-4" />
                    تسجيل الدخول
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
              <div className="flex items-end gap-2 bg-card border border-border rounded-xl sm:rounded-2xl p-1.5 sm:p-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                  placeholder="اسأل عن نظام العمل السعودي..."
                  className="flex-1 bg-transparent border-0 resize-none focus:outline-none text-foreground placeholder:text-muted-foreground p-1.5 sm:p-2 text-sm sm:text-base min-h-[40px] sm:min-h-[44px] max-h-[120px] sm:max-h-[150px]"
                  rows={1}
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading}
                  className="h-9 w-9 sm:h-11 sm:w-11 rounded-lg sm:rounded-xl shrink-0 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground text-center mt-1.5 sm:mt-2">
                Molem محلل قانوني ذكي وليس بديلاً عن المحامي. راجع محامياً مختصاً للقرارات المهمة.
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
