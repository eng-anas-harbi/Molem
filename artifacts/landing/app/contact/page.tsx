import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react"

export default function ContactPage() {
  return (
    <div className="flex flex-col w-full min-h-dvh">
      <SiteHeader />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-header-foreground mb-4">إتصل بنا</h1>
            <p className="text-header-foreground/70 text-lg">نسعد بتواصلكم معنا للإجابة على استفساراتكم</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-header-bg border border-[oklch(0.88_0.03_45)] rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-[oklch(0.55_0.08_45)] flex items-center justify-center">
                  <Phone className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-header-foreground">رقم الهاتف</h3>
                  <p className="text-sm text-header-foreground/60">فريق مشروع مُلِم</p>
                </div>
              </div>
              <a href="tel:+966XXXXXXXXX" className="block text-2xl font-bold text-[oklch(0.55_0.08_45)] hover:text-[oklch(0.45_0.09_45)] transition-colors" dir="ltr">
                +966 XX XXX XXXX
              </a>
            </div>

            <div className="bg-header-bg border border-[oklch(0.88_0.03_45)] rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-[oklch(0.55_0.08_45)] flex items-center justify-center">
                  <Mail className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-header-foreground">البريد الإلكتروني</h3>
                  <p className="text-sm text-header-foreground/60">راسلنا في أي وقت</p>
                </div>
              </div>
              <a href="mailto:molem@example.com" className="block text-xl font-medium text-[oklch(0.55_0.08_45)] hover:text-[oklch(0.45_0.09_45)] transition-colors" dir="ltr">
                molem@example.com
              </a>
            </div>

            <div className="bg-header-bg border border-[oklch(0.88_0.03_45)] rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-[oklch(0.55_0.08_45)] flex items-center justify-center">
                  <MapPin className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-header-foreground">الموقع</h3>
                  <p className="text-sm text-header-foreground/60">مقر المشروع</p>
                </div>
              </div>
              <p className="text-lg text-header-foreground">المملكة العربية السعودية</p>
            </div>

            <div className="bg-header-bg border border-[oklch(0.88_0.03_45)] rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-[oklch(0.55_0.08_45)] flex items-center justify-center">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-header-foreground">ساعات العمل</h3>
                  <p className="text-sm text-header-foreground/60">متاحون للرد</p>
                </div>
              </div>
              <p className="text-lg text-header-foreground">
                الأحد - الخميس
                <br />
                <span className="text-header-foreground/70">9:00 ص - 5:00 م</span>
              </p>
            </div>
          </div>

          <div className="mt-10 bg-header-bg border border-[oklch(0.88_0.03_45)] rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <MessageCircle className="w-6 h-6 text-[oklch(0.55_0.08_45)]" />
              <h3 className="text-xl font-semibold text-header-foreground">ملاحظة</h3>
            </div>
            <p className="text-header-foreground/80 leading-relaxed">
              نحن فريق مشروع مُلِم ونسعد بتلقي استفساراتكم وملاحظاتكم. يمكنكم التواصل معنا عبر الهاتف أو البريد الإلكتروني وسنقوم بالرد في أقرب وقت ممكن.
            </p>
          </div>

          <div className="mt-8 text-center">
            <Link href="/" className="text-sm text-header-foreground/70 hover:text-header-foreground transition-colors">
              العودة للصفحة الرئيسية
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
