const https = require("https");

// Helper to make requests to Supabase
function supabaseRequest(path, method, body) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const hostname = SUPABASE_URL.replace("https://", "");

  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname,
        path,
        method,
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Prefer": "return=representation",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { email, name } = JSON.parse(event.body);
    if (!email) return { statusCode: 400, body: JSON.stringify({ error: "Email required" }) };

    // 1. Save to Supabase users table (upsert so returning users don't error)
    const supabaseRes = await supabaseRequest(
      "/rest/v1/users",
      "POST",
      { email, name: name || null }
    );

    // 409 means user already exists — that's fine
    const supabaseSuccess = supabaseRes.status === 201 || supabaseRes.status === 409;

    // 2. Save to MailerLite
    const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY;
    const mailPayload = JSON.stringify({
      email,
      fields: { name: name || "" },
      groups: ["180310043648853210"],
      status: "active",
    });

    await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: "connect.mailerlite.com",
          path: "/api/subscribers",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${MAILERLITE_API_KEY}`,
            "Content-Length": Buffer.byteLength(mailPayload),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve(data));
        }
      );
      req.on("error", reject);
      req.write(mailPayload);
      req.end();
    });

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
