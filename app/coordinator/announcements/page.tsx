"use client"

import type React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Megaphone, Plus, Pin, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/contexts/auth-context"
import { useEffect, useState } from "react"
import { getFirebaseDb } from "@/lib/firebase/config"
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from "firebase/firestore"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { coordinatorSidebarItems } from "@/lib/constants/coordinator-sidebar"

interface Announcement {
  id: string
  title: string
  content: string
  authorId: string
  authorName: string
  authorRole: string
  projectId?: string | null
  scope?: string
  isPinned: boolean
  createdAt: Timestamp
}

export default function CoordinatorAnnouncements() {
  const { userData, loading: authLoading } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    scope: "all",
    isPinned: false,
  })

  useEffect(() => {
    fetchAnnouncements()
  }, [userData, authLoading])

  const fetchAnnouncements = async () => {
    if (authLoading || !userData) return

    try {
      setLoading(true)
      const db = getFirebaseDb()

      // Fetch all announcements (coordinator can see all)
      const announcementsQuery = query(collection(db, "announcements"), orderBy("createdAt", "desc"))
      const announcementsSnapshot = await getDocs(announcementsQuery)
      const announcementsData = announcementsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Announcement[]

      setAnnouncements(announcementsData)
    } catch (error) {
      console.error("Error fetching announcements:", error)
      toast.error("حدث خطأ أثناء تحميل البيانات")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("يرجى ملء جميع الحقول المطلوبة")
      return
    }

    try {
      const db = getFirebaseDb()

      await addDoc(collection(db, "announcements"), {
        title: formData.title,
        content: formData.content,
        authorId: userData?.uid,
        authorName: userData?.name,
        authorRole: "coordinator",
        projectId: null, // Coordinator announcements are always general
        scope: formData.scope,
        isPinned: formData.isPinned,
        createdAt: Timestamp.now(),
      })

      toast.success("تم نشر الإعلان بنجاح")
      setDialogOpen(false)
      setFormData({ title: "", content: "", scope: "all", isPinned: false })
      fetchAnnouncements()
    } catch (error) {
      console.error("Error creating announcement:", error)
      toast.error("حدث خطأ أثناء نشر الإعلان")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الإعلان؟")) return

    try {
      const db = getFirebaseDb()
      await deleteDoc(doc(db, "announcements", id))
      toast.success("تم حذف الإعلان بنجاح")
      fetchAnnouncements()
    } catch (error) {
      console.error("Error deleting announcement:", error)
      toast.error("حدث خطأ أثناء حذف الإعلان")
    }
  }

  const togglePin = async (id: string, currentPinned: boolean) => {
    try {
      const db = getFirebaseDb()
      await updateDoc(doc(db, "announcements", id), {
        isPinned: !currentPinned,
      })
      toast.success(currentPinned ? "تم إلغاء التثبيت" : "تم تثبيت الإعلان")
      fetchAnnouncements()
    } catch (error) {
      console.error("Error toggling pin:", error)
      toast.error("حدث خطأ")
    }
  }

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getScopeLabel = (scope: string) => {
    switch (scope) {
      case "all":
        return "جميع المشاريع"
      case "single-semester":
        return "مشاريع فصل واحد"
      case "two-semesters":
        return "مشاريع فصلين دراسيين"
      case "other":
        return "أخرى"
      default:
        return "جميع المشاريع"
    }
  }

  return (
    <DashboardLayout sidebarItems={coordinatorSidebarItems} requiredRole="coordinator">
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Megaphone className="w-8 h-8 text-primary" />
              </div>
              الإعلانات
            </h1>
            <p className="text-muted-foreground mt-2">إدارة ونشر الإعلانات العامة لجميع المستخدمين</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                إعلان جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>نشر إعلان عام جديد</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">عنوان الإعلان *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="أدخل عنوان الإعلان"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">محتوى الإعلان *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="أدخل محتوى الإعلان"
                    rows={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scope">نطاق الإعلان *</Label>
                  <Select value={formData.scope} onValueChange={(value) => setFormData({ ...formData, scope: value })}>
                    <SelectTrigger id="scope">
                      <SelectValue placeholder="اختر نطاق الإعلان" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المشاريع</SelectItem>
                      <SelectItem value="single-semester">المشاريع المسجلة في فصل دراسي واحد</SelectItem>
                      <SelectItem value="two-semesters">المشاريع الممتدة على فصلين دراسيين</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">حدد الفئة المستهدفة من الإعلان</p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label htmlFor="pinned">تثبيت الإعلان</Label>
                    <p className="text-sm text-muted-foreground">سيظهر الإعلان في أعلى القائمة</p>
                  </div>
                  <Switch
                    id="pinned"
                    checked={formData.isPinned}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPinned: checked })}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit">نشر الإعلان</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
        ) : announcements.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-muted rounded-full mb-4">
                <Megaphone className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">لا توجد إعلانات</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                لم يتم نشر أي إعلانات بعد. ابدأ بنشر إعلان عام جديد.
              </p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                إعلان جديد
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement, index) => (
              <Card
                key={announcement.id}
                className={`animate-in fade-in slide-in-from-bottom duration-500 ${
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
                            مثبت
                          </Badge>
                        )}
                        <Badge variant={announcement.authorRole === "coordinator" ? "default" : "secondary"}>
                          {announcement.authorRole === "coordinator" ? "منسق" : "مشرف"}
                        </Badge>
                        {announcement.scope && <Badge variant="outline">{getScopeLabel(announcement.scope)}</Badge>}
                      </div>
                      <CardTitle className="text-xl">{announcement.title}</CardTitle>
                      <CardDescription>
                        {announcement.authorName} • {formatDate(announcement.createdAt)}
                      </CardDescription>
                    </div>
                    {announcement.authorId === userData?.uid && (
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => togglePin(announcement.id, announcement.isPinned)}
                          title={announcement.isPinned ? "إلغاء التثبيت" : "تثبيت"}
                        >
                          <Pin className={`w-4 h-4 ${announcement.isPinned ? "fill-current" : ""}`} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(announcement.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
