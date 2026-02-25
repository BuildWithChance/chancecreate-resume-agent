const https = require("https");

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

// Convert score label to percentage
function scoreToPercent(score) {
  const map = {
    "Recruiter Ready": 92,
    "Strong": 78,
    "Decent Foundation": 63,
    "Needs Work": 45,
  };
  return map[score] || 45;
}

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
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { email, auditData } = JSON.parse(event.body);

    if (!email || !auditData) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing email or audit data" }) };
    }

    // Look up user id from email
    const userRes = await supabaseRequest(
      `/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id`,
      "GET",
      null
    );

    let userId = null;
    try {
      const users = JSON.parse(userRes.body);
      if (users && users.length > 0) userId = users[0].id;
    } catch (e) {}

    // Save audit
    const auditRes = await supabaseRequest(
      "/rest/v1/audits",
      "POST",
      {
        user_id: userId,
        email,
        score: auditData.score,
        score_percent: scoreToPercent(auditData.score),
        issues: auditData.issues,
        ten_second_test: auditData.tenSecondTest,
        ats_notes: auditData.atsNotes,
        revised_resume: auditData.revisedResume,
      }
    );

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
