# TADAWUL US PRO — منصة الأسهم الأمريكية بالعربي

منصة تداول متقدمة للسوق الأمريكي مع ذكاء اصطناعي متعلم، رادار سيولة، وتوصية عقود أسبوعية.

---

## 📁 شجرة المشروع (الجذور)

يجب أن يكون الهيكل **بهذا الشكل بالضبط** — أي تغيير سيكسر الـ deployment:

```
tadawul-us-v1/
├── index.html          ← النسخة الكاملة (سطح المكتب)
├── mobile.html         ← واجهة الجوال
├── mobile-app.js       ← منطق نسخة الجوال
├── vercel.json         ← إعدادات Vercel
└── api/                ← المجلد المهم — لازم يكون اسمه api بالضبط
    ├── stock.js
    ├── options.js
    ├── ai.js
    └── recommend.js
```

⚠️ **الخطأ الذي حدث في deployment السابق**: الـ `vercel.json` القديم كان يحتوي على بلوك `functions` يحدد المسارات يدوياً، وVercel CLI الجديد رفضه. الحل الجديد: حذف البلوك وترك Vercel يكتشف ملفات `/api/*.js` تلقائياً.

---

## 🚀 طريقة الرفع (3 طرق)

### الطريقة 1️⃣: رفع مباشر (الأسهل)

1. ادخل على [vercel.com/new](https://vercel.com/new)
2. اختر **"Deploy"** → **"Browse"** أو اسحب وأفلت
3. اسحب **مجلد `tadawul-us-v1` كاملاً** (ليس الملفات منفصلة!)
4. تأكد قبل النشر أن:
   - مجلد `api/` ظاهر في الـ preview
   - ملف `index.html` ظاهر في الـ root
5. اضغط **Deploy**
6. بعد النجاح → روح **Settings → Environment Variables** → أضف:
   - الاسم: `ANTHROPIC_API_KEY`
   - القيمة: مفتاح Claude API من [console.anthropic.com](https://console.anthropic.com)
7. اضغط **Redeploy** عشان يطبق المتغير

### الطريقة 2️⃣: عبر GitHub (موصى بها للتحديثات)

1. أنشئ repository جديد في GitHub
2. ارفع المحتويات (مهم: ملفات المجلد، **مش** المجلد كاملاً):
   ```bash
   cd tadawul-us-v1
   git init
   git add .
   git commit -m "initial"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPO.git
   git push -u origin main
   ```
3. ادخل على Vercel → **Add New Project** → اختر الـ repo
4. **Framework Preset**: اختر **"Other"** (مش Next.js)
5. **Root Directory**: اتركه فارغ (أو `./`)
6. **Build Command**: اتركه فارغ
7. **Output Directory**: اتركه فارغ
8. اضغط **Deploy**
9. بعد النشر أضف `ANTHROPIC_API_KEY` في Settings كما في الطريقة الأولى

### الطريقة 3️⃣: Vercel CLI

```bash
npm i -g vercel
cd tadawul-us-v1
vercel
# اتبع الخطوات في الـ terminal
vercel env add ANTHROPIC_API_KEY
vercel --prod
```

---

## ✅ التحقق من نجاح الـ Deployment

افتح هذه الروابط للتأكد:

| الرابط | المتوقع |
|--------|---------|
| `https://YOUR.vercel.app/` | الواجهة الكاملة بالعربي |
| `https://YOUR.vercel.app/mobile` | واجهة الجوال |
| `https://YOUR.vercel.app/api/stock?symbol=AAPL` | بيانات JSON لسهم Apple |
| `https://YOUR.vercel.app/api/options?symbol=AAPL` | سلسلة عقود Apple |

إذا أحد الـ APIs أعطى 404 → معنى المجلد `api/` لم يُرفع بشكل صحيح.

---

## 🐛 حل المشاكل الشائعة

### ❌ "Deployment failed: pattern doesn't match any function"
**السبب**: `vercel.json` يحتوي على `functions` block قديم.
**الحل**: استخدم النسخة الجديدة من `vercel.json` الموجودة في هذا المشروع.

### ❌ APIs تعطي 404 بعد النشر
**السبب**: مجلد `api/` ما اترفع.
**الحل**: تأكد من أن المجلد مرفوع وأن ملفاته بداخله مباشرة (مش `api/api/stock.js`).

### ❌ "ANTHROPIC_API_KEY not configured"
**السبب**: المتغير غير مضاف.
**الحل**: Vercel Dashboard → Project → Settings → Environment Variables → أضف المفتاح → Redeploy.

### ❌ الجوال لا يفتح تلقائياً
**الحل**: ادخل مباشرة على `/mobile` أو `/mobile.html`.

---

## 🎯 المميزات المضافة (مقارنة بالنسخة السعودية)

1. **80+ سهم أمريكي** بالعربي مقسمة لـ 12 قطاع
2. **بري ماركت 🌅** — يعرض سعر ما قبل الافتتاح
3. **ذكاء اصطناعي متعلم (Adaptive AI)** — يتذكر التوصيات ويعدل أوزانها بعد انتهاء الصلاحية
4. **توصية عقود أسبوعية ذكية** — مع تتبع وSettlement تلقائي
5. **تبويب العقود المرشحة** — فحص top 24 سهم مع scoring
6. **رادار السيولة 📡 (Neuronode Graph)** — تصور بصري لتدفقات السيولة
7. **جدران Calls/Puts** — من بيانات Open Interest الفعلية
8. **محاكاة Smart Money + Gamma Magnetism** + مؤشر Breakout
9. **تبويب 🧠 الذاكرة** — يعرض إحصائيات win-rate والأوزان
10. **واجهة جوال مستقلة** — تتحول تلقائياً عند الدخول من الموبايل

---

## ⚠️ إفصاحات مهمة (داخل الواجهة)

- البيانات السعرية وحجوم التداول وسلسلة العقود **حقيقية** من Yahoo Finance
- **رادار السيولة** يستخدم **محاكاة استنتاجية** ذكية مبنية على:
  - Open Interest حقيقي ✓
  - Z-Score الحجم ✓
  - تجمعات السيولة السعرية (S/R clusters) ✓
  - Delta/Gamma محسوبة من الصيغة ✓
- بيانات **Dark Pool** و**Sweeps الفعلية** تتطلب اشتراكات مدفوعة (Unusual Whales / Cheddar Flow ~ $1000/شهر) — **لم تُستخدم هنا**
- المحتوى **للأغراض التعليمية** فقط وليس توصية استثمارية

---

## 🧠 كيف يتعلم الذكاء الاصطناعي؟

كل توصية عقد تُحفظ في `localStorage` (المتصفح):
- بعد 60 ثانية يفحص النظام إذا انتهت الصلاحية
- يقارن السعر الحالي بـ Breakeven
- يضع علامة **ربح/خسارة**
- يُعدّل أوزان المكونات السبعة (technical/delta/iv/oi/volume/spread/move) بـ learning rate = 0.06
- ويُعدّل أوزان الاستراتيجيات الـ 12 بنفس الطريقة
- الأوزان محصورة بين 0.25 و 2.5 لتجنب الانفجار

⚠️ **ملاحظة**: الذاكرة محلية في المتصفح (لا تتزامن بين الأجهزة).

---

## 📞 تكلفة التشغيل

- **Vercel Free Plan**: كافي تماماً (100GB bandwidth/شهر)
- **Yahoo Finance**: مجاني بدون حدود
- **Claude API**: ~$3-15 لكل مليون token (استخدام شخصي ~$1-5/شهر)
