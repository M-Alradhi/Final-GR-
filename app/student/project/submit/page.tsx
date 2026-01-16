"use client"

import type React from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAuth } from "@/lib/contexts/auth-context"
import { useState, useEffect } from "react"
import { collection, addDoc, Timestamp, query, where, getDocs } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase/config"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { studentSidebarItems } from "@/lib/constants/student-sidebar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Info, Plus, Trash2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

type Department = { id: string; code: string; nameAr: string; nameEn: string }

type StudentInfo = {
  fullName: string
  studentId: string
  gpa: string
  email: string
  phone: string

  // ✅ قسم الطالب (Select)
  departmentId: string
  departmentCode: string
  departmentNameAr: string
  departmentNameEn: string

  // للتوافق (اختياري)
  department: string
}

export default function SubmitProjectIdea() {
  const { userData } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [canSubmit, setCanSubmit] = useState(false)

  // ✅ Departments
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("")

  const [formData, setFormData] = useState({
    // Basic Information
    department: "", // نخليه code للتوافق
    program: "",
    academicYear: "",
    semester: "",
    title: "",
    projectType: "",

    // Supervisor Information
    supervisorName: "",
    supervisorEmail: "",
    coSupervisorName: "",
    coSupervisorEmail: "",

    // Student Information
    students: [
      {
        fullName: userData?.name || "",
        studentId: userData?.studentId || "",
        gpa: "",
        email: userData?.email || "",
        phone: "",

        departmentId: "",
        departmentCode: "",
        departmentNameAr: "",
        departmentNameEn: "",
        department: "",
      },
      {
        fullName: "",
        studentId: "",
        gpa: "",
        email: "",
        phone: "",

        departmentId: "",
        departmentCode: "",
        departmentNameAr: "",
        departmentNameEn: "",
        department: "",
      },
    ] as StudentInfo[],

    sameDepartment: "yes",

    // Project Details
    problemStatement: "",
    objectives: "",
    significance: "",
    literatureReview: "",
    references: "",

    // Timeline
    timeline: {
      requirementCollection: "",
      literatureReview: "",
      design: "",
      implementation: "",
      testingAndResults: "",
      reportWriting: "",
      presentation: "",
    },

    // Declaration
    plagiarismDeclaration: false,
  })

  // ✅ Check eligibility
  useEffect(() => {
    const checkSubmissionEligibility = async () => {
      if (!userData?.uid) return
      try {
        const db = getFirebaseDb()
        const ideasQuery = query(collection(db, "projectIdeas"), where("studentId", "==", userData.uid))
        const ideasSnapshot = await getDocs(ideasQuery)
        const ideas = ideasSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

        const hasActiveIdea = ideas.some(
          (idea: any) =>
            idea.status === "pending_team_approval" || idea.status === "pending" || idea.status === "approved",
        )

        if (hasActiveIdea) {
          setCanSubmit(false)
          toast.error("لديك فكرة مشروع قيد المراجعة أو تمت الموافقة عليها")
        } else {
          setCanSubmit(true)
        }
      } catch (error) {
        console.error("Error checking eligibility:", error)
        toast.error("حدث خطأ أثناء التحقق من إمكانية التقديم")
      } finally {
        setChecking(false)
      }
    }

    checkSubmissionEligibility()
  }, [userData, router])

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const db = getFirebaseDb()
        const departmentsQuery = query(collection(db, "departments"), where("isActive", "==", true))
        const departmentsSnapshot = await getDocs(departmentsQuery)

        const depts: Department[] = departmentsSnapshot.docs.map((d) => {
          const data: any = d.data()
          return {
            id: d.id,
            code: data.code || "",
            nameAr: data.nameAr || "",
            nameEn: data.nameEn || "",
          }
        })

        setDepartments(depts)
      } catch (error) {
        console.error("Error fetching departments:", error)
        toast.error("حدث خطأ أثناء تحميل الأقسام")
      }
    }

    fetchDepartments()
  }, [])

  const addStudent = () => {
    setFormData({
      ...formData,
      students: [
        ...formData.students,
        {
          fullName: "",
          studentId: "",
          gpa: "",
          email: "",
          phone: "",
          departmentId: "",
          departmentCode: "",
          departmentNameAr: "",
          departmentNameEn: "",
          department: "",
        },
      ],
    })
  }

  const removeStudent = (index: number) => {
    if (formData.students.length <= 2) {
      toast.error("يجب أن يكون هناك طالبين على الأقل")
      return
    }
    const newStudents = formData.students.filter((_, i) => i !== index)
    setFormData({ ...formData, students: newStudents })
  }

  const updateStudent = (index: number, field: keyof StudentInfo, value: string) => {
    const newStudents = [...formData.students]

    if (field === "gpa") {
      const gpaValue = Number.parseFloat(value)
      if (gpaValue > 4) {
        toast.error("المعدل التراكمي يجب أن لا يزيد عن 4.00")
        return
      }
    }

    newStudents[index] = { ...newStudents[index], [field]: value }
    setFormData({ ...formData, students: newStudents })
  }

  const setStudentDepartment = (index: number, deptId: string) => {
    const dept = departments.find((d) => d.id === deptId)
    if (!dept) return

    const newStudents = [...formData.students]
    newStudents[index] = {
      ...newStudents[index],
      departmentId: dept.id,
      departmentCode: dept.code,
      departmentNameAr: dept.nameAr,
      departmentNameEn: dept.nameEn,
      department: dept.code,
    }
    setFormData({ ...formData, students: newStudents })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userData || !canSubmit) return

    if (!selectedDepartmentId) {
      toast.error("يرجى اختيار قسم المشروع")
      return
    }
    const selectedDept = departments.find((d) => d.id === selectedDepartmentId)
    if (!selectedDept) {
      toast.error("قسم المشروع غير صحيح")
      return
    }

    if (formData.students.length < 2) {
      toast.error("يجب أن يكون هناك طالبين على الأقل في المشروع")
      return
    }

    for (let i = 0; i < formData.students.length; i++) {
      const student = formData.students[i]
      if (!student.fullName || !student.studentId || !student.email) {
        toast.error(`يرجى إكمال معلومات الطالب ${i + 1}`)
        return
      }
      if (!student.departmentId) {
        toast.error(`يرجى اختيار قسم الطالب ${i + 1}`)
        return
      }
    }

    if (!formData.plagiarismDeclaration) {
      toast.error("يجب الموافقة على إقرار الأصالة")
      return
    }

    setLoading(true)
    try {
      const db = getFirebaseDb()

      const studentsEmails = formData.students.map((s) => s.email.toLowerCase())
      const studentsIds = formData.students.map((s) => s.studentId.toLowerCase())

      // 1. التحقق من projectIdeas
      const existingIdeasQuery = query(
        collection(db, "projectIdeas"),
        where("status", "in", ["pending", "pending_team_approval", "approved"]),
      )
      const existingIdeasSnapshot = await getDocs(existingIdeasQuery)

      for (const ideaDoc of existingIdeasSnapshot.docs) {
        const ideaData = ideaDoc.data()

        // تجاهل الفكرة الحالية للمستخدم
        if (ideaData.studentId === userData.uid) continue

        const ideaTeamMembers = ideaData.teamMembers || []
        const ideaStudents = ideaData.students || []

        // تحقق من teamMembers
        for (const member of ideaTeamMembers) {
          const memberEmail = (member.email || "").toLowerCase()
          const memberStudentId = (member.studentId || "").toLowerCase()

          if (studentsEmails.includes(memberEmail) || studentsIds.includes(memberStudentId)) {
            const studentName =
              formData.students.find(
                (s) => s.email.toLowerCase() === memberEmail || s.studentId.toLowerCase() === memberStudentId,
              )?.fullName || memberEmail
            toast.error(
              `لا يمكن تقديم الفكرة: الطالب "${studentName}" موجود بالفعل في مشروع آخر قيد المراجعة أو تمت الموافقة عليه`,
            )
            setLoading(false)
            return
          }
        }

        // تحقق من students array
        for (const student of ideaStudents) {
          const studentEmail = (student.email || "").toLowerCase()
          const studentIdNum = (student.studentId || "").toLowerCase()

          if (studentsEmails.includes(studentEmail) || studentsIds.includes(studentIdNum)) {
            const studentName =
              formData.students.find(
                (s) => s.email.toLowerCase() === studentEmail || s.studentId.toLowerCase() === studentIdNum,
              )?.fullName || studentEmail
            toast.error(
              `لا يمكن تقديم الفكرة: الطالب "${studentName}" موجود بالفعل في مشروع آخر قيد المراجعة أو تمت الموافقة عليه`,
            )
            setLoading(false)
            return
          }
        }
      }

      // 2. التحقق من المشاريع النشطة
      const projectsQuery = query(collection(db, "projects"), where("status", "in", ["active", "pending"]))
      const projectsSnapshot = await getDocs(projectsQuery)

      for (const projectDoc of projectsSnapshot.docs) {
        const projectData = projectDoc.data()
        const projectTeamMembers = projectData.teamMembers || []
        const projectStudentIds = projectData.studentIds || []

        // التحقق من teamMembers في المشاريع
        for (const member of projectTeamMembers) {
          const memberEmail = (member.email || "").toLowerCase()
          if (studentsEmails.includes(memberEmail)) {
            const studentName =
              formData.students.find((s) => s.email.toLowerCase() === memberEmail)?.fullName || memberEmail
            toast.error(`لا يمكن تقديم الفكرة: الطالب "${studentName}" لديه مشروع نشط بالفعل`)
            setLoading(false)
            return
          }
        }
      }

      // 3. التحقق من users الذين لديهم projectId
      const usersQuery = query(collection(db, "users"), where("role", "==", "student"))
      const usersSnapshot = await getDocs(usersQuery)

      for (const userDoc of usersSnapshot.docs) {
        const userData2 = userDoc.data()
        if (userData2.projectId && studentsEmails.includes((userData2.email || "").toLowerCase())) {
          const studentName =
            formData.students.find((s) => s.email.toLowerCase() === (userData2.email || "").toLowerCase())?.fullName ||
            userData2.email
          toast.error(`لا يمكن تقديم الفكرة: الطالب "${studentName}" لديه مشروع نشط بالفعل`)
          setLoading(false)
          return
        }
      }

      const objectivesArray = formData.objectives.split("\n").filter((obj) => obj.trim())

      const teamMembersArray = formData.students.map((student, index) => ({
        fullName: student.fullName,
        studentId: student.studentId,
        gpa: student.gpa,
        email: student.email,
        phone: student.phone,

        departmentId: student.departmentId,
        departmentCode: student.departmentCode,
        departmentNameAr: student.departmentNameAr,
        departmentNameEn: student.departmentNameEn,
        department: student.department,

        role: index === 0 ? "leader" : "member",
        approved: index === 0,
        approvedAt: index === 0 ? Timestamp.now() : null,
      }))

      await addDoc(collection(db, "projectIdeas"), {
        department: selectedDept.code,
        departmentId: selectedDept.id,
        departmentCode: selectedDept.code,
        departmentNameAr: selectedDept.nameAr,
        departmentNameEn: selectedDept.nameEn,

        program: formData.program,
        academicYear: formData.academicYear,
        semester: formData.semester,
        title: formData.title,
        projectType: formData.projectType,

        supervisorName: formData.supervisorName,
        supervisorEmail: formData.supervisorEmail,
        coSupervisorName: formData.coSupervisorName || null,
        coSupervisorEmail: formData.coSupervisorEmail || null,

        students: formData.students,
        teamMembers: teamMembersArray,
        sameDepartment: formData.sameDepartment === "yes",

        problemStatement: formData.problemStatement,
        objectives: objectivesArray,
        significance: formData.significance,
        literatureReview: formData.literatureReview,
        references: formData.references,

        timeline: formData.timeline,
        plagiarismDeclaration: formData.plagiarismDeclaration,

        studentId: userData.uid,
        studentName: userData.name,
        studentEmail: userData.email,
        isTeamProject: true,
        teamStatus: "pending_approval",
        status: "pending_team_approval",
        submittedAt: Timestamp.now(),
      })

      const { notifyCoordinators } = await import("@/lib/utils/notification-helper")
      const { createBatchNotifications } = await import("@/lib/firebase/notifications")

      await notifyCoordinators(
        "فكرة مشروع جديدة",
        `قدم الطالب ${userData.name} فكرة مشروع جديدة: ${formData.title}`,
        "/coordinator/approve-projects",
      )

      const memberNotifications = teamMembersArray
        .filter((member) => member.role !== "leader")
        .map((member) => ({
          userId: member.email,
          title: "دعوة للانضمام إلى مشروع",
          message: `تمت دعوتك للانضمام إلى مشروع "${formData.title}" من قبل ${userData.name}. يرجى مراجعة الدعوة والموافقة عليها.`,
          type: "info" as const,
          link: "/student/project/team-approval",
          priority: "high" as const,
          category: "project" as const,
        }))

      const usersQuery2 = query(collection(db, "users"), where("role", "==", "student"))
      const usersSnapshot2 = await getDocs(usersQuery2)
      const usersByEmail = new Map(usersSnapshot2.docs.map((doc) => [doc.data().email, doc.id]))

      const notificationsWithUserIds = memberNotifications
        .map((notif) => {
          const userId = usersByEmail.get(notif.userId)
          if (userId) return { ...notif, userId }
          return null
        })
        .filter(Boolean) as any[]

      if (notificationsWithUserIds.length > 0) {
        await createBatchNotifications(notificationsWithUserIds)
      }

      toast.success("تم تقديم فكرة المشروع بنجاح! تم إرسال دعوات لأعضاء الفريق.")
      router.push("/student/project")
    } catch (error) {
      console.error("Error submitting project idea:", error)
      toast.error("حدث خطأ أثناء تقديم فكرة المشروع")
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <DashboardLayout sidebarItems={studentSidebarItems} requiredRole="student">
        <div className="p-8">
          <Card>
            <CardContent className="p-8">
              <p className="text-center text-muted-foreground">جاري التحقق...</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout sidebarItems={studentSidebarItems} requiredRole="student">
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">تقديم فكرة مشروع</h1>
          <p className="text-muted-foreground mt-2">قدم فكرة مشروع التخرج الخاص بك للمراجعة</p>
        </div>

        {!canSubmit && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              لا يمكنك تقديم فكرة جديدة حالياً. لديك فكرة قيد المراجعة أو تمت الموافقة عليها.
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>ملاحظة:</strong> جميع المشاريع يجب أن تكون جماعية (طالبين على الأقل). بعد المراجعة، يجب على جميع
            الأعضاء الموافقة على الفكرة والمشاركة.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>المعلومات الأساسية</CardTitle>
              <CardDescription>معلومات عامة عن المشروع والبرنامج</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ✅ قسم المشروع */}
                <div className="space-y-2">
                  <Label>القسم *</Label>
                  <Select
                    value={selectedDepartmentId}
                    onValueChange={(value) => {
                      setSelectedDepartmentId(value)
                      const dept = departments.find((d) => d.id === value)
                      setFormData({ ...formData, department: dept?.code || "" })
                    }}
                  >
                    <SelectTrigger className="rounded-lg border-2">
                      <SelectValue placeholder="اختر القسم" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id} className="cursor-pointer">
                          <span className="!text-gray-900 font-medium">
                            {dept.nameAr} ({dept.code})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="program">البرنامج *</Label>
                  <Input
                    id="program"
                    value={formData.program}
                    onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                    className="rounded-lg"
                    placeholder="مثال: بكالوريوس علوم الحاسب"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="academicYear">السنة الأكاديمية *</Label>
                  <Input
                    id="academicYear"
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    className="rounded-lg"
                    placeholder="مثال: 2024-2025"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="semester">الفصل الدراسي *</Label>
                  <Select
                    value={formData.semester}
                    onValueChange={(value) => setFormData({ ...formData, semester: value })}
                  >
                    <SelectTrigger className="rounded-lg border-2">
                      <SelectValue placeholder="اختر الفصل" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="fall" className="cursor-pointer">
                        <span className="!text-gray-900 font-medium">الفصل الأول</span>
                      </SelectItem>
                      <SelectItem value="spring" className="cursor-pointer">
                        <span className="!text-gray-900 font-medium">الفصل الثاني</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">عنوان المشروع *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="rounded-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectType">نوع المشروع *</Label>
                <Select
                  value={formData.projectType}
                  onValueChange={(value) => setFormData({ ...formData, projectType: value })}
                >
                  <SelectTrigger className="rounded-lg border-2">
                    <SelectValue placeholder="اختر نوع المشروع" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="one-course" className="cursor-pointer">
                      <span className="!text-gray-900 font-medium">كورس واحد</span>
                    </SelectItem>
                    <SelectItem value="two-courses" className="cursor-pointer">
                      <span className="!text-gray-900 font-medium">كورسين</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Students Information */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>معلومات الطلاب</span>
                <Button
                  type="button"
                  onClick={addStudent}
                  size="sm"
                  variant="outline"
                  className="rounded-lg bg-transparent"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة طالب
                </Button>
              </CardTitle>
              <CardDescription>معلومات جميع أعضاء الفريق (2 على الأقل)</CardDescription>
            </CardHeader>

            <CardContent className="space-y-8">
              {formData.students.map((student, index) => (
                <div key={`student-${index}`} className="space-y-4 p-4 border rounded-lg relative">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">الطالب {index + 1}</h3>
                    {index > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeStudent(index)}
                        size="sm"
                        variant="ghost"
                        className="rounded-lg text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>الاسم الكامل *</Label>
                      <Input
                        value={student.fullName}
                        onChange={(e) => updateStudent(index, "fullName", e.target.value)}
                        className="rounded-lg"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>رقم الطالب *</Label>
                      <Input
                        value={student.studentId}
                        onChange={(e) => updateStudent(index, "studentId", e.target.value)}
                        className="rounded-lg"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>المعدل التراكمي *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="4"
                        value={student.gpa}
                        onChange={(e) => updateStudent(index, "gpa", e.target.value)}
                        className="rounded-lg"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>البريد الإلكتروني *</Label>
                      <Input
                        type="email"
                        value={student.email}
                        onChange={(e) => updateStudent(index, "email", e.target.value)}
                        className="rounded-lg"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>رقم الهاتف *</Label>
                      <Input
                        type="tel"
                        value={student.phone}
                        onChange={(e) => updateStudent(index, "phone", e.target.value)}
                        className="rounded-lg"
                        required
                      />
                    </div>

                    {/* ✅ قسم الطالب (Select) */}
                    <div className="space-y-2">
                      <Label>قسم الطالب *</Label>
                      <Select value={student.departmentId} onValueChange={(v) => setStudentDepartment(index, v)}>
                        <SelectTrigger className="rounded-lg border-2">
                          <SelectValue placeholder="اختر القسم" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg">
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id} className="cursor-pointer">
                              <span className="!text-gray-900 font-medium">
                                {dept.nameAr} ({dept.code})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {!!student.departmentId && (
                        <p className="text-xs text-muted-foreground">{student.departmentNameEn}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>معلومات المشرف</CardTitle>
              <CardDescription>بيانات المشرف الرئيسي والمشرف المساعد (إن وجد)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="supervisorName">اسم المشرف *</Label>
                  <Input
                    id="supervisorName"
                    value={formData.supervisorName}
                    onChange={(e) => setFormData({ ...formData, supervisorName: e.target.value })}
                    className="rounded-lg"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supervisorEmail">البريد الإلكتروني للمشرف (UoB) *</Label>
                  <Input
                    id="supervisorEmail"
                    type="email"
                    value={formData.supervisorEmail}
                    onChange={(e) => setFormData({ ...formData, supervisorEmail: e.target.value })}
                    className="rounded-lg"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coSupervisorName">اسم المشرف المساعد (إن وجد)</Label>
                  <Input
                    id="coSupervisorName"
                    value={formData.coSupervisorName}
                    onChange={(e) => setFormData({ ...formData, coSupervisorName: e.target.value })}
                    className="rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coSupervisorEmail">البريد الإلكتروني للمشرف المساعد</Label>
                  <Input
                    id="coSupervisorEmail"
                    type="email"
                    value={formData.coSupervisorEmail}
                    onChange={(e) => setFormData({ ...formData, coSupervisorEmail: e.target.value })}
                    className="rounded-lg"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>تفاصيل المشروع</CardTitle>
              <CardDescription>وصف شامل للمشروع وأهدافه</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="problemStatement">بيان المشكلة *</Label>
                <Textarea
                  id="problemStatement"
                  value={formData.problemStatement}
                  onChange={(e) => setFormData({ ...formData, problemStatement: e.target.value })}
                  rows={4}
                  className="rounded-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objectives">أهداف المشروع *</Label>
                <Textarea
                  id="objectives"
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  rows={5}
                  className="rounded-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="significance">أهمية المشروع *</Label>
                <Textarea
                  id="significance"
                  value={formData.significance}
                  onChange={(e) => setFormData({ ...formData, significance: e.target.value })}
                  rows={4}
                  className="rounded-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="literatureReview">مراجعة الأدبيات الموجزة *</Label>
                <Textarea
                  id="literatureReview"
                  value={formData.literatureReview}
                  onChange={(e) => setFormData({ ...formData, literatureReview: e.target.value })}
                  rows={6}
                  className="rounded-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="references">المراجع الداعمة *</Label>
                <Textarea
                  id="references"
                  value={formData.references}
                  onChange={(e) => setFormData({ ...formData, references: e.target.value })}
                  rows={6}
                  className="rounded-lg"
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>الجدول الزمني للمشروع</CardTitle>
              <CardDescription>حدد أسبوع البداية لكل مرحلة من مراحل المشروع</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right p-3 font-semibold">المرحلة</th>
                      {timelineOptions.map((option) => (
                        <th key={option.value} className="p-3 text-center text-sm font-medium">
                          {option.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: "requirementCollection", label: "جمع المتطلبات" },
                      { key: "literatureReview", label: "مراجعة الأدبيات" },
                      { key: "design", label: "التصميم" },
                      { key: "implementation", label: "التنفيذ" },
                      { key: "testingAndResults", label: "الاختبار والنتائج" },
                      { key: "reportWriting", label: "كتابة التقرير" },
                      { key: "presentation", label: "العرض التقديمي" },
                    ].map((phase) => (
                      <tr key={phase.key} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{phase.label}</td>
                        {timelineOptions.map((option) => (
                          <td key={option.value} className="p-3 text-center">
                            <RadioGroup
                              value={formData.timeline[phase.key as keyof typeof formData.timeline] || ""}
                              onValueChange={(value) =>
                                setFormData({
                                  ...formData,
                                  timeline: { ...formData.timeline, [phase.key]: value },
                                })
                              }
                            >
                              <RadioGroupItem
                                value={option.value}
                                className="
    mx-auto h-5 w-5
    border-2 border-foreground/50
    bg-background
    data-[state=checked]:border-primary
    data-[state=checked]:bg-primary
    data-[state=checked]:text-primary-foreground
    shadow-sm
  "
                              />
                            </RadioGroup>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>إقرار الأصالة</CardTitle>
              <CardDescription>يجب الموافقة على الإقرار لتقديم المشروع</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-3 space-x-reverse">
                <Checkbox
                  id="plagiarismDeclaration"
                  checked={formData.plagiarismDeclaration}
                  onCheckedChange={(checked) => setFormData({ ...formData, plagiarismDeclaration: checked as boolean })}
                  className="
    h-5 w-5
    border-2 border-gray-500
    bg-white
    data-[state=checked]:bg-primary
    data-[state=checked]:border-primary
    data-[state=checked]:text-primary-foreground
    shadow-sm
  "
                />

                <Label htmlFor="plagiarismDeclaration" className="text-sm cursor-pointer leading-relaxed">
                  أقر بأن هذا العمل من إعدادي الخاص وأن جميع المراجع والمصادر المستخدمة قدتم الإشارة إليها بشكل صحيح. *
                </Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading || !canSubmit} size="lg" className="rounded-lg">
              {loading ? "جاري التقديم..." : "تقديم الفكرة"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} size="lg" className="rounded-lg">
              إلغاء
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

const timelineOptions = [
  { value: "w1-3", label: "W 1-3" },
  { value: "w4-6", label: "W 4-6" },
  { value: "w7-9", label: "W 7-9" },
  { value: "w10-12", label: "W 10-12" },
  { value: "w13-16", label: "W 13-16" },
  { value: "next-semester", label: "Next Semester" },
  { value: "na", label: "NA" },
]
