"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { studentSidebarItems } from "@/lib/constants/student-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/contexts/auth-context"
import { useLanguage } from "@/lib/contexts/language-context"
import { useState, useEffect } from "react"
import { CalendarIcon, Clock, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getFirebaseDb } from "@/lib/firebase/config"
import { collection, addDoc, query, where, getDocs, Timestamp } from "firebase/firestore"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getDocument } from "@/lib/firebase/db"

export default function MeetingsPage() {
  const { userData } = useAuth()
  const { t, language } = useLanguage()
  const [meetings, setMeetings] = useState<any[]>([])
  const [meetingRequests, setMeetingRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [supervisorName, setSupervisorName] = useState("")
  const [requestData, setRequestData] = useState({
    title: "",
    notes: "",
    date: "",
    time: "",
  })

  const fetchMeetings = async () => {
    if (!userData?.uid) return

    try {
      const db = getFirebaseDb()
      const meetingsQuery = query(collection(db, "meetings"), where("studentId", "==", userData.uid))
      const meetingsSnapshot = await getDocs(meetingsQuery)
      const meetingsData = meetingsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setMeetings(meetingsData.sort((a, b) => b.date.seconds - a.date.seconds))

      const requestsQuery = query(collection(db, "meeting_requests"), where("studentId", "==", userData.uid))
      const requestsSnapshot = await getDocs(requestsQuery)
      const requestsData = requestsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setMeetingRequests(requestsData.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds))
    } catch (error) {
      console.error("Error fetching meetings:", error)
      toast.error(t("errorLoadingData"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchSupervisorName = async () => {
      if (userData?.supervisorId) {
        try {
          const supervisor = await getDocument("users", userData.supervisorId)
          if (supervisor) {
            setSupervisorName(supervisor.name || t("notSpecified"))
          }
        } catch (error) {
          console.error("Error fetching supervisor:", error)
        }
      }
    }

    fetchSupervisorName()
  }, [userData, t])

  useEffect(() => {
    fetchMeetings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData])

  const validateTime = (time: string) => {
    if (!time) return false
    const [hours] = time.split(":").map(Number)
    return hours >= 8 && hours < 20 // 8 AM (08:00) to 8 PM (20:00)
  }

  const handleRequestMeeting = async () => {
    if (!userData?.uid || !userData?.projectId) {
      toast.error(t("errorMessage"))
      return
    }

    if (!userData?.supervisorId) {
      toast.error(t("noDataFound"))
      return
    }

    if (!requestData.title || !requestData.date || !requestData.time) {
      toast.error(t("fieldRequired"))
      return
    }

    if (!validateTime(requestData.time)) {
      toast.error(t("meetingsBetweenHours"))
      return
    }

    try {
      const db = getFirebaseDb()
      await addDoc(collection(db, "meeting_requests"), {
        studentId: userData.uid,
        studentName: userData.name,
        projectId: userData.projectId,
        supervisorId: userData.supervisorId,
        title: requestData.title,
        notes: requestData.notes,
        date: requestData.date,
        time: requestData.time,
        status: "pending",
        createdAt: Timestamp.now(),
      })

      toast.success(t("savedSuccessfully"))
      setIsDialogOpen(false)
      setRequestData({ title: "", notes: "", date: "", time: "" })
      fetchMeetings()
    } catch (error) {
      console.error("Error requesting meeting:", error)
      toast.error(t("errorMessage"))
    }
  }

  return (
    <DashboardLayout sidebarItems={studentSidebarItems} requiredRole="student">
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          {/* </CHANGE> */}
          <div className="w-full sm:w-auto">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
              {t("meetings")}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              {t("meetings")} {supervisorName || t("supervisor")}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg rounded-xl w-full sm:w-auto">
                <Plus className="w-4 h-4" />
                {t("requestMeeting")}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-[500px] rounded-2xl max-h-[90vh] overflow-y-auto">
              {/* </CHANGE> */}
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl">{t("requestMeeting")}</DialogTitle>
                <DialogDescription className="text-sm">
                  {t("requestMeeting")} {supervisorName || t("supervisor")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">
                    {t("meetingTitle")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder={t("meetingTitle")}
                    value={requestData.title}
                    onChange={(e) => setRequestData({ ...requestData, title: e.target.value })}
                    className="h-11 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium">
                    {t("meetingNotes")}
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder={t("meetingNotes")}
                    value={requestData.notes}
                    onChange={(e) => setRequestData({ ...requestData, notes: e.target.value })}
                    rows={3}
                    className="rounded-lg resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-sm font-medium">
                      {t("date")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={requestData.date}
                      onChange={(e) => setRequestData({ ...requestData, date: e.target.value })}
                      className="h-11 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time" className="text-sm font-medium">
                      {t("time")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="time"
                      type="time"
                      min="08:00"
                      max="20:00"
                      value={requestData.time}
                      onChange={(e) => setRequestData({ ...requestData, time: e.target.value })}
                      className="h-11 rounded-lg"
                    />
                    <p className="text-xs text-muted-foreground">{t("timeRange")}</p>
                    {/* </CHANGE> */}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 rounded-lg">
                    {t("cancel")}
                  </Button>
                  <Button onClick={handleRequestMeeting} className="flex-1 rounded-lg">
                    {t("send")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="scheduled" className="space-y-4 sm:space-y-6 w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 rounded-xl h-auto">
            <TabsTrigger value="scheduled" className="rounded-lg text-sm sm:text-base py-2">
              {t("scheduled")}
            </TabsTrigger>
            <TabsTrigger value="requests" className="rounded-lg text-sm sm:text-base py-2">
              {t("meetingRequests")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scheduled" className="space-y-6">
            {loading ? (
              <Card className="rounded-xl">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </CardContent>
              </Card>
            ) : meetings.length === 0 ? (
              <Card className="border-dashed rounded-xl">
                <CardContent className="p-6 sm:p-8 lg:p-12">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <CalendarIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold">{t("noMeetingsYet")}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2">{t("startByAddingProject")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {meetings.map((meeting, index) => (
                  <Card
                    key={meeting.id}
                    className="hover:shadow-lg transition-all duration-300 animate-in slide-in-from-bottom rounded-xl"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                        <div className="flex-1 w-full">
                          <CardTitle className="text-base sm:text-lg lg:text-xl">{meeting.title}</CardTitle>
                          {meeting.notes && <CardDescription className="mt-2 text-sm">{meeting.notes}</CardDescription>}
                        </div>
                        <Badge
                          variant={meeting.status === "scheduled" ? "default" : "secondary"}
                          className="shrink-0 rounded-lg"
                        >
                          {meeting.status === "scheduled" ? t("scheduled") : t("completed")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-2 rounded-lg bg-primary/10 shrink-0">
                            <CalendarIcon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t("date")}</p>
                            <p className="text-sm sm:text-base mt-1 font-medium">
                              {language === "ar"
                                ? new Date(meeting.date.seconds * 1000).toLocaleDateString("ar-EG")
                                : new Date(meeting.date.seconds * 1000).toLocaleDateString("en-US")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-2 rounded-lg bg-primary/10 shrink-0">
                            <Clock className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t("time")}</p>
                            <p className="text-sm sm:text-base mt-1 font-medium">{meeting.time}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            {loading ? (
              <Card className="rounded-xl">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </CardContent>
              </Card>
            ) : meetingRequests.length === 0 ? (
              <Card className="border-dashed rounded-xl">
                <CardContent className="p-6 sm:p-8 lg:p-12">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold">{t("noMeetingsYet")}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2">{t("requestMeeting")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {meetingRequests.map((request, index) => (
                  <Card
                    key={request.id}
                    className="hover:shadow-lg transition-all duration-300 animate-in slide-in-from-bottom rounded-xl"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                        <div className="flex-1 w-full">
                          <CardTitle className="text-base sm:text-lg lg:text-xl">{request.title}</CardTitle>
                          {request.notes && <CardDescription className="mt-2 text-sm">{request.notes}</CardDescription>}
                        </div>
                        <Badge
                          variant={
                            request.status === "pending"
                              ? "secondary"
                              : request.status === "approved"
                                ? "default"
                                : "destructive"
                          }
                          className="shrink-0 rounded-lg"
                        >
                          {request.status === "pending"
                            ? t("underReview")
                            : request.status === "approved"
                              ? t("approved")
                              : t("rejected")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-2 rounded-lg bg-primary/10 shrink-0">
                            <CalendarIcon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t("date")}</p>
                            <p className="text-sm sm:text-base mt-1 font-medium">
                              {language === "ar"
                                ? new Date(request.date).toLocaleDateString("ar-EG")
                                : new Date(request.date).toLocaleDateString("en-US")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-2 rounded-lg bg-primary/10 shrink-0">
                            <Clock className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t("time")}</p>
                            <p className="text-sm sm:text-base mt-1 font-medium">{request.time}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs sm:text-sm text-muted-foreground break-words">
                        {t("submittedOn")}{" "}
                        {language === "ar"
                          ? new Date(request.createdAt.seconds * 1000).toLocaleDateString("ar-EG")
                          : new Date(request.createdAt.seconds * 1000).toLocaleDateString("en-US")}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
