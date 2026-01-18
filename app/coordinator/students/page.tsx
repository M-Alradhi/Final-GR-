"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Users, UserPlus, UserCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  setDoc,
  getDoc,
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useAuth } from "@/lib/contexts/auth-context"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase/config"
import { coordinatorSidebarItems } from "@/lib/constants/coordinator-sidebar"

type AnyDoc = Record<string, any>

export default function CoordinatorStudents() {
  const { loading: authLoading } = useAuth()
  const [students, setStudents] = useState<AnyDoc[]>([])
  const [supervisors, setSupervisors] = useState<AnyDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<AnyDoc | null>(null)
  const [selectedSupervisorId, setSelectedSupervisorId] = useState("")
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false)
  const [departments, setDepartments] = useState<AnyDoc[]>([])
  const [newStudent, setNewStudent] = useState({
    name: "",
    email: "",
    password: "",
    studentId: "", // رقم جامعي
    department: "",
    phone: "",
  })

  const [isConfirmChangeOpen, setIsConfirmChangeOpen] = useState(false)
  const [pendingSupervisorId, setPendingSupervisorId] = useState("")
  const [currentSupervisorName, setCurrentSupervisorName] = useState("")
  const [targetSupervisorName, setTargetSupervisorName] = useState("")

  const fetchData = async () => {
    try {
      setLoading(true)

      const studentsQuery = query(collection(db, "users"), where("role", "==", "student"))
      const studentsSnapshot = await getDocs(studentsQuery)
      const studentsData = studentsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }))

      const supervisorsQuery = query(collection(db, "users"), where("role", "==", "supervisor"))
      const supervisorsSnapshot = await getDocs(supervisorsQuery)
      const supervisorsData = supervisorsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }))

      const departmentsQuery = query(collection(db, "departments"), where("isActive", "==", true))
      const departmentsSnapshot = await getDocs(departmentsQuery)
      const departmentsData = departmentsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      setDepartments(departmentsData)

      const supervisorsWithCounts = await Promise.all(
        supervisorsData.map(async (supervisor) => {
          const studentCount = studentsData.filter((s) => s.supervisorId === supervisor.id).length
          return { ...supervisor, studentCount }
        }),
      )

      setStudents(studentsData)
      setSupervisors(supervisorsWithCounts)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("حدث خطأ أثناء تحميل البيانات")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // ✅ Helper: get real Firebase UID for a team member object (by email OR university studentId)
  const resolveUserUidFromMember = async (member: any): Promise<string | null> => {
    try {
      const email = typeof member?.email === "string" ? member.email.trim().toLowerCase() : ""
      const uniStudentId = typeof member?.studentId === "string" ? member.studentId.trim() : ""

      // 1) Try by email
      if (email) {
        const q1 = query(collection(db, "users"), where("email", "==", email))
        const snap1 = await getDocs(q1)
        if (!snap1.empty) return snap1.docs[0].id
      }

      // 2) Try by university studentId (field name in users is also studentId)
      if (uniStudentId) {
        const q2 = query(collection(db, "users"), where("studentId", "==", uniStudentId))
        const snap2 = await getDocs(q2)
        if (!snap2.empty) return snap2.docs[0].id
      }

      return null
    } catch (e) {
      console.error("resolveUserUidFromMember error:", e)
      return null
    }
  }

  const handleAssignSupervisor = async () => {
    if (!selectedStudent || !selectedSupervisorId) {
      toast.error("يرجى اختيار مشرف")
      return
    }

    const oldSupervisorId = selectedStudent.supervisorId || ""
    const hasProject = !!selectedStudent.projectId
    const isChangingSupervisor = oldSupervisorId && oldSupervisorId !== selectedSupervisorId

    if ((hasProject || isChangingSupervisor) && !isConfirmChangeOpen) {
      const oldName = supervisors.find((s) => s.id === oldSupervisorId)?.name || "غير محدد"
      const newName = supervisors.find((s) => s.id === selectedSupervisorId)?.name || "غير محدد"

      setCurrentSupervisorName(oldSupervisorId ? oldName : "لا يوجد")
      setTargetSupervisorName(newName)
      setPendingSupervisorId(selectedSupervisorId)
      setIsConfirmChangeOpen(true)
      return
    }

    try {
      const supervisorToApply = pendingSupervisorId || selectedSupervisorId

      // ✅ Update selected student's supervisor
      await updateDoc(doc(db, "users", selectedStudent.id), {
        supervisorId: supervisorToApply,
        updatedAt: Timestamp.now(),
      })

      // ✅ If student has project, update project + team members users
      if (selectedStudent.projectId) {
        const projectRef = doc(db, "projects", selectedStudent.projectId)
        const projectDoc = await getDoc(projectRef)

        if (projectDoc.exists()) {
          const projectData: any = projectDoc.data()

          // Update project supervisor
          await updateDoc(projectRef, {
            supervisorId: supervisorToApply,
            updatedAt: Timestamp.now(),
          })

          // ✅ FIX: teamMembers are OBJECTS (not UIDs). Resolve each to real user uid then update users docs.
          const rawMembers = projectData.teamMembers

          if (Array.isArray(rawMembers) && rawMembers.length > 0) {
            const resolvedUids: string[] = []

            for (const m of rawMembers) {
              const uid = await resolveUserUidFromMember(m)
              if (uid) resolvedUids.push(uid)
            }

            // remove duplicates
            const uniqueUids = Array.from(new Set(resolvedUids))

            if (uniqueUids.length > 0) {
              await Promise.all(
                uniqueUids.map((uid) =>
                  // ✅ use setDoc merge to avoid "No document to update" if a doc is missing for any reason
                  setDoc(
                    doc(db, "users", uid),
                    { supervisorId: supervisorToApply, updatedAt: Timestamp.now() },
                    { merge: true },
                  ),
                ),
              )
            } else {
              console.warn("No team member UIDs resolved from teamMembers:", rawMembers)
            }
          }
        } else {
          console.warn("Project not found:", selectedStudent.projectId)
        }
      }

      toast.success("تم تعيين المشرف بنجاح")
      setIsAssignDialogOpen(false)
      setIsConfirmChangeOpen(false)
      setPendingSupervisorId("")
      setCurrentSupervisorName("")
      setTargetSupervisorName("")
      setSelectedStudent(null)
      setSelectedSupervisorId("")
      fetchData()
    } catch (error) {
      console.error("Error assigning supervisor:", error)
      toast.error("حدث خطأ أثناء تعيين المشرف")
    }
  }

  const handleAddStudent = async () => {
    if (
      !newStudent.name ||
      !newStudent.email ||
      !newStudent.password ||
      !newStudent.studentId ||
      !newStudent.department ||
      !newStudent.phone
    ) {
      toast.error("يرجى ملء جميع الحقول المطلوبة")
      return
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, newStudent.email, newStudent.password)

      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        name: newStudent.name,
        email: newStudent.email.trim().toLowerCase(),
        studentId: newStudent.studentId, // رقم جامعي
        department: newStudent.department,
        phone: newStudent.phone,
        role: "student",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })

      toast.success("تم إضافة الطالب بنجاح")
      setIsAddStudentDialogOpen(false)
      setNewStudent({
        name: "",
        email: "",
        password: "",
        studentId: "",
        department: "",
        phone: "",
      })
      fetchData()
    } catch (error: any) {
      console.error("Error adding student:", error)
      if (error.code === "auth/email-already-in-use") {
        toast.error("البريد الإلكتروني مستخدم بالفعل")
      } else {
        toast.error("حدث خطأ أثناء إضافة الطالب")
      }
    }
  }

  const openAssignDialog = (student: AnyDoc) => {
    setSelectedStudent(student)
    setSelectedSupervisorId(student.supervisorId || "")
    setIsAssignDialogOpen(true)
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout sidebarItems={coordinatorSidebarItems} requiredRole="coordinator">
        <div className="p-8">
          <Card className="rounded-xl">
            <CardContent className="p-8">
              <p className="text-center text-muted-foreground">جاري التحميل...</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout sidebarItems={coordinatorSidebarItems} requiredRole="coordinator">
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">إدارة الطلاب</h1>
            <p className="text-muted-foreground mt-2">تعيين المشرفين للطلاب ومتابعة حالتهم</p>
          </div>
          <Button onClick={() => setIsAddStudentDialogOpen(true)} className="rounded-lg">
            <UserPlus className="w-4 h-4 ml-2" />
            إضافة طالب جديد
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الطلاب</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{students.length}</div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">طلاب بدون مشرف</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{students.filter((s) => !s.supervisorId).length}</div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">طلاب مع مشرف</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{students.filter((s) => s.supervisorId).length}</div>
            </CardContent>
          </Card>
        </div>

        {students.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <Users className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">لا يوجد طلاب حالياً</h3>
                  <p className="text-sm text-muted-foreground mt-2">سيظهر الطلاب هنا بعد التسجيل</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>قائمة الطلاب</CardTitle>
              <CardDescription>جميع الطلاب المسجلين في النظام</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {students.map((student) => {
                  const supervisor = supervisors.find((s) => s.id === student.supervisorId)
                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-3">
                          <p className="font-medium">{student.name}</p>
                          <Badge variant="outline" className="rounded-lg">
                            {student.studentId}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">القسم:</span>
                          <span>
                            {departments.find((d) => d.code === student.department)?.name ||
                              student.department ||
                              "غير محدد"}
                          </span>
                        </div>
                        {supervisor && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">المشرف:</span>
                            <span className="font-medium text-primary">{supervisor.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {student.supervisorId ? (
                          <Badge className="rounded-lg bg-green-500">تم التعيين</Badge>
                        ) : (
                          <Badge variant="secondary" className="rounded-lg">
                            بدون مشرف
                          </Badge>
                        )}
                        <Button onClick={() => openAssignDialog(student)} size="sm" className="rounded-lg">
                          {student.supervisorId ? "تغيير المشرف" : "تعيين مشرف"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assign Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="rounded-xl">
            <DialogHeader>
              <DialogTitle>تعيين مشرف</DialogTitle>
              <DialogDescription>اختر المشرف المناسب للطالب {selectedStudent?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>المشرف</Label>
                <Select value={selectedSupervisorId} onValueChange={setSelectedSupervisorId}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="اختر المشرف" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {supervisors.map((supervisor) => (
                      <SelectItem key={supervisor.id} value={supervisor.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{supervisor.name}</span>
                          <span className="text-xs text-muted-foreground mr-2">({supervisor.studentCount} طالب)</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSupervisorId && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    المشرف المختار:{" "}
                    <span className="font-medium text-foreground">
                      {supervisors.find((s) => s.id === selectedSupervisorId)?.name}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    عدد الطلاب الحالي:{" "}
                    <span className="font-medium text-foreground">
                      {supervisors.find((s) => s.id === selectedSupervisorId)?.studentCount}
                    </span>
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAssignDialogOpen(false)
                  setIsConfirmChangeOpen(false)
                  setPendingSupervisorId("")
                  setCurrentSupervisorName("")
                  setTargetSupervisorName("")
                }}
                className="rounded-lg"
              >
                إلغاء
              </Button>
              <Button onClick={handleAssignSupervisor} className="rounded-lg">
                تعيين
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm Change Dialog */}
        <Dialog open={isConfirmChangeOpen} onOpenChange={setIsConfirmChangeOpen}>
          <DialogContent className="rounded-xl">
            <DialogHeader>
              <DialogTitle>تأكيد تغيير المشرف</DialogTitle>
              <DialogDescription>هذا الطالب مرتبط مسبقاً بمشروع أو مشرف.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">
                  الطالب: <span className="font-medium text-foreground">{selectedStudent?.name}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  المشرف الحالي: <span className="font-medium text-foreground">{currentSupervisorName}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  المشرف الجديد: <span className="font-medium text-foreground">{targetSupervisorName}</span>
                </p>

                {selectedStudent?.projectId && (
                  <p className="text-sm text-amber-700 mt-2">
                    تنبيه: الطالب لديه مشروع مرتبط. عند التأكيد سيتم تغيير مشرف المشروع وتحديث كل أعضاء الفريق.
                  </p>
                )}
              </div>

              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm">
                هل أنت متأكد من تغيير المشرف؟
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsConfirmChangeOpen(false)
                  setPendingSupervisorId("")
                  setCurrentSupervisorName("")
                  setTargetSupervisorName("")
                }}
                className="rounded-lg"
              >
                إلغاء
              </Button>
              <Button onClick={handleAssignSupervisor} className="rounded-lg">
                نعم، غيّر
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Student Dialog */}
        <Dialog open={isAddStudentDialogOpen} onOpenChange={setIsAddStudentDialogOpen}>
          <DialogContent className="rounded-xl max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة طالب جديد</DialogTitle>
              <DialogDescription>أدخل بيانات الطالب لإنشاء حساب جديد</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>الاسم الكامل *</Label>
                <Input
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  placeholder="أدخل الاسم الكامل"
                  className="rounded-lg"
                />
              </div>
              <div>
                <Label>البريد الإلكتروني *</Label>
                <Input
                  type="email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  placeholder="student@example.com"
                  className="rounded-lg"
                />
              </div>
              <div>
                <Label>كلمة المرور *</Label>
                <Input
                  type="password"
                  value={newStudent.password}
                  onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                  placeholder="أدخل كلمة المرور"
                  className="rounded-lg"
                  minLength={6}
                />
              </div>
              <div>
                <Label>الرقم الجامعي *</Label>
                <Input
                  value={newStudent.studentId}
                  onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })}
                  placeholder="مثال: 202012345"
                  className="rounded-lg"
                />
              </div>

              <div>
                <Label>القسم *</Label>
                <Select
                  value={newStudent.department}
                  onValueChange={(value) => setNewStudent({ ...newStudent, department: value })}
                >
                  <SelectTrigger className="rounded-lg border-2">
                    <SelectValue placeholder="اختر القسم">
                      {newStudent.department && departments.length > 0 ? (
                        <span className="text-foreground font-medium">
                          {departments.find((d) => d.code === newStudent.department)?.name || newStudent.department}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">اختر القسم</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {departments.length === 0 ? (
                      <div className="p-3 text-sm text-center">
                        <p className="text-foreground font-medium">لا توجد أقسام متاحة</p>
                        <p className="text-xs text-muted-foreground mt-1">يرجى إضافة أقسام من صفحة إدارة الأقسام</p>
                      </div>
                    ) : (
                      departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.code} className="cursor-pointer">
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium text-foreground">{dept.name}</span>
                            <span className="text-xs text-muted-foreground mr-2">({dept.code})</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {newStudent.department && departments.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    القسم المختار:{" "}
                    <span className="font-medium text-foreground">
                      {departments.find((d) => d.code === newStudent.department)?.name}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <Label>رقم الهاتف *</Label>
                <Input
                  value={newStudent.phone}
                  onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                  placeholder="مثال: 0501234567"
                  className="rounded-lg"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddStudentDialogOpen(false)} className="rounded-lg">
                إلغاء
              </Button>
              <Button onClick={handleAddStudent} className="rounded-lg">
                إضافة الطالب
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
