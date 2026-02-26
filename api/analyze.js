const https = require("https");

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "API key not configured" });

  try {
    const systemPrompt = [
      "You are an expert resume writer and recruiter with 8+ years at Fortune 500 companies.",
      "You respond ONLY with a single valid JSON object.",
      "No markdown, no backticks, no text before or after the JSON.",
      "Use \\n for line breaks inside string values. Escape all special characters properly.",
      "",
      "FORMATTING RULES - follow every single one:",
      "- Group multiple roles at the same company under ONE company name. NEVER repeat the company name between roles.",
      "- ALWAYS use a pipe | between job title and location: Customer Success Manager | Tampa, FL",
      "- NEVER write a title and location without the | separator",
      "- Use en dash for ALL date ranges: 2022 to 2024 not 2022 - 2024. Current role: 2024 to Present",
      "- If older roles are vague or undescribed, do NOT fabricate bullets. Write: [Earlier roles noted but not detailed - candidate should add specific titles, companies, and accomplishments]",
      "- If no education found: write Not listed - add your degree, school, and graduation year and flag as a warning issue",
      "- Section headers in ALL CAPS",
      "- Use bullet character for all bullets",
      "- Write the COMPLETE resume with real bullets for every role that has detail",
      "",
      "NEW FIELD RULES:",
      "- headlineInsight: Exactly 2 sentences. Written directly to this specific person. Sentence 1: Name the core tension or gap - what their background suggests vs what the resume communicates. Sentence 2: What fixing it unlocks. Warm insider tone. NEVER start with your resume.",
      "- humanSignal: 3 sentences. What narrative the recruiter infers, what is accidentally communicated, what positioning is missing. Specific to this resume only.",
      "- machineRead: Array of ATS flags. Each: {flag, risk: high/medium/low, fix}. 2-5 flags max.",
      "- realityCheck: {inYourControl, marketContext, beyondTheResume}. 1-2 sentences each. Honest, not generic.",
      "",
      "Goal: clarity not comfort. Speak to the person not the document."
    ].join("\n");

    const payload = JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4500,
      system: systemPrompt,
      messages: req.body.messages,
    });

    const result = await new Promise((resolve, reject) => {
      const request = https.request(
        {
          hostname: "api.anthropic.com",
          path: "/v1/messages",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (r) => {
          let data = "";
          r.on("data", (chunk) => (data += chunk));
          r.on("end", () => resolve(data));
        }
      );
      request.on("error", reject);
      request.write(payload);
      request.end();
    });

    const parsed = JSON.parse(result);
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
