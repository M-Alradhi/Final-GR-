import type { UIMessage } from "ai"

export const maxDuration = 30

const knowledgeBase = {
  ar: {
    تسجيل: {
      keywords: ["تسجيل", "دخول", "لوجن", "login", "تسجيل دخول"],
      answer: `*تسجيل الدخول:*

1. اذهب إلى صفحة تسجيل الدخول
2. أدخل البريد الإلكتروني الجامعي
3. أدخل كلمة المرور
4. اضغط "تسجيل الدخول"

*إذا نسيت كلمة المرور:*
- اضغط على "نسيت كلمة المرور"
- أدخل بريدك الإلكتروني
- ستصلك رسالة لإعادة تعيين كلمة المرور

*ملاحظة:* كلمة المرور الافتراضية للحسابات الجديدة عادةً: 123456`,
    },
    فكرة_مشروع: {
      keywords: ["فكرة", "مشروع", "تقديم فكرة", "اقتراح مشروع", "قدم", "project idea", "submit"],
      answer: `*تقديم فكرة مشروع:*

*الخطوات:*
1. اذهب إلى صفحة "مشروعي"
2. اضغط على زر "تقديم فكرة مشروع"
3. املأ النموذج بالتفاصيل التالية:
   - عنوان المشروع
   - وصف تفصيلي للمشروع
   - أهداف المشروع
   - التقنيات المقترحة
   - المتطلبات والموارد
4. اضغط "تقديم الفكرة"

*بعد التقديم:*
- ستصبح الحالة "قيد المراجعة"
- سيراجع المشرف الفكرة خلال 2-3 أيام
- ستصلك إشعار بالقرار (قبول/رفض/تعديلات)

*نصائح لفكرة ناجحة:*
- كن واضحاً ومحدداً في الوصف
- اختر تقنيات مناسبة لمستواك
- حدد أهداف قابلة للقياس
- اذكر الموارد المطلوبة`,
    },
    تسليم_مهمة: {
      keywords: ["تسليم", "مهمة", "مهام", "submit task", "assignment", "ارفع", "upload"],
      answer: `*تسليم مهمة:*

*الخطوات:*
1. اذهب إلى صفحة "المهام"
2. اضغط على المهمة المطلوبة
3. اضغط على زر "تسليم"
4. ارفع الملف المطلوب (PDF, DOC, ZIP)
5. أضف ملاحظات للمشرف (اختياري)
6. اضغط "تسليم المهمة"

*بعد التسليم:*
- الحالة تتغير إلى "قيد المراجعة"
- لا يمكن التعديل بعد التسليم
- سيقيم المشرف المهمة ويضع الدرجة
- ستصلك إشعار عند التقييم

*ملاحظات مهمة:*
- الحد الأقصى لحجم الملف: 10 ميجابايت
- تأكد من التسليم قبل الموعد النهائي
- راجع المتطلبات قبل التسليم`,
    },
    اجتماع: {
      keywords: ["اجتماع", "اجتماعات", "meeting", "لقاء", "موعد", "طلب اجتماع"],
      answer: `*طلب اجتماع مع المشرف:*

*الخطوات:*
1. اذهب إلى صفحة "الاجتماعات"
2. اضغط على "طلب اجتماع"
3. املأ النموذج:
   - عنوان الاجتماع
   - التاريخ المقترح
   - الوقت المقترح
   - القسم (اختياري)
   - ملاحظات توضح سبب الاجتماع
4. اضغط "إرسال الطلب"

*بعد إرسال الطلب:*
- يصل الطلب للمشرف المسؤول عنك فقط
- المشرف يمكنه: الموافقة / اقتراح وقت بديل / الرفض
- ستصلك إشعار بالرد
- الحالة: معلق → مؤكد / ملغي

*نصيحة:*
- اذكر الموضوع بوضوح في الملاحظات
- اقترح عدة أوقات بديلة
- احضّر أسئلتك مسبقاً`,
    },
    درجات: {
      keywords: ["درجات", "درجة", "تقييم", "grades", "marks", "نتيجة", "علامة"],
      answer: `*عرض الدرجات والتقييمات:*

*في صفحة المهام:*
1. اذهب إلى "المهام"
2. المهام المكتملة تظهر بها الدرجة
3. اضغط على المهمة لرؤية:
   - الدرجة التي حصلت عليها
   - الدرجة القصوى
   - النسبة المئوية
   - ملاحظات المشرف

*في لوحة التحكم:*
- متوسط الدرجات الكلي
- نسبة التقدم في المشروع
- عدد المهام المكتملة

*ملاحظة:*
- الدرجات تظهر فقط بعد تقييم المشرف
- كل مهمة لها وزن يحدده المشرف
- الدرجة النهائية = مجموع (درجة المهمة × وزنها)`,
    },
    رفض_فكرة: {
      keywords: ["رفض", "رفضت", "مرفوض", "rejected", "declined"],
      answer: `*إذا رُفضت فكرة مشروعك:*

*الخطوات:*
1. اذهب إلى صفحة "مشروعي"
2. اقرأ ملاحظات المشرف بعناية
3. افهم أسباب الرفض
4. اضغط "تقديم فكرة جديدة"
5. لديك خيارين:
   - تعديل الفكرة حسب الملاحظات
   - تقديم فكرة جديدة تماماً

*نصائح:*
- تواصل مع المشرف لفهم المطلوب بدقة
- يمكنك استخدام "الرسائل" للتوضيح
- اطلب اجتماع لمناقشة الأفكار
- لا تثبط عزيمتك، الرفض فرصة للتحسين

*تذكر:*
- اختيار الفكرة الصحيحة يضمن نجاح المشروع
- المشرف يرفض لمصلحتك وليس ضدك`,
    },
    تواصل: {
      keywords: ["تواصل", "رسالة", "تحدث", "اتصل", "message", "contact"],
      answer: `*التواصل مع المشرف:*

*لديك 3 طرق:*

*1. الرسائل الخاصة:*
- اذهب إلى "الرسائل"
- اختر المشرف
- أرسل رسالة خاصة
- مناسب للأمور الشخصية أو الخاصة بمشروعك

*2. المناقشات العامة:*
- اذهب إلى "المناقشات"
- انضم لمناقشة موجودة أو أنشئ جديدة
- مناسب للنقاشات التي تفيد الجميع
- يمكن للطلاب الآخرين المشاركة

*3. الاجتماعات:*
- اذهب إلى "الاجتماعات"
- اطلب اجتماع مباشر
- مناسب للمناقشات المهمة والتفصيلية

*نصيحة:*
- استخدم لغة محترمة ومهنية
- كن واضحاً ومختصراً
- أرفق أي ملفات أو روابط ضرورية`,
    },
    تقدم: {
      keywords: ["تقدم", "progress", "نسبة", "percentage", "كم أنجزت"],
      answer: `*متابعة تقدم المشروع:*

*في لوحة التحكم:*
- نسبة التقدم الكلية (بناءً على المهام)
- عدد المهام المكتملة / الإجمالي
- متوسط الدرجات

*كيف يُحسب التقدم:*
- كل مهمة لها وزن محدد
- عند إكمال مهمة: التقدم += وزن المهمة
- التقدم 100% = جميع المهام مكتملة ومقيّمة

*في صفحة "مشروعي":*
- حالة المشروع الحالية
- تفاصيل كل مرحلة
- الإحصائيات الكاملة

*نصيحة:*
- تابع التقدم يومياً
- سلّم المهام في موعدها
- راجع الملاحظات والتقييمات`,
    },
    إشعارات: {
      keywords: ["إشعار", "إشعارات", "notification", "تنبيه", "تنبيهات"],
      answer: `*نظام الإشعارات:*

*أنواع الإشعارات:*
- تقييم مهمة جديد
- رد المشرف على فكرة المشروع
- رد على طلب اجتماع
- مهمة جديدة مُسندة
- رسالة جديدة
- إعلان جديد من المنسق

*كيفية الوصول:*
1. اضغط على أيقونة الجرس في الأعلى
2. ستظهر لك جميع الإشعارات الأخيرة
3. اضغط على الإشعار للذهاب للصفحة المعنية

*ملاحظات:*
- الإشعارات تصل فورياً
- الإشعارات غير المقروءة تظهر بلون مميز
- يمكنك تمييز الكل كمقروء`,
    },
    كلمة_المرور: {
      keywords: ["كلمة المرور", "password", "نسيت", "تغيير", "forgot"],
      answer: `*إعادة تعيين كلمة المرور:*

*إذا نسيت كلمة المرور:*
1. اذهب لصفحة تسجيل الدخول
2. اضغط "نسيت كلمة المرور؟"
3. أدخل بريدك الإلكتروني
4. ستصلك رسالة إعادة التعيين
5. اضغط الرابط في الرسالة
6. أدخل كلمة مرور جديدة

*لتغيير كلمة المرور:*
1. اذهب إلى "الإعدادات"
2. اضغط "تغيير كلمة المرور"
3. أدخل كلمة المرور الحالية
4. أدخل كلمة المرور الجديدة مرتين
5. اضغط "حفظ"

*نصائح الأمان:*
- استخدم كلمة مرور قوية (8 أحرف على الأقل)
- امزج بين الأحرف والأرقام والرموز
- لا تشارك كلمة المرور مع أحد`,
    },
    ملفات: {
      keywords: ["ملف", "ملفات", "رفع", "upload", "file", "تحميل"],
      answer: `*رفع الملفات:*

*أنواع الملفات المدعومة:*
- PDF, DOC, DOCX
- ZIP, RAR
- PNG, JPG
- XLS, XLSX
- PPT, PPTX

*الحد الأقصى للحجم:* 10 ميجابايت

*خطوات الرفع:*
1. اضغط على "رفع ملف" أو "اختر ملف"
2. اختر الملف من جهازك
3. انتظر حتى يكتمل الرفع
4. ستظهر علامة النجاح

*في حالة فشل الرفع:*
- تأكد من حجم الملف (أقل من 10 ميجابايت)
- تأكد من نوع الملف المدعوم
- تأكد من اتصال الإنترنت
- حاول مرة أخرى

*أماكن رفع الملفات:*
- تسليم المهام
- تقديم فكرة المشروع
- الصورة الشخصية في الملف الشخصي`,
    },
  },
  en: {
    login: {
      keywords: ["login", "sign in", "access", "دخول", "تسجيل"],
      answer: `*Logging In:*

1. Go to the login page
2. Enter your university email
3. Enter your password
4. Click "Login"

*If you forgot your password:*
- Click "Forgot Password?"
- Enter your email
- You'll receive a reset link
- Click the link and set a new password

*Note:* Default password for new accounts is usually: 123456`,
    },
    project_idea: {
      keywords: ["project", "idea", "submit", "proposal", "فكرة", "مشروع"],
      answer: `*Submitting a Project Idea:*

*Steps:*
1. Go to "My Project" page
2. Click "Submit Project Idea"
3. Fill in the form:
   - Project Title
   - Detailed Description
   - Project Objectives
   - Proposed Technologies
   - Requirements and Resources
4. Click "Submit Idea"

*After Submission:*
- Status becomes "Under Review"
- Supervisor reviews within 2-3 days
- You'll receive notification of decision
- Possible outcomes: Accept/Reject/Request Modifications

*Tips for Success:*
- Be clear and specific in description
- Choose appropriate technologies for your level
- Define measurable objectives
- List required resources`,
    },
    submit_task: {
      keywords: ["submit", "task", "assignment", "upload", "تسليم", "مهمة"],
      answer: `*Submitting a Task:*

*Steps:*
1. Go to "Tasks" page
2. Click on the task
3. Click "Submit"
4. Upload required file (PDF, DOC, ZIP)
5. Add notes for supervisor (optional)
6. Click "Submit Task"

*After Submission:*
- Status changes to "Under Review"
- Cannot edit after submission
- Supervisor will grade and provide feedback
- You'll receive notification when graded

*Important Notes:*
- Maximum file size: 10 MB
- Submit before deadline
- Review requirements before submitting`,
    },
    meeting: {
      keywords: ["meeting", "appointment", "schedule", "اجتماع", "موعد"],
      answer: `*Requesting a Meeting with Supervisor:*

*Steps:*
1. Go to "Meetings" page
2. Click "Request Meeting"
3. Fill in the form:
   - Meeting Title
   - Proposed Date
   - Proposed Time
   - Department (optional)
   - Notes explaining purpose
4. Click "Send Request"

*After Sending:*
- Request goes to your assigned supervisor only
- Supervisor can: Approve / Suggest Alternative / Decline
- You'll receive notification of response
- Status: Pending → Confirmed / Cancelled

*Tip:*
- Clearly state the topic in notes
- Suggest multiple alternative times
- Prepare your questions in advance`,
    },
    grades: {
      keywords: ["grade", "marks", "score", "evaluation", "درجات", "تقييم"],
      answer: `*Viewing Grades and Evaluations:*

*In Tasks Page:*
1. Go to "Tasks"
2. Completed tasks show grades
3. Click on task to see:
   - Your score
   - Maximum score
   - Percentage
   - Supervisor feedback

*In Dashboard:*
- Overall grade average
- Project progress percentage
- Number of completed tasks

*Note:*
- Grades appear only after supervisor evaluation
- Each task has a weight set by supervisor
- Final grade = sum of (task grade × weight)`,
    },
    rejected: {
      keywords: ["rejected", "declined", "refused", "رفض", "مرفوض"],
      answer: `*If Your Project Idea is Rejected:*

*Steps:*
1. Go to "My Project" page
2. Read supervisor feedback carefully
3. Understand rejection reasons
4. Click "Submit New Idea"
5. You have two options:
   - Modify the idea per feedback
   - Submit a completely new idea

*Tips:*
- Communicate with supervisor to understand requirements
- Use "Messages" for clarification
- Request a meeting to discuss ideas
- Don't be discouraged - rejection is improvement opportunity

*Remember:*
- Choosing the right idea ensures project success
- Supervisor rejects for your benefit, not against you`,
    },
  },
}

