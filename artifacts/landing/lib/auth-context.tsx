"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { User, authApi, getToken, setToken, removeToken } from "./api"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (token) {
      authApi.me()
        .then((user) => setUser(user))
        .catch(() => removeToken())
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password)
    setToken(response.token)
    setUser(response.user)
  }

  const register = async (email: string, password: string, name: string) => {
    const response = await authApi.register(email, password, name)
    setToken(response.token)
    setUser(response.user)
  }

  const logout = () => {
    removeToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
