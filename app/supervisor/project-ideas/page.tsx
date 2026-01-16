"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { supervisorSidebarItems } from "@/lib/constants/supervisor-sidebar"
import { Lightbulb, Eye, AlertCircle, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useEffect, useMemo, useState } from "react"
import { collection, getDocs, query, where, addDoc, Timestamp, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/contexts/auth-context"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function SupervisorProjectIdeas() {
  const [allMyIdeas, setAllMyIdeas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { userData } = useAuth()

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    objectives: "",
    technologies: "",
    projectType: "",
    department: "",
  })

  const [departments, setDepartments] = useState<any[]>([])

  const fetchDepartments = async () => {
    try {
      const departmentsQuery = query(collection(db, "departments"))
      const departmentsSnapshot = await getDocs(departmentsQuery)
      const departmentsData = departmentsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setDepartments(departmentsData)
    } catch (error) {
      console.error("Error fetching departments:", error)
      toast.error("حدث خطأ في تحميل الأقسام")
    }
  }

  // ✅ مهم: جيب كل أفكار المشرف (بدون فلترة status)
  const fetchProjectIdeas = async () => {
    if (!userData?.uid) return
    try {
      setLoading(true)

      const ideasQuery = query(
        collection(db, "projectIdeas"),
        where("proposedBySupervisor", "==", userData.uid),
        orderBy("submittedAt", "desc"),
      )

      const ideasSnapshot = await getDocs(ideasQuery)
      const ideasData = ideasSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      setAllMyIdeas(ideasData)
    } catch (error) {
      console.error("Error fetching project ideas:", error)
      toast.error("حدث خطأ في تحميل أفكار المشاريع")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userData?.uid) {
      fetchProjectIdeas()
      fetchDepartments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.uid])

  const handleSubmitIdea = async () => {
    if (
      !formData.title ||
      !formData.description ||
      !formData.objectives ||
      !formData.technologies ||
      !formData.projectType ||
      !formData.department
    ) {
      toast.error("يرجى ملء جميع الحقول المطلوبة")
      return
    }

    try {
      setIsSubmitting(true)

      const objectivesArray = formData.objectives.split("\n").filter((obj) => obj.trim())
      const technologiesArray = formData.technologies
        .split(",")
        .map((tech) => tech.trim())
        .filter((tech) => tech)

      await addDoc(collection(db, "projectIdeas"), {
        title: formData.title,
        description: formData.description,
        objectives: objectivesArray,
        technologies: technologiesArray,
        projectType: formData.projectType,
        department: formData.department,

        proposedBySupervisor: userData?.uid,
        supervisorId: userData?.uid, // ✅ خله موجود للتوافق مع الكود القديم
        supervisorName: userData?.name,
        supervisorEmail: userData?.email,

        status: "available",
        submittedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })

      toast.success("تم طرح فكرة المشروع بنجاح!")
      setIsAddDialogOpen(false)
      setFormData({
        title: "",
        description: "",
        objectives: "",
        technologies: "",
        projectType: "",
        department: "",
      })

      await fetchProjectIdeas()
    } catch (error) {
      console.error("Error submitting project idea:", error)
      toast.error("حدث خطأ أثناء طرح فكرة المشروع")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ✅ تقسيم الأفكار حسب الحالة
  const stats = useMemo(() => {
    const total = allMyIdeas.length
    const available = allMyIdeas.filter((i) => i.status === "available").length
    const taken = allMyIdeas.filter((i) => i.status === "taken").length
    const approved = allMyIdeas.filter((i) => i.status === "approved").length
    const pending = allMyIdeas.filter((i) => i.status === "pending").length
    const rejected = allMyIdeas.filter((i) => i.status === "rejected").length
    return { total, available, taken, approved, pending, rejected }
  }, [allMyIdeas])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return { variant: "outline" as const, label: "قيد المراجعة" }
      case "approved":
        return { variant: "default" as const, label: "مقبول" }
      case "available":
        return { variant: "secondary" as const, label: "متاح للطلاب" }
      case "taken":
        return { variant: "destructive" as const, label: "مأخوذة" }
      case "rejected":
      default:
        return { variant: "destructive" as const, label: "مرفوض" }
    }
  }

  const getTakenInfo = (project: any) => {
    // ✅ دعم الشكل الجديد
    if (project.takenById || project.takenByName || project.takenByEmail) {
      return {
        name: project.takenByName || "غير معروف",
        email: project.takenByEmail || "",
        at: project.takenAt?.toDate?.() ? project.takenAt.toDate() : null,
      }
    }

    // ✅ دعم الشكل القديم (selectedBy array)
    if (Array.isArray(project.selectedBy) && project.selectedBy.length > 0) {
      const first = project.selectedBy[0]
      return {
        name: first.studentName || "غير معروف",
        email: first.studentEmail || "",
        at: first.selectedAt?.toDate?.() ? first.selectedAt.toDate() : null,
      }
    }

    // ✅ دعم حقول قديمة جدا لو موجودة
    if (project.studentName || project.studentEmail) {
      return {
        name: project.studentName || "غير معروف",
        email: project.studentEmail || "",
        at: null,
      }
    }

    return null
  }

  const formatDate = (ts: any) => {
    try {
      if (!ts) return "غير محدد"
      const d = ts?.toDate?.() ? ts.toDate() : new Date(ts)
      return d.toLocaleDateString("ar-EG")
    } catch {
      return "غير محدد"
    }
  }

  const ProjectCard = ({ project }: { project: any }) => {
    const badge = getStatusBadge(project.status)
    const takenInfo = getTakenInfo(project)

    return (
      <Card className="rounded-xl hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <span className="truncate">{project.title}</span>
              </CardTitle>
              <CardDescription className="mt-2 line-clamp-2">{project.description}</CardDescription>
            </div>

            <Badge variant={badge.variant} className="rounded-lg shrink-0">
              {badge.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">القسم:</span>
              <span className="font-medium">
                {departments.find((dep) => dep.id === project.department)?.name || "غير محدد"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">خيار المشروع:</span>
              <span className="font-medium">{project.projectType === "one-course" ? "كورس واحد" : "كورسين"}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">تاريخ الطرح:</span>
              <span className="font-medium">{formatDate(project.submittedAt)}</span>
            </div>

            {/* ✅ إذا مأخوذة: اعرض الطالب بشكل مرتب */}
            {project.status === "taken" && takenInfo && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">تم أخذها بواسطة:</span>
                  <span className="font-medium">{takenInfo.name}</span>
                </div>
                {takenInfo.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">البريد:</span>
                    <span className="font-medium text-xs">{takenInfo.email}</span>
                  </div>
                )}
                {takenInfo.at && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">تاريخ الاختيار:</span>
                    <span className="font-medium">{takenInfo.at.toLocaleDateString("ar-EG")}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t">
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
          </div>

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
  }

  return (
    <DashboardLayout sidebarItems={supervisorSidebarItems} requiredRole="supervisor">
      <div className="p-8 space-y-8 animate-in fade-in duration-500">
        <div className="animate-in slide-in-from-top duration-700 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
              أفكار المشاريع
            </h1>
            <p className="text-muted-foreground mt-2">عرض أفكارك ومتابعة حالة اختيار الطلاب</p>
          </div>

          <Button onClick={() => setIsAddDialogOpen(true)} className="rounded-lg">
            <Plus className="w-4 h-4 ml-2" />
            طرح فكرة جديدة
          </Button>
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
            {/* ✅ Stats */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-2 border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    كل الأفكار
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
                  <p className="text-sm text-muted-foreground mt-1">فكرة</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-200 dark:border-green-900 bg-gradient-to-br from-green-50/50 to-background dark:from-green-950/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Lightbulb className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    المتاحة للطلاب
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-green-600 dark:text-green-400">{stats.available}</div>
                  <p className="text-sm text-muted-foreground mt-1">فكرة</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-orange-200 dark:border-orange-900 bg-gradient-to-br from-orange-50/50 to-background dark:from-orange-950/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <Lightbulb className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    المأخوذة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-orange-600 dark:text-orange-400">{stats.taken}</div>
                  <p className="text-sm text-muted-foreground mt-1">فكرة</p>
                </CardContent>
              </Card>
            </div>

            {/* ✅ List */}
            {allMyIdeas.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Lightbulb className="w-16 h-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">لا توجد أفكار بعد</h3>
                  <p className="text-sm text-muted-foreground">قم بطرح فكرة جديدة</p>
                </CardContent>
              </Card>
            ) : (
              <div>
                <h2 className="text-2xl font-bold mb-4">أفكاري</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {allMyIdeas.map((project, index) => (
                    <div
                      key={project.id}
                      className="animate-in fade-in slide-in-from-bottom duration-500"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <ProjectCard project={project} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl rounded-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-amber-500" />
              طرح فكرة مشروع جديدة
            </DialogTitle>
            <DialogDescription>اطرح فكرة مشروع جديدة ليختارها الطلاب</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">عنوان المشروع *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="rounded-lg"
                placeholder="مثال: نظام إدارة المكتبات"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">وصف المشروع *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                className="rounded-lg"
                placeholder="وصف تفصيلي لفكرة المشروع..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objectives">أهداف المشروع *</Label>
              <Textarea
                id="objectives"
                value={formData.objectives}
                onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                rows={4}
                className="rounded-lg"
                placeholder="اكتب كل هدف في سطر منفصل"
              />
              <p className="text-xs text-muted-foreground">اكتب كل هدف في سطر منفصل</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="technologies">التقنيات المستخدمة *</Label>
              <Input
                id="technologies"
                value={formData.technologies}
                onChange={(e) => setFormData({ ...formData, technologies: e.target.value })}
                className="rounded-lg"
                placeholder="مثال: React, Node.js, MongoDB"
              />
              <p className="text-xs text-muted-foreground">افصل بين التقنيات بفاصلة</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectType">خيار المشروع *</Label>
                <Select value={formData.projectType} onValueChange={(v) => setFormData({ ...formData, projectType: v })}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="اختر خيار المشروع" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="one-course">كورس واحد</SelectItem>
                    <SelectItem value="two-courses">كورسين</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">القسم *</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="اكتب اسم القسم"
                  className="rounded-lg"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-lg">
              إلغاء
            </Button>
            <Button onClick={handleSubmitIdea} disabled={isSubmitting} className="rounded-lg">
              {isSubmitting ? "جاري الإضافة..." : "طرح الفكرة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl rounded-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-amber-500" />
              {selectedProject?.title}
            </DialogTitle>
            <DialogDescription>تفاصيل فكرة المشروع</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2 text-lg">الوصف:</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{selectedProject?.description}</p>
            </div>

            {selectedProject?.objectives && selectedProject.objectives.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-lg">الأهداف:</h4>
                <ul className="space-y-2">
                  {selectedProject.objectives.map((objective: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-sm text-muted-foreground">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedProject?.technologies && selectedProject.technologies.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-lg">التقنيات المستخدمة:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.technologies.map((tech: string, index: number) => (
                    <Badge key={index} variant="secondary" className="rounded-lg">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">القسم</p>
                <p className="font-semibold">
                  {departments.find((dep) => dep.id === selectedProject?.department)?.name || "غير محدد"}
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">خيار المشروع</p>
                <p className="font-semibold">{selectedProject?.projectType === "one-course" ? "كورس واحد" : "كورسين"}</p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">تاريخ الطرح</p>
                <p className="font-semibold">{formatDate(selectedProject?.submittedAt)}</p>
              </div>

              {selectedProject?.status === "taken" && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">تم أخذها بواسطة</p>
                  <p className="font-semibold">{selectedProject?.takenByName || "غير محدد"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedProject?.takenByEmail}</p>
                </div>
              )}
            </div>

            {selectedProject?.status === "rejected" && selectedProject.rejectionReason && (
              <div className="p-4 bg-destructive/10 rounded-lg border-2 border-destructive/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive mb-2">سبب الرفض:</p>
                    <p className="text-sm text-muted-foreground">{selectedProject.rejectionReason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