function findBestAnswer(question: string, language = "ar"): string {
  const normalizedQuestion = question.toLowerCase().trim()
  const kb = knowledgeBase[language as keyof typeof knowledgeBase] || knowledgeBase.ar

  for (const topic of Object.values(kb)) {
    for (const keyword of topic.keywords) {
      if (normalizedQuestion.includes(keyword.toLowerCase())) {
        return topic.answer
      }
    }
  }

  return language === "ar"
    ? `أهلاً بك في المساعد الذكي لنظام إدارة مشاريع التخرج!

يمكنني مساعدتك في:
- تقديم وإدارة المشاريع
- تسليم المهام والتقييمات
- طلب الاجتماعات مع المشرف
- التواصل والرسائل
- متابعة التقدم والدرجات
- حل المشاكل التقنية

اكتب سؤالك وسأساعدك فوراً!`
    : `Welcome to the Graduation Projects Management System AI Assistant!

I can help you with:
- Submitting and managing projects
- Submitting tasks and evaluations
- Requesting meetings with supervisor
- Communication and messages
- Tracking progress and grades
- Solving technical issues

Ask me anything!`
}

function getMessageText(message: UIMessage): string {
  return (
    message.parts
      ?.filter(part => part.type === "text")
      .map(part => part.text)
      .join(" ") || ""
  )
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, language = "ar" }: { messages: UIMessage[]; language?: string } = body

    const lastMessage = messages[messages.length - 1]
    const userQuestion = getMessageText(lastMessage)
    const answer = findBestAnswer(userQuestion, language)

    const response: UIMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      parts: [{ type: "text", text: answer }],
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch {
    return new Response(
      JSON.stringify({
        id: crypto.randomUUID(),
        role: "assistant",
        parts: [{ type: "text", text: "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى." }],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}