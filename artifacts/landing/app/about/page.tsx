import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Scale, Users, Target, Sparkles, Crown, User, GraduationCap } from "lucide-react"

export default function AboutPage() {
  const teamMembers = [
    { name: "أنس الحربي", role: "الليدر", isLeader: true },
    { name: "أسامة التميمي", role: "عضو الفريق", isLeader: false },
    { name: "جواد الجدوع", role: "عضو الفريق", isLeader: false },
    { name: "فرحان العنزي", role: "عضو الفريق", isLeader: false },
  ]

  return (
    <div className="flex flex-col w-full min-h-dvh">
      <SiteHeader />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-20 h-20 rounded-2xl bg-[oklch(0.55_0.08_45)] flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Scale className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-header-foreground mb-4">من نحن؟</h1>
            <p className="text-header-foreground/70 text-lg">تعرف على فريق مشروع مُلِم</p>
          </div>

          <div className="bg-header-bg border border-[oklch(0.88_0.03_45)] rounded-2xl p-6 sm:p-8 shadow-sm mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[oklch(0.55_0.08_45)]/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-[oklch(0.55_0.08_45)]" />
              </div>
              <h2 className="text-xl font-semibold text-header-foreground">عن المشروع</h2>
            </div>
            <p className="text-header-foreground/85 text-lg leading-relaxed">
              نحن مجموعة مشروع مُلِم لمادة أسس هندسة البرمجيات وقمنا ببناء محلل عقود قانوني للقانون السعودي خاص باستخدام تقنيات الذكاء الاصطناعي للتماشي مع احتياجات المختصين وغير المختصين في مجال العقود القانونية.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 mb-10">
            <div className="bg-header-bg border border-[oklch(0.88_0.03_45)] rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-5 h-5 text-[oklch(0.55_0.08_45)]" />
                <h3 className="font-medium text-header-foreground">الذكاء الاصطناعي</h3>
              </div>
              <p className="text-sm text-header-foreground/70">نستخدم أحدث تقنيات الذكاء الاصطناعي لتحليل العقود</p>
            </div>
            <div className="bg-header-bg border border-[oklch(0.88_0.03_45)] rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <Scale className="w-5 h-5 text-[oklch(0.55_0.08_45)]" />
                <h3 className="font-medium text-header-foreground">القانون السعودي</h3>
              </div>
              <p className="text-sm text-header-foreground/70">متخصصون في تحليل العقود وفق الأنظمة السعودية</p>
            </div>
          </div>

          <div className="bg-header-bg border border-[oklch(0.88_0.03_45)] rounded-2xl p-6 sm:p-8 shadow-sm mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[oklch(0.55_0.08_45)]/10 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-[oklch(0.55_0.08_45)]" />
              </div>
              <h2 className="text-xl font-semibold text-header-foreground">مشرف المشروع</h2>
            </div>
            <div className="flex items-center gap-4 p-5 rounded-xl bg-[oklch(0.55_0.08_45)]/5 border border-[oklch(0.55_0.08_45)]/30">
              <div className="w-14 h-14 rounded-full bg-[oklch(0.55_0.08_45)] flex items-center justify-center">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-header-foreground">د. عبدالله البنيان</h3>
                <p className="text-sm text-[oklch(0.55_0.08_45)]">مشرف المشروع</p>
              </div>
            </div>
          </div>

          <div className="bg-header-bg border border-[oklch(0.88_0.03_45)] rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-[oklch(0.55_0.08_45)]/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-[oklch(0.55_0.08_45)]" />
              </div>
              <h2 className="text-xl font-semibold text-header-foreground">الأعضاء</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {teamMembers.map((member, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                    member.isLeader
                      ? "bg-[oklch(0.55_0.08_45)]/5 border-[oklch(0.55_0.08_45)]/30"
                      : "bg-background border-[oklch(0.88_0.03_45)]"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${member.isLeader ? "bg-[oklch(0.55_0.08_45)]" : "bg-[oklch(0.88_0.03_45)]"}`}>
                    {member.isLeader ? <Crown className="w-6 h-6 text-white" /> : <User className="w-6 h-6 text-header-foreground/70" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-header-foreground">{member.name}</h3>
                    <p className={`text-sm ${member.isLeader ? "text-[oklch(0.55_0.08_45)]" : "text-header-foreground/60"}`}>{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
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
