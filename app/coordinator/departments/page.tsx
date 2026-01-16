"use client"

import type React from "react"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { coordinatorSidebarItems } from "@/lib/constants/coordinator-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, Timestamp } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase/config"
import { useAuth } from "@/lib/contexts/auth-context"
import { toast } from "sonner"
import { Building2, Plus, Edit, Trash2 } from "lucide-react"
import type { Department } from "@/lib/types"

export default function DepartmentsPage() {
  const { userData } = useAuth()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [formData, setFormData] = useState({
    code: "",
    nameAr: "",
    nameEn: "",
    description: "",
    isActive: true,
  })

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      setLoading(true)
      const db = getFirebaseDb()
      const snapshot = await getDocs(collection(db, "departments"))
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Department[]
      setDepartments(data)
    } catch (error) {
      console.error("Error fetching departments:", error)
      toast.error("حدث خطأ في تحميل الأقسام")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (department?: Department) => {
    if (department) {
      setEditingDepartment(department)
      setFormData({
        code: department.code,
        nameAr: department.nameAr,
        nameEn: department.nameEn,
        description: department.description || "",
        isActive: department.isActive,
      })
    } else {
      setEditingDepartment(null)
      setFormData({
        code: "",
        nameAr: "",
        nameEn: "",
        description: "",
        isActive: true,
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.code || !formData.nameAr || !formData.nameEn) {
      toast.error("يرجى ملء جميع الحقول المطلوبة")
      return
    }

    try {
      const db = getFirebaseDb()

      if (editingDepartment) {
        // Update existing department
        await updateDoc(doc(db, "departments", editingDepartment.id), {
          code: formData.code,
          nameAr: formData.nameAr,
          nameEn: formData.nameEn,
          description: formData.description,
          isActive: formData.isActive,
        })
        toast.success("تم تحديث القسم بنجاح")
      } else {
        // Add new department
        await addDoc(collection(db, "departments"), {
          code: formData.code,
          nameAr: formData.nameAr,
          nameEn: formData.nameEn,
          description: formData.description,
          isActive: formData.isActive,
          createdAt: Timestamp.now(),
          createdBy: userData?.uid,
        })
        toast.success("تم إضافة القسم بنجاح")
      }

      setIsDialogOpen(false)
      fetchDepartments()
    } catch (error) {
      console.error("Error saving department:", error)
      toast.error("حدث خطأ أثناء حفظ القسم")
    }
  }

  const handleDelete = async (departmentId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا القسم؟")) return

    try {
      const db = getFirebaseDb()
      await deleteDoc(doc(db, "departments", departmentId))
      toast.success("تم حذف القسم بنجاح")
      fetchDepartments()
    } catch (error) {
      console.error("Error deleting department:", error)
      toast.error("حدث خطأ أثناء حذف القسم")
    }
  }

  return (
    <DashboardLayout sidebarItems={coordinatorSidebarItems} requiredRole="coordinator">
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              إدارة الأقسام
            </h1>
            <p className="text-muted-foreground mt-2">إضافة وتعديل الأقسام الأكاديمية</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            إضافة قسم جديد
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : departments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Building2 className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">لا توجد أقسام</h3>
              <p className="text-sm text-muted-foreground mb-4">ابدأ بإضافة قسم أكاديمي جديد</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                إضافة قسم
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {departments.map((dept) => (
              <Card key={dept.id} className="rounded-xl hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {dept.nameAr}
                        {dept.isActive ? (
                          <Badge variant="default" className="rounded-lg">
                            نشط
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="rounded-lg">
                            معطل
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">{dept.nameEn}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">الكود:</span>
                      <span className="font-medium">{dept.code}</span>
                    </div>
                    {dept.description && <p className="text-sm text-muted-foreground">{dept.description}</p>}
                  </div>
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-lg bg-transparent"
                      onClick={() => handleOpenDialog(dept)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      تعديل
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 rounded-lg"
                      onClick={() => handleDelete(dept.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      حذف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDepartment ? "تعديل القسم" : "إضافة قسم جديد"}</DialogTitle>
            <DialogDescription>
              {editingDepartment ? "قم بتحديث معلومات القسم" : "أدخل معلومات القسم الجديد"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">كود القسم *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="مثال: cs, it, is"
                className="rounded-lg"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameAr">الاسم بالعربي *</Label>
              <Input
                id="nameAr"
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                placeholder="مثال: علوم الحاسب"
                className="rounded-lg"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameEn">الاسم بالإنجليزي *</Label>
              <Input
                id="nameEn"
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                placeholder="Computer Science"
                className="rounded-lg"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="وصف مختصر للقسم"
                className="rounded-lg"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">القسم نشط</Label>
                <p className="text-sm text-muted-foreground">يمكن للطلاب التسجيل في هذا القسم</p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-lg">
                إلغاء
              </Button>
              <Button type="submit" className="rounded-lg">
                {editingDepartment ? "تحديث" : "إضافة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
