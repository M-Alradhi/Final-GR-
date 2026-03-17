"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/contexts/auth-context"
import { useLanguage } from "@/lib/contexts/language-context"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Mail, BookOpen, Award, Calendar } from "lucide-react"
import { getDocument } from "@/lib/firebase/db"
import { getFirebaseDb } from "@/lib/firebase/config"
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore"
import { formatDate } from "@/lib/utils/date"
import { studentSidebarItems } from "@/lib/constants/student-sidebar"

export default function ProfilePage() {
  const { userData, loading } = useAuth()
  const { t } = useLanguage()
  const [projectData, setProjectData] = useState<any>(null)
  const [stats, setStats] = useState({
    completedTasks: 0,
    totalTasks: 0,
    meetings: 0,
    filesUploaded: 0,
  })

  useEffect(() => {
    if (!userData?.uid) return
    const uid = userData.uid
    const projectId = userData.projectId

    const db = getFirebaseDb()

    const loadStats = async () => {
      try {
        const tasksSnap = await getDocs(query(collection(db, "tasks"), where("studentId", "==", uid)))
        const tasks = tasksSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((t: any) => t.status !== "cancelled" && t.status !== "canceled" && t.status !== "deleted")
        const completedTasks = tasks.filter((t: any) => t.status === "graded").length

        const meetingsSnap = await getDocs(query(collection(db, "meetings"), where("studentId", "==", uid)))
        const activeMeetings = meetingsSnap.docs.filter((d) => {
          const data = d.data()
          return data.status !== "cancelled" && data.status !== "canceled"
        })

        const filesUploaded = tasks.reduce((count: number, t: any) => {
          const submitted = t.submittedFiles || []
          return count + submitted.filter((f: any) => f && (f.url || f.name)).length
        }, 0)
        const filesSnap = await getDocs(query(collection(db, "files"), where("uploadedBy", "==", uid)))

        setStats({
          completedTasks,
          totalTasks: tasks.length,
          meetings: activeMeetings.length,
          filesUploaded: filesUploaded + filesSnap.size,
        })
      } catch (err) {
        console.error("Error fetching stats:", err)
      }
    }

    const loadProject = async () => {
      if (!projectId) return
      try {
        const project = await getDocument("projects", projectId)
        setProjectData(project)
      } catch (err) {
        console.error("Error fetching project:", err)
      }
    }

    loadStats()
    loadProject()

    const unsubTasks = onSnapshot(
      query(collection(db, "tasks"), where("studentId", "==", uid)),
      () => loadStats()
    )
    const unsubMeetings = onSnapshot(
      query(collection(db, "meetings"), where("studentId", "==", uid)),
      () => loadStats()
    )

    const unsubs = [unsubTasks, unsubMeetings]

    if (projectId) {
      const unsubProject = onSnapshot(
        query(collection(db, "projects"), where("__name__", "==", projectId)),
        () => loadProject()
      )
      unsubs.push(unsubProject)
    }

    return () => unsubs.forEach((u) => u())
  }, [userData?.uid, userData?.projectId])

  const fetchProjectData = async () => {}
  const fetchStats = async () => {}

  if (!userData) {
    return null
  }

  const initials = userData.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <DashboardLayout sidebarItems={studentSidebarItems} requiredRole="student">
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t("profile")}</h1>
          <p className="text-muted-foreground">{t("personalInfo")}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <CardTitle>{userData.name}</CardTitle>
              <CardDescription>
                <Badge variant="secondary" className="mt-2">
                  {t(userData.role)}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{userData.email}</span>
              </div>
              {userData.studentId && (
                <div className="flex items-center gap-2 text-sm">
                  <Award className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {t("studentId")}: {userData.studentId}
                  </span>
                </div>
              )}
              {userData.department && (
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {t("department")}: {userData.department}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {t("date")}: {formatDate(userData.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("statistics")}</CardTitle>
                <CardDescription>{t("overviewText")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">{t("completedTasks")}</span>
                      <Award className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-2xl font-bold">
                      {stats.completedTasks}/{stats.totalTasks}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%{" "}
                      {t("completed")}
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">{t("meetings")}</span>
                      <Calendar className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold">{stats.meetings}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("total")}</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">{t("files")}</span>
                      <BookOpen className="w-4 h-4 text-purple-500" />
                    </div>
                    <p className="text-2xl font-bold">{stats.filesUploaded}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("uploadedBy")}</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">{t("projectProgress")}</span>
                      <Award className="w-4 h-4 text-yellow-500" />
                    </div>
                    <p className="text-2xl font-bold">{projectData?.progress || 0}%</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("myProject")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {projectData && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("myProjectDetails")}</CardTitle>
                  <CardDescription>{t("projectDetails")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">{t("projectTitle")}</Label>
                    <p className="font-medium mt-1">{projectData.title}</p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground">{t("projectDescription")}</Label>
                    <p className="mt-1">{projectData.description}</p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">{t("projectStatus")}</Label>
                      <div className="mt-1">
                        <Badge
                          variant={
                            projectData.status === "active" || projectData.status === "approved"
                              ? "default"
                              : projectData.status === "pending"
                                ? "secondary"
                                : projectData.status === "completed"
                                  ? "outline"
                                  : "destructive"
                          }
                        >
                          {projectData.status === "active"
                            ? t("active")
                            : projectData.status === "approved"
                              ? t("approved")
                              : projectData.status === "pending"
                                ? t("underReview")
                                : projectData.status === "completed"
                                  ? t("completed")
                                  : projectData.status === "archived"
                                    ? t("archived")
                                    : t("rejected")}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("startDate")}</Label>
                      <p className="mt-1">{formatDate(projectData.startDate)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
