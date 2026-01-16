"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { coordinatorSidebarItems } from "@/lib/constants/coordinator-sidebar"
import { useAuth } from "@/lib/contexts/auth-context"
import { useEffect, useState } from "react"
import { getFirebaseDb } from "@/lib/firebase/config"
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  query,
  where,
  Timestamp,
} from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Lightbulb, CheckCircle2, XCircle, Eye, Loader2, AlertCircle, UsersIcon, UserPlus, X } from "lucide-react"
import { notifyProjectApproved, notifyProjectRejected } from "@/lib/utils/notification-helper"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ApproveProjects() {
  const [projectIdeas, setProjectIdeas] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([]) // ✅ NEW
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false)
  const [isTeamFormationDialogOpen, setIsTeamFormationDialogOpen] = useState(false)
  const [supervisors, setSupervisors] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [newProject, setNewProject] = useState({
    supervisorIds: [] as string[],
    startDate: "",
    endDate: "",
  })
  const [rejectionReason, setRejectionReason] = useState("")
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [isSavingTeam, setIsSavingTeam] = useState(false)
  const { userData } = useAuth()

  // ✅ NEW: Convert stored department value => Arabic name
  const getDepartmentName = (deptValue: any) => {
    if (!deptValue) return "غير محدد"

    // Legacy support: cs / it / is
    const legacyMap: Record<string, string> = {
      cs: "علوم الحاسب",
      it: "تقنية المعلومات",
      is: "نظم المعلومات",
    }
    if (typeof deptValue === "string" && legacyMap[deptValue.toLowerCase()]) {
      return legacyMap[deptValue.toLowerCase()]
    }

    // Stored as Doc ID
    const byId = departments.find((d) => d.id === deptValue)
    if (byId) return byId.nameAr || byId.nameEn || byId.code || "غير محدد"

    // Stored as code e.g. CS/CC
    if (typeof deptValue === "string") {
      const normalized = deptValue.trim().toLowerCase()
      const byCode = departments.find((d) => (d.code || "").trim().toLowerCase() === normalized)
      if (byCode) return byCode.nameAr || byCode.nameEn || byCode.code || "غير محدد"

      // Stored as direct name
      if (deptValue.trim().length > 0) return deptValue
    }

    return "غير محدد"
  }

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const ideasSnapshot = await getDocs(collection(getFirebaseDb(), "projectIdeas"))
      const ideasData = ideasSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      setProjectIdeas(ideasData)
    } catch (error) {
      console.error("Error fetching project ideas:", error)
      toast.error("حدث خطأ في تحميل أفكار المشاريع")
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const db = getFirebaseDb()
      const qDepts = query(collection(db, "departments"), where("isActive", "==", true))
      const snap = await getDocs(qDepts)
      setDepartments(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch (e) {
      console.error("Error fetching departments:", e)
    }
  }

  const fetchSupervisors = async () => {
    try {
      const supervisorsQuery = query(collection(getFirebaseDb(), "users"), where("role", "==", "supervisor"))
      const supervisorsSnapshot = await getDocs(supervisorsQuery)
      setSupervisors(supervisorsSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
    } catch (error) {
      console.error("Error fetching supervisors:", error)
    }
  }

  const fetchStudents = async () => {
    try {
      const studentsQuery = query(collection(getFirebaseDb(), "users"), where("role", "==", "student"))
      const studentsSnapshot = await getDocs(studentsQuery)
      const studentsData = studentsSnapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((student) => student.name)
      setStudents(studentsData)
    } catch (error) {
      console.error("Error fetching students:", error)
    }
  }

  useEffect(() => {
    fetchProjects()
    fetchDepartments() // ✅ NEW
    fetchSupervisors()
    fetchStudents()
  }, [])

  const handleTeamFormationClick = (project: any) => {
    setSelectedProject(project)
    setTeamMembers([
      {
        userId: project.studentId,
        name: project.studentName,
        email: project.studentEmail,
        studentId: project.studentEmail,
        role: "leader",
      },
    ])
    setIsTeamFormationDialogOpen(true)
  }

  const handleAddTeamMember = (studentId: string) => {
    const student = students.find((s) => s.id === studentId)
    if (!student) return

    if (teamMembers.some((m) => m.userId === studentId)) {
      toast.error("هذا الطالب موجود بالفعل في الفريق")
      return
    }

    if (student.projectId) {
      toast.error("لا يمكن إضافة هذا الطالب: لديه مشروع نشط بالفعل")
      return
    }

    setTeamMembers([
      ...teamMembers,
      {
        userId: student.id,
        name: student.name,
        email: student.email,
        studentId: student.studentId || student.email,
        role: "member",
      },
    ])
  }

  const handleRemoveTeamMember = (userId: string) => {
    if (teamMembers.find((m) => m.userId === userId)?.role === "leader") {
      toast.error("لا يمكن إزالة قائد الفريق")
      return
    }
    setTeamMembers(teamMembers.filter((m) => m.userId !== userId))
  }

  const handleSaveTeamFormation = async () => {
    if (!selectedProject || teamMembers.length < 2) {
      toast.error("يجب أن يحتوي الفريق على عضوين على الأقل")
      return
    }

    try {
      setIsSavingTeam(true)
      const db = getFirebaseDb()

      const teamMembersData = teamMembers.map((member) => ({
        userId: member.userId,
        name: member.name,
        email: member.email,
        studentId: member.studentId,
        role: member.role,
        approved: member.role === "leader",
        approvedAt: member.role === "leader" ? Timestamp.now() : null,
      }))

      await updateDoc(doc(db, "projectIdeas", selectedProject.id), {
        teamMembers: teamMembersData,
        teamStatus: "pending_approval",
        isTeamProject: true,
        status: "pending_team_approval",
      })

      const { createBatchNotifications } = await import("@/lib/utils/notification-helper")

      const memberNotifications = teamMembersData
        .filter((member) => member.role !== "leader")
        .map((member) => ({
          userId: member.userId,
          title: "دعوة للانضمام إلى مشروع",
          message: `تمت دعوتك للانضمام إلى مشروع "${selectedProject.title}" من قبل المنسق. يرجى مراجعة الدعوة والموافقة عليها.`,
          type: "info" as const,
          link: "/student/project/team-approval",
          priority: "high" as const,
          category: "project" as const,
        }))

      if (memberNotifications.length > 0) {
        await createBatchNotifications(memberNotifications)
      }

      toast.success("تم تكوين الفريق بنجاح! تم إرسال إشعارات لجميع الأعضاء.")
      setIsTeamFormationDialogOpen(false)
      setSelectedProject(null)
      setTeamMembers([])
      fetchProjects()
    } catch (error) {
      console.error("Error saving team formation:", error)
      toast.error("حدث خطأ أثناء حفظ الفريق")
    } finally {
      setIsSavingTeam(false)
    }
  }

  const handleApproveClick = (project: any) => {
    setSelectedProject(project)
    setNewProject({
      supervisorIds: [],
      startDate: "",
      endDate: "",
    })
    setIsCreateProjectDialogOpen(true)
  }

  const handleCreateProject = async () => {
    if (!selectedProject || newProject.supervisorIds.length === 0 || !newProject.startDate) {
      toast.error("يرجى ملء جميع الحقول المطلوبة (على الأقل مشرف واحد)")
      return
    }

    if (!selectedProject.teamMembers || selectedProject.teamMembers.length < 2) {
      toast.error("يجب تكوين فريق للمشروع أولاً (عضوين على الأقل)")
      return
    }

    const allApproved = selectedProject.teamMembers?.every((member: any) => member.approved)
    if (!allApproved) {
      toast.error("لا يمكن قبول المشروع حتى يوافق جميع أعضاء الفريق")
      return
    }

    try {
      setIsApproving(true)
      const db = getFirebaseDb()

      await updateDoc(doc(db, "projectIdeas", selectedProject.id), {
        status: "approved",
        approvedAt: serverTimestamp(),
        approvedBy: userData?.uid,
      })

      const selectedSupervisors = supervisors.filter((s) => newProject.supervisorIds.includes(s.id))
      const primarySupervisor = selectedSupervisors[0]

      const projectData: any = {
        title: selectedProject.title || "مشروع بدون عنوان",
        description: selectedProject.description || "",
        supervisorId: primarySupervisor?.id || "",
        supervisorName: primarySupervisor?.name || "",
        supervisorIds: newProject.supervisorIds || [],
        supervisors: selectedSupervisors.map((sup, index) => ({
          userId: sup.id || "",
          name: sup.name || "",
          email: sup.email || "",
          role: index === 0 ? "primary" : "secondary",
          assignedAt: Timestamp.now(),
        })),
        studentId: selectedProject.studentId || "",
        studentName: selectedProject.studentName || "",
        isTeamProject: true,
        studentIds: selectedProject.teamMembers?.map((m: any) => m.userId).filter(Boolean) || [],
        teamMembers: (selectedProject.teamMembers || []).map((m: any) => ({
          userId: m.userId || "",
          name: m.name || "",
          email: m.email || "",
          studentId: m.studentId || "",
          role: m.role || "member",
          approved: m.approved || false,
          approvedAt: m.approvedAt || null,
        })),

        // ✅ keep whatever is stored, we will display it correctly
        department: selectedProject.department || "",

        status: "active",
        progress: 0,
        createdAt: Timestamp.now(),
        startDate: Timestamp.fromDate(new Date(newProject.startDate)),
      }

      if (newProject.endDate) {
        projectData.endDate = Timestamp.fromDate(new Date(newProject.endDate))
      }

      const projectRef = await addDoc(collection(db, "projects"), projectData)

      for (const member of selectedProject.teamMembers) {
        if (member.userId) {
          await updateDoc(doc(db, "users", member.userId), {
            supervisorId: primarySupervisor.id,
            projectId: projectRef.id,
          })
        }
      }

      await updateDoc(doc(db, "projectIdeas", selectedProject.id), {
        supervisorId: primarySupervisor.id,
        supervisorIds: newProject.supervisorIds,
        projectId: projectRef.id,
      })

      for (const member of selectedProject.teamMembers) {
        if (member.userId) {
          await notifyProjectApproved(
            member.userId,
            selectedProject.title,
            selectedSupervisors.map((s) => s.name).join(", "),
          )
        }
      }

      toast.success("تم قبول المشروع وإنشائه بنجاح!")
      setIsCreateProjectDialogOpen(false)
      setSelectedProject(null)
      setNewProject({
        supervisorIds: [],
        startDate: "",
        endDate: "",
      })
      fetchProjects()
    } catch (error) {
      console.error("Error creating project:", error)
      toast.error("حدث خطأ أثناء إنشاء المشروع")
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!selectedProject || !rejectionReason.trim()) {
      toast.error("يرجى إدخال سبب الرفض")
      return
    }

    try {
      setIsRejecting(true)
      const db = getFirebaseDb()

      await updateDoc(doc(db, "projectIdeas", selectedProject.id), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
        rejectedBy: userData?.uid,
        rejectionReason: rejectionReason,
      })

      await notifyProjectRejected(selectedProject.studentId, selectedProject.title, rejectionReason)

      toast.success("تم رفض فكرة المشروع")
      setIsRejectDialogOpen(false)
      setSelectedProject(null)
      setRejectionReason("")
      fetchProjects()
    } catch (error) {
      console.error("Error rejecting project:", error)
      toast.error("حدث خطأ أثناء رفض المشروع")
    } finally {
      setIsRejecting(false)
    }
  }

  const pendingProjects = projectIdeas.filter((project) => project.status === "pending")
  const approvedProjects = projectIdeas.filter((project) => project.status === "approved")
  const rejectedProjects = projectIdeas.filter((project) => project.status === "rejected")

  const ProjectCard = ({ project }: { project: any }) => (
    <Card className="rounded-xl hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              {project.title || "فكرة بدون عنوان"}
              <Badge variant="secondary" className="rounded-lg">
                <UsersIcon className="w-3 h-3 mr-1" />
                مشروع جماعي
              </Badge>
            </CardTitle>
            <CardDescription className="mt-2 line-clamp-2">{project.description || "لا يوجد وصف"}</CardDescription>
          </div>
          <Badge
            variant={
              project.status === "pending" ? "outline" : project.status === "approved" ? "default" : "destructive"
            }
            className="rounded-lg"
          >
            {project.status === "pending" ? "قيد المراجعة" : project.status === "approved" ? "مقبول" : "مرفوض"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm">
          <div className="space-y-2">
            <span className="text-muted-foreground font-medium">حالة الفريق:</span>
            {project.teamStatus === "pending_formation" ? (
              <Badge variant="outline" className="text-xs">
                في انتظار تكوين الفريق
              </Badge>
            ) : project.teamMembers && project.teamMembers.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-1">
                  {project.teamMembers.map((member: any, index: number) => (
                    <Badge key={index} variant={member.approved ? "default" : "secondary"} className="text-xs">
                      {member.name || member.fullName || "عضو"}
                      {member.role === "leader" && " (قائد)"}
                      {!member.approved && " (لم يوافق)"}
                    </Badge>
                  ))}
                </div>
                {!project.teamMembers.every((m: any) => m.approved) && (
                  <div className="flex items-center gap-2 text-amber-600 text-xs">
                    <AlertCircle className="w-3 h-3" />
                    <span>في انتظار موافقة بعض الأعضاء</span>
                  </div>
                )}
              </>
            ) : (
              <Badge variant="outline" className="text-xs">
                لم يتم تكوين فريق
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">مقدم الفكرة:</span>
            <span className="font-medium">{project.studentName || "غير معين"}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">القسم:</span>
            <span className="font-medium">{getDepartmentName(project.department)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">خيار المشروع:</span>
            <span className="font-medium">
              {project.type === "one-course" ? "كورس واحد" : project.projectType || "كورسين"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">تاريخ التقديم:</span>
            <span className="font-medium">
              {project.submittedAt
                ? new Date(project.submittedAt.seconds * 1000).toLocaleDateString("ar-EG")
                : "غير معين"}
            </span>
          </div>
        </div>

        {project.status === "pending" && (
          <div className="flex gap-2 pt-4 border-t flex-wrap">
            {project.teamStatus === "pending_formation" && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-lg bg-transparent"
                onClick={() => handleTeamFormationClick(project)}
              >
                <UserPlus className="w-4 h-4 ml-2" />
                تكوين الفريق
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-transparent rounded-lg"
              onClick={() => {
                setSelectedProject(project)
                setIsViewDialogOpen(true)
              }}
            >
              <Eye className="w-4 h-4 ml-2" />
              عرض التفاصيل
            </Button>

            <Button
              size="sm"
              onClick={() => handleApproveClick(project)}
              className="flex-1 rounded-lg"
              disabled={isApproving || project.teamStatus === "pending_formation"}
            >
              <CheckCircle2 className="w-4 h-4 ml-2" />
              قبول
            </Button>

            <Button
              variant="destructive"
              size="sm"
              className="flex-1 rounded-lg"
              onClick={() => {
                setSelectedProject(project)
                setIsRejectDialogOpen(true)
              }}
            >
              <XCircle className="w-4 h-4 ml-2" />
              رفض
            </Button>
          </div>
        )}

        {project.status === "rejected" && project.rejectionReason && (
          <div className="pt-4 border-t">
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">سبب الرفض:</p>
                <p className="text-sm text-muted-foreground mt-1">{project.rejectionReason}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <DashboardLayout sidebarItems={coordinatorSidebarItems} requiredRole="coordinator">
      <div className="p-8 space-y-8 animate-in fade-in duration-500">
        <div className="animate-in slide-in-from-top duration-700">
          <h1 className="text-4xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
            قبول ورفض أفكار المشاريع
          </h1>
          <p className="text-muted-foreground mt-2">مراجعة أفكار المشاريع المقترحة من الطلاب واتخاذ القرار المناسب</p>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-2 border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50/50 to-background dark:from-amber-950/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    قيد المراجعة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-amber-600 dark:text-amber-400">{pendingProjects.length}</div>
                  <p className="text-sm text-muted-foreground mt-1">فكرة بانتظار القرار</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-200 dark:border-green-900 bg-gradient-to-br from-green-50/50 to-background dark:from-green-950/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    المقبولة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-green-600 dark:text-green-400">{approvedProjects.length}</div>
                  <p className="text-sm text-muted-foreground mt-1">فكرة تم قبولها</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-red-200 dark:border-red-900 bg-gradient-to-br from-red-50/50 to-background dark:from-red-950/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    المرفوضة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-red-600 dark:text-red-400">{rejectedProjects.length}</div>
                  <p className="text-sm text-muted-foreground mt-1">فكرة تم رفضها</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending" className="gap-2">
                  <AlertCircle className="w-4 h-4" />
                  قيد المراجعة ({pendingProjects.length})
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  المقبولة ({approvedProjects.length})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-2">
                  <XCircle className="w-4 h-4" />
                  المرفوضة ({rejectedProjects.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-6">
                {pendingProjects.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <Lightbulb className="w-16 h-16 text-muted-foreground/50 mb-4" />
                      <h3 className="text-xl font-semibold mb-2">لا توجد أفكار قيد المراجعة</h3>
                      <p className="text-sm text-muted-foreground">جميع أفكار المشاريع تم مراجعتها</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {pendingProjects.map((project, index) => (
                      <div
                        key={project.id}
                        className="animate-in fade-in slide-in-from-bottom duration-500"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <ProjectCard project={project} />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="approved" className="mt-6">
                {approvedProjects.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <CheckCircle2 className="w-16 h-16 text-muted-foreground/50 mb-4" />
                      <h3 className="text-xl font-semibold mb-2">لا توجد أفكار مقبولة</h3>
                      <p className="text-sm text-muted-foreground">لم يتم قبول أي فكرة بعد</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {approvedProjects.map((project, index) => (
                      <div
                        key={project.id}
                        className="animate-in fade-in slide-in-from-bottom duration-500"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <ProjectCard project={project} />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rejected" className="mt-6">
                {rejectedProjects.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <XCircle className="w-16 h-16 text-muted-foreground/50 mb-4" />
                      <h3 className="text-xl font-semibold mb-2">لا توجد أفكار مرفوضة</h3>
                      <p className="text-sm text-muted-foreground">لم يتم رفض أي فكرة</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {rejectedProjects.map((project, index) => (
                      <div
                        key={project.id}
                        className="animate-in fade-in slide-in-from-bottom duration-500"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <ProjectCard project={project} />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl rounded-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-amber-500" />
              {selectedProject?.title}
            </DialogTitle>
            <DialogDescription>تفاصيل فكرة المشروع المقترحة</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2 text-lg">الوصف:</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{selectedProject?.description}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">الطالب</p>
                <p className="font-semibold">{selectedProject?.studentName || "غير معين"}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedProject?.studentEmail}</p>
              </div>

              {/* ✅ FIXED HERE TOO */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">القسم</p>
                <p className="font-semibold">{getDepartmentName(selectedProject?.department)}</p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              onClick={() => {
                setIsViewDialogOpen(false)
                handleApproveClick(selectedProject)
              }}
              className="flex-1 rounded-lg"
              disabled={isApproving}
            >
              {isApproving ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 ml-2" />
              )}
              قبول الفكرة
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsViewDialogOpen(false)
                setIsRejectDialogOpen(true)
              }}
              className="flex-1 rounded-lg"
            >
              <XCircle className="w-4 h-4 ml-2" />
              رفض الفكرة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isCreateProjectDialogOpen} onOpenChange={setIsCreateProjectDialogOpen}>
        <DialogContent className="max-w-2xl rounded-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">قبول المشروع وتعيين المشرفين</DialogTitle>
            <DialogDescription>
              اختر المشرفين وحدد تواريخ المشروع
              {selectedProject?.isTeamProject && " (مشروع جماعي)"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">{selectedProject?.title}</h3>
              {selectedProject?.isTeamProject && (
                <div className="space-y-2 mt-3">
                  <p className="text-sm text-muted-foreground">أعضاء الفريق:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject?.teamMembers?.map((member: any, index: number) => (
                      <Badge key={index} variant={member.approved ? "default" : "secondary"}>
                        {member.name || member.email}
                        {member.role === "leader" && " (قائد)"}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label>المشرفون * (يمكن اختيار أكثر من مشرف)</Label>
              <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                {supervisors.map((supervisor) => (
                  <div key={supervisor.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded">
                    <Checkbox
                      id={supervisor.id}
                      checked={newProject.supervisorIds.includes(supervisor.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewProject({
                            ...newProject,
                            supervisorIds: [...newProject.supervisorIds, supervisor.id],
                          })
                        } else {
                          setNewProject({
                            ...newProject,
                            supervisorIds: newProject.supervisorIds.filter((id) => id !== supervisor.id),
                          })
                        }
                      }}
                    />
                    <label htmlFor={supervisor.id} className="flex-1 cursor-pointer">
                      <p className="font-medium">{supervisor.name}</p>
                      <p className="text-xs text-muted-foreground">{supervisor.email}</p>
                    </label>
                    {newProject.supervisorIds.indexOf(supervisor.id) === 0 && (
                      <Badge variant="default" className="text-xs">
                        مشرف رئيسي
                      </Badge>
                    )}
                    {newProject.supervisorIds.indexOf(supervisor.id) > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        مشرف ثانوي
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">المشرف الأول سيكون المشرف الرئيسي، والبقية مشرفون ثانويون</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">تاريخ البداية *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newProject.startDate}
                  onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                  className="rounded-lg"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">تاريخ النهاية (اختياري)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={newProject.endDate}
                  onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                  className="rounded-lg"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateProjectDialogOpen(false)}
              disabled={isApproving}
              className="rounded-lg"
            >
              إلغاء
            </Button>
            <Button onClick={handleCreateProject} disabled={isApproving} className="rounded-lg">
              {isApproving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  جاري القبول...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  قبول وإنشاء المشروع
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              رفض فكرة المشروع
            </DialogTitle>
            <DialogDescription>يرجى توضيح سبب رفض فكرة المشروع</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">المشروع</p>
              <p className="font-semibold">{selectedProject?.title}</p>
              <p className="text-sm text-muted-foreground mt-1">الطالب: {selectedProject?.studentName}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">سبب الرفض *</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="rounded-lg"
                placeholder="اكتب سبب رفض فكرة المشروع..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)} className="rounded-lg">
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleReject} className="rounded-lg" disabled={isRejecting}>
              {isRejecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 ml-2" />}
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTeamFormationDialogOpen} onOpenChange={setIsTeamFormationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              تكوين فريق المشروع
            </DialogTitle>
            <DialogDescription>
              أضف الطلاب الذين سيعملون على هذا المشروع. يجب أن يوافق جميع الأعضاء على المشاركة.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>عنوان المشروع</Label>
              <p className="text-sm font-medium mt-1">{selectedProject?.title}</p>
            </div>

            <div className="space-y-2">
              <Label>أعضاء الفريق الحاليين</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[60px]">
                {teamMembers.map((member, index) => (
                  <Badge key={index} variant={member.role === "leader" ? "default" : "secondary"} className="gap-2">
                    {member.name} {member.role === "leader" && "(قائد)"}
                    {member.role !== "leader" && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTeamMember(member.userId)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>إضافة طالب للفريق</Label>
              <Select onValueChange={handleAddTeamMember}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر طالباً" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const availableStudents = students.filter((s) => {
                      const notInTeam = !teamMembers.some((m) => m.userId === s.id)
                      return notInTeam && s.name
                    })

                    if (availableStudents.length === 0) {
                      return (
                        <SelectItem value="none" disabled>
                          لا توجد طلاب متاحين
                        </SelectItem>
                      )
                    }

                    return availableStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.email})
                      </SelectItem>
                    ))
                  })()}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTeamFormationDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveTeamFormation} disabled={isSavingTeam || teamMembers.length < 2}>
              {isSavingTeam ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                  حفظ الفريق
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
