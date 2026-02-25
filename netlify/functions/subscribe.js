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

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY;

    // ── 1. CHECK if user already exists in Supabase ──
    const hostname = SUPABASE_URL.replace("https://", "");
    const checkRes = await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname,
          path: `/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id`,
          method: "GET",
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve({ status: res.statusCode, body: data }));
        }
      );
      req.on("error", reject);
      req.end();
    });

    const existingUsers = JSON.parse(checkRes.body || "[]");
    const isNewUser = existingUsers.length === 0;

    // ── 2. INSERT new user into Supabase (only if new) ──
    if (isNewUser) {
      await supabaseRequest("/rest/v1/users", "POST", { email, name: name || null });
    }

    // ── 3. MailerLite — only subscribe NEW users to trigger automation ──
    // Returning users won't re-trigger the welcome sequence
    if (isNewUser) {
      const mailPayload = JSON.stringify({
        email,
        fields: { name: name || "" },
        groups: ["180310043648853210"],
        status: "active",
        resubscribe: false,
      });

      const mlRes = await new Promise((resolve, reject) => {
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
            res.on("end", () => resolve({ status: res.statusCode, body: data }));
          }
        );
        req.on("error", reject);
        req.write(mailPayload);
        req.end();
      });

      console.log("MailerLite response:", mlRes.status, mlRes.body);
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: true, isNewUser }),
    };
  } catch (err) {
    console.error("Subscribe error:", err.message);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
