export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const { email, auditData } = req.body;
  if (!email || !auditData) return res.status(400).json({ error: "Missing email or auditData" });

  try {
    const payload = {
      email,
      score: auditData.score || null,
      score_percent: auditData.scorePercent || null,
      target_role: auditData.targetRole || null,
      issues: auditData.issues || [],
      revised_resume: auditData.revisedResume || null,
      ten_second_test: auditData.tenSecondTest || null,
      ats_notes: auditData.atsNotes || null,
      headline_insight: auditData.headlineInsight || null,
      human_signal: auditData.humanSignal || null,
      machine_read: auditData.machineRead || null,
      reality_check: auditData.realityCheck || null,
    };

    const response = await fetch(SUPABASE_URL + "/rest/v1/audits", {
      method: "POST",
      headers: {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": "Bearer " + SUPABASE_SERVICE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
