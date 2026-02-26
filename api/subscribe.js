const https = require("https");

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY;
  const MAILERLITE_GROUP_ID = process.env.MAILERLITE_GROUP_ID;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    // Check if user exists in Supabase
    let isNewUser = true;
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const checkRes = await fetch(
        SUPABASE_URL + "/rest/v1/users?email=eq." + encodeURIComponent(email) + "&select=id",
        { headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": "Bearer " + SUPABASE_SERVICE_KEY } }
      );
      const existing = await checkRes.json();
      isNewUser = !existing || existing.length === 0;

      // Upsert user
      await fetch(SUPABASE_URL + "/rest/v1/users", {
        method: "POST",
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": "Bearer " + SUPABASE_SERVICE_KEY,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates",
        },
        body: JSON.stringify({ email, name: name || null }),
      });
    }

    // Only trigger MailerLite for new users
    if (isNewUser && MAILERLITE_API_KEY && MAILERLITE_GROUP_ID) {
      const mlPayload = JSON.stringify({
        email,
        fields: { name: name || "" },
        groups: [MAILERLITE_GROUP_ID],
        resubscribe: false,
      });
      await new Promise((resolve) => {
        const r = https.request(
          {
            hostname: "connect.mailerlite.com",
            path: "/api/subscribers",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + MAILERLITE_API_KEY,
              "Content-Length": Buffer.byteLength(mlPayload),
            },
          },
          (resp) => { resp.resume(); resp.on("end", resolve); }
        );
        r.on("error", resolve);
        r.write(mlPayload);
        r.end();
      });
    }

    return res.status(200).json({ success: true, isNewUser });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
