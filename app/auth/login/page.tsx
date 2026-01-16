"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "@/lib/firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GraduationCap, Loader2, Mail, Lock } from "lucide-react"
import { useLanguage } from "@/lib/contexts/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { userData } = await signIn(email, password)

      if (userData.role === "student") {
        router.push("/student/dashboard")
      } else if (userData.role === "supervisor") {
        router.push("/supervisor/dashboard")
      } else if (userData.role === "coordinator") {
        router.push("/coordinator/dashboard")
      }
    } catch (err: any) {
      setError(t("invalidCredentials"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 p-4 animate-gradient">
      <div className="absolute top-4 left-4">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-700 hover:shadow-3xl transition-shadow">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="flex justify-center mb-2">
            <div className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-4 rounded-2xl shadow-lg animate-float">
              <GraduationCap className="w-10 h-10" />
            </div>
          </div>
          <div className="space-y-2 animate-in slide-in-from-top duration-700 delay-150">
            <CardTitle className="text-3xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
              {t("login")}
            </CardTitle>
            <CardDescription className="text-base">{t("graduationProjectsPlatform")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="animate-in slide-in-from-bottom duration-700 delay-300">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="animate-in shake duration-500">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                {t("email")}
              </Label>
              <div className="relative">
                <Mail className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="example@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10 h-11 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  {t("password")}
                </Label>
                <a href="/auth/forgot-password" className="text-xs text-primary hover:underline transition-colors">
                  {t("forgotPassword")}
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10 h-11 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  {t("loggingIn")}
                </>
              ) : (
                t("loginButton")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
