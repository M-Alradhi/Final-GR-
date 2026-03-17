"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { supervisorSidebarItems } from "@/lib/constants/supervisor-sidebar"
import { Users, FolderKanban, Mail, FileText, CheckSquare } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/contexts/auth-context"
import { useLanguage } from "@/lib/contexts/language-context"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function SupervisorStudents() {
  const { userData } = useAuth()
  const { t } = useLanguage()
    const [stats, setStats] = useState({
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      totalSupervisors: 0,
      totalStudents: 0,
      averageProgress: 0,
      projectsNeedingAttention: 0,
    })
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchStudents = async () => {
    if (!userData?.uid) return
    try {
      // Get all projects where this supervisor is primary or co-supervisor
      const [projSnap1, projSnap2] = await Promise.all([
        getDocs(query(collection(db, "projects"), where("supervisorId", "==", userData.uid))),
        getDocs(query(collection(db, "projects"), where("coSupervisorId", "==", userData.uid))),
      ])
      const projIds = new Set<string>()
      const allProjects = [...projSnap1.docs, ...projSnap2.docs].filter((d) => {
        if (projIds.has(d.id)) return false; projIds.add(d.id); return true
      }).map((d) => ({ id: d.id, ...d.data() }))

      // Collect all student IDs from projects
      const studentIdSet = new Set<string>()
      allProjects.forEach((project: any) => {
        if (project.studentId) studentIdSet.add(project.studentId)
        if (Array.isArray(project.studentIds)) {
          project.studentIds.forEach((id: any) => { if (typeof id === "string") studentIdSet.add(id) })
        }
        if (Array.isArray(project.teamMembers)) {
          project.teamMembers.forEach((member: any) => {
            // teamMembers can be an array of objects {userId, name, ...} or plain strings
            const id = typeof member === "string" ? member : member?.userId
            if (id) studentIdSet.add(id)
          })
        }
      })

      if (studentIdSet.size === 0) { setStudents([]); setLoading(false); return }

      // Fetch all students then filter
      const allStudentsSnap = await getDocs(query(collection(db, "users"), where("role", "==", "student")))
      const allDocs = allStudentsSnap.docs.filter((d) => studentIdSet.has(d.id))
      const studentsData = await Promise.all(
        allDocs.map(async (doc) => {
          const studentData = { id: doc.id, ...doc.data() }
          let projectData = null
          const primaryProjectsSnap = await getDocs(query(collection(db, "projects"), where("studentId", "==", doc.id)))
          if (!primaryProjectsSnap.empty) {
            projectData = { id: primaryProjectsSnap.docs[0].id, ...primaryProjectsSnap.docs[0].data() }
          } else {
            const allProjectsSnap = await getDocs(query(collection(db, "projects")))
            for (const projectDoc of allProjectsSnap.docs) {
              const project = projectDoc.data()
              const memberIds = Array.isArray(project.teamMembers)
                ? project.teamMembers.map((m: any) => typeof m === "string" ? m : m?.userId).filter(Boolean)
                : []
              if (memberIds.includes(doc.id)) {
                projectData = { id: projectDoc.id, ...project }; break
              }
            }
          }
          const tasksSnap = await getDocs(query(collection(db, "tasks"), where("studentId", "==", doc.id)))
          const completedTasks = tasksSnap.docs.filter((t) => ["graded", "submitted"].includes(t.data().status)).length
          return { ...studentData, project: projectData, totalTasks: tasksSnap.size, completedTasks }
        }),
      )
      setStudents(studentsData)
    } catch (error) {
      console.error("Error fetching students:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!userData?.uid) return

    fetchStudents()

    // Real-time: re-fetch when projects or users change
    const unsubUsers = onSnapshot(
      query(collection(db, "users"), where("role", "==", "student")),
      () => fetchStudents()
    )
    const unsubProjects = onSnapshot(
      collection(db, "projects"),
      () => fetchStudents()
    )
    const unsubTasks = onSnapshot(
      query(collection(db, "tasks"), where("supervisorId", "==", userData.uid)),
      () => fetchStudents()
    )

    return () => { unsubUsers(); unsubProjects(); unsubTasks() }
  }, [userData?.uid])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <DashboardLayout sidebarItems={supervisorSidebarItems} requiredRole="supervisor">
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">{t("myStudents")}</h1>
          <p className="text-muted-foreground mt-2">{t("manageAndMonitorStudents")}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("totalStudents")}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{students.length}</div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("studentsWithProjects")}</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{students.filter((s) => s.project).length}</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("studentsWithoutProjects")}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{students.filter((s) => !s.project).length}</div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card className="rounded-xl">
            <CardContent className="p-8">
              <p className="text-center text-muted-foreground">{t("loading")}</p>
            </CardContent>
          </Card>
        ) : students.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <Users className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">{t("noStudentsYet")}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{t("studentsWillBeAssigned")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {students.map((student) => (
              <Card key={student.id} className="rounded-xl hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(student.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{student.name}</CardTitle>
                          <CardDescription className="mt-1">
                            <Badge variant="outline" className="rounded-lg">
                              {student.studentId}
                            </Badge>
                          </CardDescription>
                        </div>
                        {student.project ? (
                          <Badge className="rounded-lg bg-green-500">{t("withProject")}</Badge>
                        ) : (
                          <Badge variant="secondary" className="rounded-lg">
                            {t("withoutProject")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-3">
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground truncate">{student.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t("department")}:</span>
                      <span>{student.department}</span>
                    </div>
                    {student.project && (
                      <div className="flex items-center gap-2">
                        <FolderKanban className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t("project")}:</span>
                        <span>{student.project.title}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t("completedTask")}:</span>
                      <span>{student.completedTasks}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={student.totalTasks ? (student.completedTasks / student.totalTasks) * 100 : 0}
                        className="w-full"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}