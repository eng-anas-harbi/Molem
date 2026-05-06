const BASE_URL = "/api"

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface Contract {
  id: string
  title: string
  fileName?: string
  content?: string
  createdAt: string
  analysisStatus: "pending" | "analyzing" | "completed" | "failed"
}

export interface Citation {
  source: string
  articleNumber: string
  label: string
  snippet: string
}

export interface RightItem {
  title: string
  description: string
  citations: string[]
}

export interface Alert {
  severity: "low" | "medium" | "high"
  issue: string
  explanation: string
  suggestedFix: string
  citations: string[]
}

export interface Analysis {
  id: string
  contractId: string
  status: "completed" | "failed"
  summary: string
  contractType: string
  partiesDescription: string
  employeeRights: RightItem[]
  employerRights: RightItem[]
  alerts: Alert[]
  citations: Citation[]
  errorMessage?: string
  completedAt: string
}

export interface ContractWithAnalysis {
  contract: Contract
  analysis: Analysis | null
}

export interface LawArticle {
  id: string
  source: string
  articleNumber: string
  label: string
  content: string
}

export function setToken(token: string): void {
  if (typeof document === "undefined") return
  const expires = new Date()
  expires.setTime(expires.getTime() + 30 * 24 * 60 * 60 * 1000)
  document.cookie = `molem_token=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
}

export function getToken(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/(?:^|; )molem_token=([^;]*)/)
  return match ? match[1] : null
}

export function removeToken(): void {
  if (typeof document === "undefined") return
  document.cookie = "molem_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax"
}

async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: HeadersInit = { ...(options.headers || {}) }

  if (!(options.body instanceof FormData)) {
    ;(headers as Record<string, string>)["Content-Type"] = "application/json"
  }

  if (token) {
    ;(headers as Record<string, string>)["Authorization"] = `Bearer ${token}`
  }

  const url = `${BASE_URL}${endpoint}`

  const response = await fetch(url, { ...options, headers })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "حدث خطأ غير متوقع" }))
    throw new Error(error.error || error.message || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export const authApi = {
  register: async (email: string, password: string, name: string): Promise<AuthResponse> =>
    apiCall<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) }),

  login: async (email: string, password: string): Promise<AuthResponse> =>
    apiCall<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  me: async (): Promise<User> => apiCall<User>("/auth/me"),
}

export const contractsApi = {
  getAll: async (): Promise<Contract[]> => apiCall<Contract[]>("/contracts"),

  getById: async (id: string): Promise<ContractWithAnalysis> =>
    apiCall<ContractWithAnalysis>(`/contracts/${id}`),

  create: async (title: string, content: string): Promise<Contract> =>
    apiCall<Contract>("/contracts", { method: "POST", body: JSON.stringify({ title, content }) }),

  upload: async (title: string, file: File): Promise<Contract> => {
    const formData = new FormData()
    formData.append("title", title)
    formData.append("file", file)
    return apiCall<Contract>("/contracts/upload", { method: "POST", body: formData })
  },

  delete: async (id: string): Promise<{ ok: boolean }> =>
    apiCall<{ ok: boolean }>(`/contracts/${id}`, { method: "DELETE" }),

  analyze: async (id: string): Promise<Analysis> =>
    apiCall<Analysis>(`/contracts/${id}/analyze`, { method: "POST" }),
}

export const lawApi = {
  search: async (query: string, source?: "law" | "regulation", limit = 20): Promise<LawArticle[]> => {
    const params = new URLSearchParams({ q: query, limit: limit.toString() })
    if (source) params.append("source", source)
    return apiCall<LawArticle[]>(`/law/articles?${params.toString()}`)
  },
}

export interface ChatCitation {
  source: "law" | "regulation"
  articleNumber: string
  label: string
  snippet: string
}

export interface ChatMessage {
  id: number
  role: "user" | "assistant"
  content: string
  citations?: ChatCitation[]
  createdAt: string
}

export interface ChatConversation {
  id: number
  title: string
  createdAt: string
  updatedAt: string
}

export interface ChatMessageResponse {
  conversation: ChatConversation
  userMessage: ChatMessage
  assistantMessage: ChatMessage
}

export interface ChatConversationWithMessages {
  conversation: ChatConversation
  messages: ChatMessage[]
}

export const chatApi = {
  sendMessage: async (message: string, conversationId?: number): Promise<ChatMessageResponse> =>
    apiCall<ChatMessageResponse>("/chat/messages", {
      method: "POST",
      body: JSON.stringify(conversationId ? { message, conversationId } : { message }),
    }),

  getConversations: async (): Promise<ChatConversation[]> =>
    apiCall<ChatConversation[]>("/chat/conversations"),

  getConversation: async (id: number): Promise<ChatConversationWithMessages> =>
    apiCall<ChatConversationWithMessages>(`/chat/conversations/${id}`),

  deleteConversation: async (id: number): Promise<void> => {
    const token = getToken()
    const response = await fetch(`${BASE_URL}/chat/conversations/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) throw new Error("Failed to delete conversation")
  },
}
