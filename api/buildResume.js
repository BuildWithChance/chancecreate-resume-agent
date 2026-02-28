const {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  BorderStyle, LevelFormat
} = require('docx');

function sectionHeader(text) {
  return new Paragraph({
    spacing: { before: 180, after: 60 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 8, color: "4B3F72", space: 2 }
    },
    children: [new TextRun({
      text: text.toUpperCase(),
      bold: true, size: 22, font: "Calibri", color: "4B3F72"
    })]
  });
}

function spacer() {
  return new Paragraph({ spacing: { before: 60, after: 0 }, children: [new TextRun("")] });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const resume = req.body;
    const children = [];

    // ── NAME ──
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({
        text: (resume.name || "").toUpperCase(),
        bold: true, size: 36, font: "Calibri", color: "1A1A1A"
      })]
    }));

    // ── CONTACT ──
    if (resume.contact) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [new TextRun({
          text: resume.contact, size: 19, font: "Calibri", color: "444444"
        })]
      }));
    }

    // ── SUMMARY ──
    if (resume.summary) {
      children.push(sectionHeader("Professional Summary"));
      children.push(new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [new TextRun({ text: resume.summary, size: 20, font: "Calibri" })]
      }));
    }

    // ── SECTIONS ──
    const numbering = {
      config: [{
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 480, hanging: 240 } } }
        }]
      }]
    };

    (resume.sections || []).forEach(function(section) {
      children.push(sectionHeader(section.title));

      // Prose section (Skills etc)
      if (section.prose) {
        children.push(new Paragraph({
          spacing: { before: 60, after: 60 },
          children: [new TextRun({ text: section.prose, size: 19, font: "Calibri" })]
        }));
      }

      // Entries (Experience, Education etc)
      (section.entries || []).forEach(function(entry) {
        // Title line
        children.push(new Paragraph({
          spacing: { before: 140, after: 20 },
          children: [
            new TextRun({ text: entry.title || "", bold: true, size: 22, font: "Calibri" }),
            entry.location ? new TextRun({ text: "  |  " + entry.location, size: 20, font: "Calibri", color: "666666" }) : new TextRun("")
          ]
        }));
        // Org + dates line
        children.push(new Paragraph({
          spacing: { before: 0, after: 40 },
          children: [
            new TextRun({ text: entry.org || "", bold: true, size: 20, font: "Calibri", color: "4B3F72" }),
            entry.dates ? new TextRun({ text: "   " + entry.dates, size: 19, font: "Calibri", color: "666666" }) : new TextRun("")
          ]
        }));
        // Bullets
        (entry.bullets || []).forEach(function(b) {
          children.push(new Paragraph({
            numbering: { reference: "bullets", level: 0 },
            spacing: { before: 20, after: 20 },
            children: [new TextRun({ text: b, size: 20, font: "Calibri" })]
          }));
        });
        // Prose for education entries with no bullets
        if (entry.prose) {
          children.push(new Paragraph({
            spacing: { before: 20, after: 20 },
            children: [new TextRun({ text: entry.prose, size: 19, font: "Calibri", color: "555555" })]
          }));
        }
      });
    });

    const doc = new Document({
      numbering,
      sections: [{
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 864, right: 1008, bottom: 864, left: 1008 }
          }
        },
        children
      }]
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", 'attachment; filename="rewritten_resume.docx"');
    return res.status(200).send(buffer);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
