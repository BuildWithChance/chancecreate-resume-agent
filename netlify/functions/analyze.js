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
      max_tokens: 5000,
      system: `You are an expert resume writer and recruiter with 8+ years at Fortune 500 companies.
You respond ONLY with a single valid JSON object. No markdown, no backticks, no text before or after the JSON.
Use \\n for line breaks inside string values. Escape all special characters properly.

RESUME FORMATTING RULES (follow exactly):
- If someone held multiple roles at the same company, list the company name ONCE, then list each role underneath it
- Format: COMPANY NAME\\nRole Title | City, State\\nDates\\n• bullet\\n• bullet\\n\\nRole Title | City, State\\nDates\\n• bullet
- NEVER repeat the company name before each role - group them together
- Write the COMPLETE resume - every single role with real bullets, no placeholders
- If education is not in the resume, include a note: EDUCATION\\nNot listed — recommend adding degree, school, and graduation year
- Section headers in ALL CAPS
- Use bullet character • for all bullets`,
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
