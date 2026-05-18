# Test Cases — مُلِم | Molem

جدول حالات الاختبار لمشروع مُلِم — محلل العقود القانونية السعودية.

| Test Case ID | Test Case Description | Input | Expected Result |
|---|---|---|---|
| T1 | Verify AI engine accuracy using Google Gemini 2.5 Flash. | A query regarding Saudi Labor Law. | System retrieves the correct legal article from the 524 seeded articles. |
| T2 | Test the Two-pass RAG (Retrieval-Augmented Generation) process. | Uploading a contract for analysis. | System selects relevant articles and provides a structured JSON response. |
| T3 | Verify legal text simplification. | Complex legal jargon from a contract. | System converts terms into plain, easy-to-understand language. |
| T4 | Test the shared reverse proxy and API routing. | User request from the Next.js interface. | Request is correctly routed to the Express API and processed on Replit. |
| T5 | Verify risk assessment and clause flagging. | A clause that conflicts with Saudi regulations. | System highlights the clause and flags it as "High Risk". |
| T6 | Verify system performance and response time. | Uploading a standard contract file. | AI-generated analysis is delivered within 5 seconds. |
