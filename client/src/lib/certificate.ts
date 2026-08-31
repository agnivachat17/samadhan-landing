/**
 * USP-06: Certificate generation using lazy-loaded jsPDF + qrcode.
 *
 * Generates a landscape A4 PDF certificate with:
 * - Samadhan + Govt of Jharkhand header
 * - Project title, institution, team, lead
 * - Credits awarded
 * - QR code linking to USP-03 ledger anchor root
 *
 * Lazy imports keep jspdf (~80KB) + qrcode (~20KB) out of main bundle.
 */

export type CertificateInput = {
  projectTitle: string;
  institutionName: string;
  team: string[];
  leadName: string;
  credits: number;
  anchorRoot: string;
  date: Date;
};

export async function generateCertificate(
  input: CertificateInput
): Promise<string> {
  const [{ jsPDF }, QRCode] = await Promise.all([
    import("jspdf"),
    import("qrcode"),
  ]);

  const doc = new jsPDF({ orientation: "landscape", format: "a4" });

  // Background — paper grain color
  doc.setFillColor(241, 234, 220);
  doc.rect(0, 0, 297, 210, "F");

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(12, 48, 33);
  doc.text("SAMADHAN", 15, 25);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(82, 103, 93);
  doc.text("Government of Jharkhand  ·  Civic Innovation Platform", 15, 33);

  // Decorative line
  doc.setDrawColor(201, 74, 32);
  doc.setLineWidth(0.8);
  doc.line(15, 37, 280, 37);

  // Project title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(12, 48, 33);
  const titleLines = doc.splitTextToSize(input.projectTitle, 200);
  doc.text(titleLines, 15, 50);

  // Institution + Lead
  const afterTitle = 50 + titleLines.length * 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(
    `Institution: ${input.institutionName}   ·   Lead: ${input.leadName}`,
    15,
    afterTitle + 8
  );

  // Team
  doc.text(`Team: ${input.team.join(", ")}`, 15, afterTitle + 16);

  // Credits badge
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(201, 74, 32);
  doc.text(`${input.credits} credits awarded`, 15, afterTitle + 30);

  // Date + anchor info
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Date: ${input.date.toLocaleDateString("en-IN")}   ·   Ledger anchor: ${input.anchorRoot.slice(0, 32)}…`,
    15,
    afterTitle + 40
  );

  // QR code — bottom right
  const qrDataUrl = await QRCode.toDataURL(input.anchorRoot, {
    margin: 1,
    width: 120,
    color: { dark: "#0c3021", light: "#f1eadc" },
  });
  doc.addImage(qrDataUrl, "PNG", 248, 150, 35, 35);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("Scan to verify ledger root", 248, 190);

  // Footer
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(15, 195, 280, 195);
  doc.setFontSize(7);
  doc.text(
    "This certificate is verifiable via the Samadhan hash-anchored ledger.",
    15,
    200
  );
  doc.text("samadhan-sih.web.app", 15, 205);

  return doc.output("dataurlstring");
}
