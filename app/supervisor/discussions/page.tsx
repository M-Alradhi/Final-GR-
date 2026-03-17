"use client"

import type React from "react"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { supervisorSidebarItems } from "@/lib/constants/supervisor-sidebar"
import { MessageCircle, Plus, Pin, Lock, Unlock, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/contexts/auth-context"
import { useLanguage } from "@/lib/contexts/language-context"
import { useEffect, useState } from "react"
import { getFirebaseDb } from "@/lib/firebase/config"
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  getDoc,
} from "firebase/firestore"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"

interface Discussion {
  id: string
  title: string
  content: string
  authorId: string
  authorName: string
  authorRole: string
  projectId: string
  projectTitle?: string
  isPinned: boolean
  isClosed: boolean
  tags: string[]
  repliesCount: number
  likesCount: number
  createdAt: Timestamp
}

interface Project {
  id: string
  title: string
}

export default function SupervisorDiscussions() {
  const { userData, loading: authLoading } = useAuth()
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
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    projectId: "",
    tags: "",
  })

  useEffect(() => {
    if (!authLoading && userData) {
      fetchData()
    }
  }, [userData, authLoading])

  const fetchData = async () => {
    if (!userData) return

    try {
      setLoading(true)
      const db = getFirebaseDb()

      // Fetch supervisor's projects — primary + secondary
      const projectsQueryPrimary = query(collection(db, "projects"), where("supervisorId", "==", userData.uid))
      const projectsQuerySecondary = query(collection(db, "projects"), where("coSupervisorId", "==", userData.uid))
      const [projSnap1, projSnap2] = await Promise.all([getDocs(projectsQueryPrimary), getDocs(projectsQuerySecondary)])
      const seenProjIds = new Set<string>()
      const projectsData = [...projSnap1.docs, ...projSnap2.docs]
        .filter((doc) => { if (seenProjIds.has(doc.id)) return false; seenProjIds.add(doc.id); return true })
        .map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            title: data.title || data.name || "مشروع بدون عنوان",
          }
        }) as Project[]
      setProjects(projectsData)

      // Fetch discussions from all supervisor's projects
      const projectIds = projectsData.map((p) => p.id)
      if (projectIds.length === 0) {
        setDiscussions([])
        setLoading(false)
        return
      }

      const discussionsQuery = query(collection(db, "discussions"), orderBy("createdAt", "desc"))
      const discussionsSnapshot = await getDocs(discussionsQuery)
      const allDiscussions = discussionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Discussion[]

      // Filter discussions for supervisor's projects
      const filteredDiscussions = allDiscussions.filter((d) => projectIds.includes(d.projectId))

      // Add project titles
      const discussionsWithProjects = filteredDiscussions.map((d) => ({
        ...d,
        projectTitle: projectsData.find((p) => p.id === d.projectId)?.title,
      }))

      setDiscussions(discussionsWithProjects)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error(t("errorLoadingData"))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.content.trim() || !formData.projectId) {
      toast.error(t("fillAllRequiredFields"))
      return
    }

    try {
      const db = getFirebaseDb()
      const tags = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      const selectedProject = projects.find((p) => p.id === formData.projectId)

      await addDoc(collection(db, "discussions"), {
        title: formData.title,
        content: formData.content,
        authorId: userData?.uid,
        authorName: userData?.name,
        authorRole: "supervisor",
        projectId: formData.projectId,
        projectTitle: selectedProject?.title,
        isPinned: false,
        isClosed: false,
        tags,
        repliesCount: 0,
        likesCount: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })

      toast.success(t("discussionCreatedSuccessfully"))
      setDialogOpen(false)
      setFormData({ title: "", content: "", projectId: "", tags: "" })
      fetchData()
    } catch (error) {
      console.error("Error creating discussion:", error)
      toast.error(t("errorCreatingDiscussion"))
    }
  }

  const togglePin = async (id: string, currentPinned: boolean) => {
    try {
      const db = getFirebaseDb()
      const discussionRef = doc(db, "discussions", id)
      const discussionSnap = await getDoc(discussionRef)

      if (!discussionSnap.exists()) {
        toast.error(t("discussionNotFound"))
        fetchData()
        return
      }

      await updateDoc(discussionRef, {
        isPinned: !currentPinned,
      })
      toast.success(currentPinned ? t("pinCancel") : t("discusionPin"))
      fetchData()
    } catch (error) {
      console.error("Error toggling pin:", error)
      toast.error(t("errorOccurred"))
    }
  }

  const toggleClose = async (id: string, currentClosed: boolean) => {
    try {
      const db = getFirebaseDb()
      const discussionRef = doc(db, "discussions", id)
      const discussionSnap = await getDoc(discussionRef)

      if (!discussionSnap.exists()) {
        toast.error(t("discussionNotFound"))
        fetchData()
        return
      }

      await updateDoc(discussionRef, {
        isClosed: !currentClosed,
      })
      toast.success(currentClosed ? t("discussionOpen") : t("discussionClose"))
      fetchData()
    } catch (error) {
      console.error("Error toggling close:", error)
      toast.error(t("errorOccurred"))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t("areYouSureDeleteDiscussion"))) return

    try {
      const db = getFirebaseDb()
      const discussionRef = doc(db, "discussions", id)
      const discussionSnap = await getDoc(discussionRef)

      if (!discussionSnap.exists()) {
        toast.error(t("discussionNotFound"))
        fetchData()
        return
      }

      await deleteDoc(discussionRef)
      toast.success(t("DiscussionDeleteSucssifully"))
      fetchData()
    } catch (error) {
      console.error("Error deleting discussion:", error)
      toast.error(t("errorOccerDeleteDiscussion"))
    }
  }

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <DashboardLayout sidebarItems={supervisorSidebarItems} requiredRole="supervisor">
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
             {t("discussionForum")}
            </h1>
            <p className="text-muted-foreground mt-2">{t("manageDiscussion")}</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                 {t("newDiscussion")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t("createNewDiscussion")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project">{t("project")} *</Label>
                  <Select
                    value={formData.projectId}
                    onValueChange={(value) => setFormData({ ...formData, projectId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectProject")} />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">{t("noProjectsAvailable")}</div>
                      ) : (
                        projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">{t("discussionTitle")}*</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={t("enterDiscussionTitle")}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">{t("discussionContent")}*</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder={t("explainDiscussionInDetail")}
                    rows={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">{t("choo")}</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder={t("exReport")}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    {t("cancel")}
                  </Button>
                  <Button type="submit">{t("createDiscussion")}</Button>
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
        ) : discussions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-muted rounded-full mb-4">
                <MessageCircle className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t("noDiscussions")}</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
               {t("noDiscussionYet")}
              </p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
               {t("newDiscussion")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {discussions.map((discussion, index) => (
              <Card
                key={discussion.id}
                className={`animate-in fade-in slide-in-from-bottom duration-500 ${
                  discussion.isPinned ? "border-primary/50 bg-primary/5" : ""
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <Link href={`/supervisor/discussions/${discussion.id}`} className="flex gap-3 flex-1">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {discussion.authorName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {discussion.isPinned && (
                            <Badge variant="default" className="gap-1">
                              <Pin className="w-3 h-3" />
                              {t("pinned")}
                            </Badge>
                          )}
                          {discussion.isClosed ? (
                            <Badge variant="secondary" className="gap-1">
                              <Lock className="w-3 h-3" />
                              {t("closed")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <Unlock className="w-3 h-3" />
                              {t("open")}
                            </Badge>
                          )}
                          {discussion.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <CardTitle className="text-xl hover:text-primary transition-colors">
                          {discussion.title}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{discussion.authorName}</span>
                          <span>•</span>
                          <span>{discussion.projectTitle}</span>
                          <span>•</span>
                          <span>{formatDate(discussion.createdAt)}</span>
                          <span>•</span>
                          <span>{discussion.repliesCount} {t("reply")}</span>
                        </CardDescription>
                      </div>
                    </Link>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => togglePin(discussion.id, discussion.isPinned)}
                        title={discussion.isPinned ? t("unpin") : t("pin")}
                      >
                        <Pin className={`w-4 h-4 ${discussion.isPinned ? "fill-current" : ""}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleClose(discussion.id, discussion.isClosed)}
                        title={discussion.isClosed ? t("openDiscussion") : t("closeDiscussion")}
                      >
                        {discussion.isClosed ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </Button>
                      {discussion.authorId === userData?.uid && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(discussion.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed line-clamp-2">{discussion.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
