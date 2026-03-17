"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, FolderKanban, CheckSquare, Calendar, FileText, Bell, User, Megaphone, Pin } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/contexts/auth-context"
import { useLanguage } from "@/lib/contexts/language-context"
import { useEffect, useState } from "react"
import { getFirebaseDb } from "@/lib/firebase/config"
import { collection, query, where, orderBy, getDocs, onSnapshot, type Timestamp } from "firebase/firestore"
import { Skeleton } from "@/components/ui/skeleton"

import { studentSidebarItems } from "@/lib/constants/student-sidebar"

interface Announcement {
  id: string
  title: string
  content: string
  authorName: string
  authorRole: string
  projectId?: string
  projectTitle?: string
  scope?: string
  isPinned: boolean
  createdAt: Timestamp
  attachments?: { name: string; url: string }[]
}

export default function StudentAnnouncements() {
  const { userData, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const filteredAnnouncements = announcements

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (authLoading || !userData) return

      try {
        setLoading(true)
        const db = getFirebaseDb()

        // جلب إعلانات المشروع الخاص بالطالب
        let projectAnnouncements: Announcement[] = []
        if (userData.projectId) {
          const projectQuery = query(
            collection(db, "announcements"),
            where("projectId", "==", userData.projectId),
            orderBy("createdAt", "desc"),
          )
          const projectSnapshot = await getDocs(projectQuery)
          projectAnnouncements = projectSnapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Announcement[]
        }

        // جلب الإعلانات العامة (scope = all أو بدون projectId)
        const allAnnouncementsQuery = query(
          collection(db, "announcements"),
          orderBy("createdAt", "desc"),
        )
        const allAnnouncementsSnapshot = await getDocs(allAnnouncementsQuery)
        const allAnnouncementsDocs = allAnnouncementsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Announcement[]

        const projectAnnouncementIds = new Set(projectAnnouncements.map((a) => a.id))
        const generalAnnouncements = allAnnouncementsDocs.filter((ann: any) => {
          if (projectAnnouncementIds.has(ann.id)) return false
          return !ann.projectId || ann.projectId === null || ann.projectId === ""
        })

        // دمج وترتيب: المثبتة أولاً ثم بالتاريخ
        const allAnnouncements = [...projectAnnouncements, ...generalAnnouncements].sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1
          if (!a.isPinned && b.isPinned) return 1
          return b.createdAt.seconds - a.createdAt.seconds
        })

        setAnnouncements(allAnnouncements)
      } catch (error) {
        console.error("Error fetching announcements:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncements()

    if (!userData?.uid) return
    const db2 = getFirebaseDb()

    // Real-time: listen to announcements collection
    const unsubAll = onSnapshot(
      query(collection(db2, "announcements"), orderBy("createdAt", "desc")),
      () => fetchAnnouncements()
    )

    return () => { unsubAll() }
  }, [userData?.uid, userData?.projectId, authLoading])


  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate()
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return `${t("today")} ${Math.floor(diffInHours)}`
    } else if (diffInHours < 48) {
      return t("yesterday")
    } else {
      return date.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    }
  }

  return (
    <DashboardLayout sidebarItems={studentSidebarItems} requiredRole="student">
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Megaphone className="w-8 h-8 text-primary" />
              </div>
              {t("announcements")}
            </h1>
            <p className="text-muted-foreground mt-2">{t("latestUpdates")}</p>
          </div>
        </div>

        <div className="mt-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 bg-muted rounded-full mb-4">
                    <Megaphone className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{t("noAnnouncementsYet")}</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">{t("noContent")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {filteredAnnouncements.map((announcement, index) => (
                  <Card
                    key={announcement.id}
                    className={`animate-in fade-in slide-in-from-bottom duration-500 hover:shadow-lg transition-all ${
                      announcement.isPinned ? "border-primary/50 bg-primary/5" : ""
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {announcement.isPinned && (
                              <Badge variant="default" className="gap-1">
                                <Pin className="w-3 h-3" />
                                {t("new")}
                              </Badge>
                            )}

                          </div>
                          <CardTitle className="text-xl">{announcement.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{announcement.authorName}</span>
                            <span>•</span>
                            <span>
                              {announcement.authorRole === "supervisor"
                                ? t("supervisor")
                                : announcement.authorRole === "coordinator"
                                  ? t("coordinator")
                                  : ""}
                            </span>
                            <span>•</span>
                            <span>{formatDate(announcement.createdAt)}</span>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{announcement.content}</p>

                      {announcement.projectTitle && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FolderKanban className="w-4 h-4" />
                          <span>{announcement.projectTitle}</span>
                        </div>
                      )}

                      {announcement.attachments && announcement.attachments.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">{t("attachedFiles")}:</p>
                          <div className="space-y-2">
                            {announcement.attachments.map((attachment, idx) => (
                              <a
                                key={idx}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
                              >
                                <FileText className="w-4 h-4 text-primary" />
                                <span className="flex-1">{attachment.name}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
        </div>
      </div>
    </DashboardLayout>
  )
}
