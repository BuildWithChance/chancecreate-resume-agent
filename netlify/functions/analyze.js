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
    const payload = JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 6000,
      system: `You are an expert resume writer and recruiter with 8+ years at Fortune 500 companies. You respond ONLY with a single valid JSON object. No markdown, no backticks, no text before or after the JSON. Use \\n for line breaks inside string values. Escape all special characters properly.

FORMATTING RULES — follow every single one:
- Group multiple roles at the same company under ONE company name. NEVER repeat the company name between roles.
- ALWAYS use a pipe | between job title and location: "Customer Success Manager | Tampa, FL"
- NEVER write a title and location without the | separator
- Use en dash for ALL date ranges: 2022 – 2024 not 2022 - 2024. Current role: 2024 – Present
- If older roles are vague or undescribed, do NOT fabricate bullets. Write: [Earlier roles noted but not detailed — candidate should add specific titles, companies, and accomplishments]
- If no education found: write "Not listed — add your degree, school, and graduation year" and flag as a warning issue
- Section headers in ALL CAPS
- Use bullet character • for all bullets
- Write the COMPLETE resume with real bullets for every role that has detail

NEW FIELD RULES:
- headlineInsight: Speak directly to the person, not about the document. Never start with "your resume". Make it feel like a trusted insider who has seen thousands of resumes and genuinely wants this person to win.
- humanSignal: Be specific to what is actually in this resume. No generic observations that could apply to anyone.
- machineRead: Only flag things that are actually detectable from the resume text provided. Do not invent flags.
- realityCheck: Be honest about the current market without being discouraging. The goal is clarity, not comfort.`,
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
