# Chance Create — Resume Audit Tool

> Built by a Fortune 500 recruiter turned mainframe developer.

A free AI-powered resume audit tool that gives job seekers what recruiters actually see — honest feedback, ATS analysis, and a fully rewritten resume in under 60 seconds.

**Live at:** [careertools.chancecreate.com](https://careertools.chancecreate.com)

---

## What It Does

Most people don't know what happens on the other side of a job application. This tool does.

Upload your resume and get:
- **Recruiter readability score** — dynamic percentage based on actual issue count
- **Critical issues, warnings, and tips** — exactly what's costing you interviews
- **10-second scan test** — what a recruiter sees in their first look
- **ATS analysis** — whether your resume survives automated screening
- **Fully rewritten resume** — ATS-optimized, impact-led, ready to use
- **Audit history** — returning users can track improvement over time

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | Vanilla HTML / CSS / JS + React 18 (score component) |
| AI | Anthropic API — Claude Sonnet 4 |
| PDF Parsing | PDF.js |
| PDF Generation | jsPDF |
| Hosting | Netlify (serverless functions) |
| Database | Supabase (Postgres) |
| Email | MailerLite |
| Domain | Squarespace DNS → `careertools.chancecreate.com` |

---

## Project Structure

```
chancecreate-resume-agent/
├── index.html                  # Main frontend — UI, logic, React score component
├── netlify/
│   └── functions/
│       ├── analyze.js          # Anthropic API — resume audit + rewrite
│       ├── subscribe.js        # Saves user to Supabase + MailerLite
│       ├── saveAudit.js        # Saves audit results to Supabase
│       └── getConfig.js        # Passes Supabase config to frontend
├── netlify.toml                # Netlify build + redirect config
├── package.json
└── README.md
```

---

## Environment Variables

Set these in Netlify → Site configuration → Environment variables:

```
ANTHROPIC_API_KEY        # Anthropic API key
MAILERLITE_API_KEY       # MailerLite API key
SUPABASE_URL             # Supabase project URL
SUPABASE_ANON_KEY        # Supabase anon public key
```

> Never commit API keys to GitHub.

---

## Deployment

This project uses a two-branch deployment pipeline:

| Branch | Environment | URL |
|---|---|---|
| `main` | Production | `careertools.chancecreate.com` |
| `staging` | Staging | `staging--chancecreate-resume-agent.netlify.app` |

**Workflow:**
```
Changes → push to staging → test → merge to main → auto-deploys to production
```

Netlify auto-deploys on every push to `main`. Never push untested changes directly to main.

---

## Database Schema

**Supabase — two tables:**

`users` — email, name, created_at

`audits` — user_id, email, score, score_percent, issues (JSONB), ten_second_test, ats_notes, revised_resume, created_at

Row Level Security is enabled on both tables.

---

## Scoring System

| Score | Range | Meaning |
|---|---|---|
| 🔴 Needs Work | 30–59% | Needs significant rebuild |
| 🟡 Decent Foundation | 60–74% | Good bones, needs polish |
| 🟣 Strong | 75–89% | Nearly interview ready |
| 🟢 Recruiter Ready | 90–99% | Passes the 10-second scan |

Score is dynamic — penalized by critical issues (−4pts) and warnings (−2pts) within each range.

---

## About the Builder

**Ashley** — Founder of [Chance Create](https://chancecreate.com)

8+ years in Talent Acquisition at JPMorgan Chase, Intuit, and TD Bank. Currently completing a Mainframe Systems Programming Residency at DTCC through the Broadcom Vitality Program.

This tool exists because I spent years on the other side of the hiring process watching qualified people get filtered out before a human ever saw their name. I built the tool I wish existed when I was job searching.

> *"I built something today and I'm still processing that I did that."*

---

## Roadmap

- [x] V1 — Resume audit + rewrite + email capture
- [x] V2 — Supabase user accounts + audit history + dynamic scoring
- [ ] V3 — Job description matching + role discovery
- [ ] V4 — Proprietary research from aggregate audit data

---

## Links

- **Live tool:** https://careertools.chancecreate.com
- **Website:** https://chancecreate.com
- **Builder profile:** https://github.com/BuildWithChance

---

*Chance Create™ — Career Reinvention Tools*
*Built with 🖤 by a recruiter who crossed to the other side.*
