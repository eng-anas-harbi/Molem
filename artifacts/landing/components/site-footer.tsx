import { Scale, Code, GraduationCap } from "lucide-react"

export function SiteFooter() {
  const designers = [
    "أنس الحربي",
    "أسامة التميمي",
    "جواد الجدوع",
    "فرحان العنزي",
  ]

  const supervisor = "عبدالله البنيان"

  return (
    <footer className="border-t border-[oklch(0.85_0.04_60)] bg-header-bg shrink-0">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[oklch(0.50_0.08_55)] flex items-center justify-center">
                <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-header-foreground">Molem</h2>
                <p className="text-[10px] sm:text-xs text-header-foreground/70">محلل العقود القانونية</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-header-foreground/70 leading-relaxed">
              محللك القانوني الذكي للعقود والاتفاقيات - تحليل البنود، كشف المخاطر، واستشارات قانونية
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 sm:w-5 sm:h-5 text-header-foreground" />
              <h3 className="text-sm sm:text-base font-semibold text-header-foreground">فريق التصميم والتطوير</h3>
            </div>
            <ul className="space-y-1.5 sm:space-y-2">
              {designers.map((name, index) => (
                <li key={index} className="text-xs sm:text-sm text-header-foreground/70">{name}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-header-foreground" />
              <h3 className="text-sm sm:text-base font-semibold text-header-foreground">الدكتور المشرف</h3>
            </div>
            <p className="text-xs sm:text-sm text-header-foreground/70">د. {supervisor}</p>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-[oklch(0.85_0.04_60)]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
            <p className="text-xs sm:text-sm text-header-foreground/70 text-center sm:text-right">
              جميع الحقوق محفوظة &copy; {new Date().getFullYear()} Molem
            </p>
            <p className="text-[10px] sm:text-xs text-header-foreground/70">
              مشروع أسس هندسة البرمجيات - مُلِم
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
