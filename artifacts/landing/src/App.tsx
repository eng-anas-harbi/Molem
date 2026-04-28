function App() {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        color: "#e2e8f0",
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 720 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.4rem 0.9rem",
            background: "rgba(34,197,94,0.12)",
            color: "#4ade80",
            border: "1px solid rgba(34,197,94,0.35)",
            borderRadius: "999px",
            fontSize: "0.85rem",
            marginBottom: "1.5rem",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              background: "#4ade80",
              borderRadius: "50%",
              display: "inline-block",
            }}
          />
          الخدمة تعمل
        </div>

        <h1
          style={{
            fontSize: "3.5rem",
            fontWeight: 800,
            margin: 0,
            background: "linear-gradient(135deg, #38bdf8, #818cf8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          مُلِم
        </h1>
        <p
          style={{
            fontSize: "1.25rem",
            color: "#94a3b8",
            marginTop: "0.5rem",
            marginBottom: "2rem",
          }}
        >
          مدقّق العقود القانوني السعودي بالذكاء الاصطناعي
        </p>

        <p
          style={{
            fontSize: "1rem",
            lineHeight: 1.8,
            color: "#cbd5e1",
            marginBottom: "2.5rem",
          }}
        >
          نحلّل عقود العمل ونكشف الإجحاف ومخالفات نظام العمل السعودي ولوائحه
          التنفيذية، مع استشهاد بالمواد ذات الصلة. الواجهة الكاملة متاحة عبر
          الرابط التالي:
        </p>

        <a
          href="https://v0-molem-psau.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            padding: "0.85rem 2rem",
            background: "linear-gradient(135deg, #38bdf8, #818cf8)",
            color: "#0f172a",
            fontWeight: 700,
            borderRadius: "0.75rem",
            textDecoration: "none",
            fontSize: "1rem",
          }}
        >
          افتح تطبيق مُلِم ←
        </a>

        <div
          style={{
            marginTop: "3rem",
            padding: "1rem",
            background: "rgba(15,23,42,0.5)",
            border: "1px solid rgba(148,163,184,0.15)",
            borderRadius: "0.75rem",
            fontSize: "0.85rem",
            color: "#64748b",
            fontFamily: "monospace",
            direction: "ltr",
          }}
        >
          API Base: <span style={{ color: "#94a3b8" }}>/api</span> · Health:{" "}
          <a
            href="/api/healthz"
            style={{ color: "#38bdf8", textDecoration: "none" }}
          >
            /api/healthz
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;
