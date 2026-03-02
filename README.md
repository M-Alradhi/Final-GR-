# 🎓 منصة إدارة مشاريع التخرج
### Graduation Projects Management Platform — University of Bahrain, College of IT

## 🚀 تشغيل المشروع

```bash
# 1. نسخ ملف البيئة
cp .env.example .env.local
# عدّل .env.local وأضف قيمك

# 2. تثبيت التبعيات
pnpm install

# 3. تشغيل
pnpm dev
```

## ⚙️ متغيرات البيئة المطلوبة

| المتغير | الوصف |
|---------|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID |
| `DEEPSEEK_API_KEY` | DeepSeek AI Key |
| `IMGBB_API_KEY` | ImgBB Upload Key |

## 👥 الأدوار
- 🔵 **طالب** — مشاريع، مهام، اجتماعات، نقاشات
- 🟢 **مشرف** — إدارة الطلاب، التقييم، الجدولة
- 🟡 **منسق** — إدارة شاملة، تقارير، موافقات

## 🛠️ التقنيات
Next.js 15 • TypeScript • Firebase • Tailwind CSS • shadcn/ui • DeepSeek AI
