const https = require("https");

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "API key not configured" }),
    };
  }

  try {
    const body = JSON.parse(event.body);

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
      "- headlineInsight: Exactly 2 sentences. Written directly to this specific person based on what their resume actually shows. Sentence 1: Name the core tension or gap you see - what their background suggests vs what the resume communicates. Sentence 2: One honest forward-looking statement about what fixing this unlocks. Tone: warm, direct, like a trusted insider who genuinely wants them to win. NEVER generic. NEVER start with your resume - speak to the person not the document.",
      "- humanSignal: 3-4 sentences on what story this resume tells a human recruiter in 10 seconds. Cover: (1) what narrative the recruiter infers about this person, (2) what is accidentally being communicated that the person probably did not intend, (3) what is missing from the positioning that would make a recruiter lean in. Be specific to this actual resume. Tone: honest, not harsh.",
      "- machineRead: An array of ATS structural flags found in this resume. Each flag is an object with 3 fields: flag (what was detected in plain language), risk (exactly one of: high, medium, low), fix (one sentence specific and actionable). Look for: multi-column layout, tables, text boxes, graphics, contact info in headers or footers, non-standard section names, inconsistent date formats, special characters in bullets, fonts that may not parse, missing standard sections. Return between 2 and 6 flags. If the resume is structurally clean return 1 flag confirming it with risk low.",
      "- realityCheck: An object with exactly 3 fields: inYourControl (2-3 sentences on what this person can act on right now based on their specific audit results), marketContext (1-2 sentences of honest current market framing relevant to their target role or industry, not generic advice), beyondTheResume (1-2 sentences on what else matters in their search beyond the resume, specific to their situation).",
      "",
      "IMPORTANT: Be honest about the current market without being discouraging. The goal is clarity not comfort. Speak to the person not the document."
    ].join("\n");

    const payload = JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4500,
      system: systemPrompt,
      messages: body.messages,
    });

    const result = await new Promise((resolve, reject) => {
      const req = https.request(
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
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve(data));
        }
      );
      req.on("error", reject);
      req.write(payload);
      req.end();
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: result,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
