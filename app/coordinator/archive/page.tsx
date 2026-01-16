"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { coordinatorSidebarItems } from "@/lib/constants/coordinator-sidebar"
import { FolderKanban } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { db } from "@/lib/firebase/config"
import { Progress } from "@/components/ui/progress"
import { collection, getDocs, doc, updateDoc } from "firebase/firestore"

export default function CoordinatorArchive() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProjects = async () => {
    try {
      const projectsSnapshot = await getDocs(collection(db, "projects"))
      const projectsData = projectsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setProjects(projectsData)
    } catch (error) {
      console.error("Error fetching projects:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const archivedProjects = projects.filter((p) => p.status === "archived")

  const handleRestoreProject = async (projectId: string) => {
    try {
      const projectRef = doc(db, "projects", projectId)
      await updateDoc(projectRef, { status: "active" })

      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: "active" } : p))

      alert("تم استرجاع المشروع بنجاح")
    } catch (error) {
      console.error("خطأ في استرجاع المشروع:", error)
    }
  }

  const ProjectCard = ({ project }: { project: any }) => (
    <Card className="rounded-xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{project.title}</CardTitle>
            <CardDescription className="mt-2 line-clamp-2">{project.description}</CardDescription>
          </div>
          <Badge variant="secondary" className="rounded-lg">
            مؤرشف
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">التقدم</span>
            <span className="text-sm text-muted-foreground">{project.progress || 0}%</span>
          </div>
          <Progress value={project.progress || 0} />
        </div>

        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">تاريخ البدء:</span>
            <span>
              {project.startDate ? new Date(project.startDate.seconds * 1000).toLocaleDateString("ar-EG") : "غير محدد"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">المشرف:</span>
            <span>{project.supervisorName || "غير معين"}</span>
          </div>
          {project.studentName && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">الطالب:</span>
              <span>{project.studentName}</span>
            </div>
          )}
        </div>
        
        <div className="flex justify-center mt-4">
          <Button
            variant="default"
            className="bg-gray-500 text-white hover:bg-gray-600"
            onClick={() => handleRestoreProject(project.id)}
          >
            استرجاع المشروع
          </Button>
        </div>
      </CardContent>
    </Card>
  )
      

  return (
    <DashboardLayout sidebarItems={coordinatorSidebarItems} requiredRole="coordinator">
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">الأرشيف</h1>
          <p className="text-muted-foreground mt-2">المشاريع المؤرشفة</p>
        </div>

        {loading ? (
          <Card className="rounded-xl">
            <CardContent className="p-8">
              <p className="text-center text-muted-foreground">جاري التحميل...</p>
            </CardContent>
          </Card>
        ) : archivedProjects.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <FolderKanban className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">لا توجد مشاريع مؤرشفة</h3>
                  <p className="text-sm text-muted-foreground mt-2">سيتم عرض المشاريع المؤرشفة هنا</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {archivedProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
