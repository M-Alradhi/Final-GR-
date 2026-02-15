"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Bot, Send, X, Minimize2, Maximize2, Sparkles, Trash2 } from "lucide-react"
import { useLanguage } from "@/lib/contexts/language-context"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { language } = useLanguage()
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const t = useCallback(
    (key: string) => {
      const translations: Record<string, Record<string, string>> = {
        aiAssistant: { ar: "مساعد المنصة الذكي", en: "GP Platform Assistant" },
        aiWelcomeMessage: {
          ar: "مرحبا! أنا مساعد منصة التخرج",
          en: "Hello! I'm the GP Platform Assistant",
        },
        chatbotHelp: {
          ar: "اسألني أي سؤال عن النظام، المشاريع، المهام، أو أي شيء آخر وسأساعدك فورا.",
          en: "Ask me anything about the system, projects, tasks, or anything else and I'll help you right away.",
        },
        typeYourQuestion: { ar: "اكتب سؤالك هنا...", en: "Type your question here..." },
        clearChat: { ar: "مسح المحادثة", en: "Clear chat" },
        poweredBy: { ar: "مدعوم بالذكاء الاصطناعي DeepSeek", en: "Powered by DeepSeek AI" },
      }
      return translations[key]?.[language] || translations[key]?.["ar"] || key
    },
    [language],
  )

  useEffect(() => {
    if (scrollRef.current) {
      try {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
      } catch {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      }
    }
  }, [messages])

  const adjustTextareaHeight = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    const max = 160
    const newH = Math.min(ta.scrollHeight, max)
    ta.style.height = `${newH}px`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput("")
    setIsLoading(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          language,
        }),
      })

      if (!response.ok) {
        const errBody = await response.text()
        console.log("[v0] Chat API error response:", response.status, errBody)
        throw new Error(`HTTP error! status: ${response.status} - ${errBody}`)
      }

      const assistantMessageId = (Date.now() + 1).toString()

      // Add empty assistant message
      setMessages((prev) => [...prev, { id: assistantMessageId, role: "assistant", content: "" }])

      // Read the stream as plain text
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error("No reader available")

      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        fullContent += chunk
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMessageId ? { ...m, content: fullContent } : m)),
        )
      }

      // If no content was streamed, set a fallback
      if (!fullContent) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content:
                    language === "ar"
                      ? "عذرا، لم أتمكن من الحصول على رد. حاول مرة أخرى."
                      : "Sorry, I couldn't get a response. Please try again.",
                }
              : m,
          ),
        )
      }
    } catch (error) {
      console.error("Chatbot error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          language === "ar"
            ? "عذرا، حدث خطأ في الاتصال بالمساعد الذكي. يرجى المحاولة مرة أخرى."
            : "Sorry, there was an error connecting to the AI assistant. Please try again.",
      }
      setMessages((prev) => {
        // Remove any empty assistant message that was added for streaming
        const filtered = prev.filter((m) => !(m.role === "assistant" && m.content === ""))
        return [...filtered, errorMessage]
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickQuestion = (question: string) => {
    setInput(question)
    setTimeout(() => {
      const form = document.querySelector("#chatbot-form") as HTMLFormElement
      if (form) {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
      }
    }, 100)
  }

  const clearMessages = () => {
    setMessages([])
  }

  const quickQuestions =
    language === "ar"
      ? ["كيف أقدم فكرة مشروع؟", "كيف أسلم مهمة؟", "كيف أطلب اجتماع؟", "أين أجد درجاتي؟"]
      : [
          "How do I submit a project idea?",
          "How do I submit a task?",
          "How do I request a meeting?",
          "Where can I find my grades?",
        ]

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 h-16 w-16 rounded-full shadow-2xl hover:shadow-3xl transition-all hover:scale-110 bg-gradient-to-br from-primary via-accent to-primary glow-effect animate-float"
        size="icon"
        aria-label="Open AI Assistant"
      >
        <Bot className="h-7 w-7" />
        <Sparkles className="h-4 w-4 absolute -top-1 -left-1 text-yellow-300 animate-pulse" />
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-6 left-6 flex flex-col w-80 max-w-[95vw] h-[32rem] md:h-[36rem] shadow-2xl z-50 border-2 border-primary/30 glass-effect glow-effect animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-l from-primary via-accent to-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="relative animate-float">
            <Bot className="h-6 w-6" />
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
          </div>
          <div>
            <h3 className="font-bold text-sm">{t("aiAssistant")}</h3>
            <p className="text-[10px] opacity-80">DeepSeek AI</p>
          </div>
        </div>
        <div className="flex gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearMessages}
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 transition-all hover:scale-110"
              title={t("clearChat")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 transition-all hover:scale-110"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 transition-all hover:scale-110"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center space-y-4 animate-in fade-in duration-500">
                  <div className="flex justify-center">
                    <div className="p-5 bg-gradient-to-br from-primary/20 to-accent/10 rounded-full animate-float glow-effect">
                      <Bot className="h-14 w-14 text-primary" />
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-xl mb-2 bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
                      {t("aiWelcomeMessage")}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t("chatbotHelp")}</p>
                  </div>

                  <div className="space-y-2 pt-4">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {language === "ar" ? "أسئلة سريعة:" : "Quick questions:"}
                    </p>
                    {quickQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickQuestion(question)}
                        className="w-full text-right text-sm p-3 rounded-lg glass-effect hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] border border-border"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex animate-slide-up ${message.role === "user" ? "justify-start" : "justify-end"}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md break-words whitespace-pre-wrap leading-relaxed ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-bl-none text-right"
                        : "glass-effect rounded-br-none border border-border text-left"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.content === "" && (
                <div className="flex justify-end animate-slide-up">
                  <div className="glass-effect rounded-2xl px-5 py-4 rounded-bl-none border border-border">
                    <div className="flex gap-2">
                      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" />
                      <div className="w-2.5 h-2.5 bg-accent rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="border-t bg-gradient-to-l from-muted/50 to-muted/20 p-3">
            <form id="chatbot-form" onSubmit={handleSubmit} className="flex items-end gap-2">
              <Textarea
                ref={(el) => {
                  textareaRef.current = el
                }}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  setTimeout(adjustTextareaHeight, 0)
                }}
                placeholder={t("typeYourQuestion")}
                disabled={isLoading}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    const form = (e.target as HTMLElement).closest("form")
                    if (form) form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
                  }
                }}
                className="flex-1 min-h-[40px] max-h-[160px] resize-none overflow-auto bg-background text-foreground placeholder:text-muted-foreground border border-input rounded-md px-3 py-2"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="shrink-0 h-11 w-11 bg-gradient-to-l from-primary to-accent hover:from-primary/90 hover:to-accent/90 glow-effect transition-all hover:scale-110"
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">{t("poweredBy")}</p>
          </div>
        </>
      )}
    </Card>
  )
}
