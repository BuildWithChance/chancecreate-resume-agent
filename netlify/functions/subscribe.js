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

  const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY;
  const GROUP_ID = "180310043648853210";

  if (!MAILERLITE_API_KEY) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "MailerLite API key not configured" }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { email, name } = body;

    if (!email || !email.includes("@")) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Valid email required" }),
      };
    }

    const payload = JSON.stringify({
      email: email.trim().toLowerCase(),
      fields: { name: name || "" },
      groups: [GROUP_ID],
      status: "active",
    });

    const result = await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: "connect.mailerlite.com",
          path: "/api/subscribers",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + MAILERLITE_API_KEY,
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

    // 200 or 201 = success, 409 = already subscribed (also fine)
    if (result.status === 200 || result.status === 201 || result.status === 409) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ success: true }),
      };
    } else {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Subscription failed", detail: result.body }),
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
