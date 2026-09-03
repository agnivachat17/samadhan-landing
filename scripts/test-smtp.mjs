import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.VITE_SMTP_HOST || process.env.SMTP_HOST || "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.VITE_SMTP_USER || "ankanmondal9280@gmail.com",
    pass: process.env.VITE_SMTP_PASS || "yxrqrsordfckhffs",
  },
});

console.log("Testing SMTP with:", {
  host: transporter.options.host,
  user: transporter.options.auth.user,
  pass: transporter.options.auth.pass
    ? "***" + transporter.options.auth.pass.slice(-4)
    : "missing",
});

transporter.verify((err, success) => {
  console.log("verify:", err ? err.message : "ok", success);
  if (err) {
    console.error(err);
    process.exit(1);
  }
  transporter.sendMail(
    {
      from: '"Samadhan" <ankanmondal9280@gmail.com>',
      to: "ankanmondal9280@gmail.com",
      subject: "Samadhan SMTP test — " + new Date().toISOString(),
      html: "<p>This is a test from Samadhan. If you get this, SMTP works.</p><p>Invite link: https://example.com/signup?invite=test123</p>",
    },
    (e, info) => {
      console.log("send:", e ? e.message : "sent", info ? info.messageId : "");
      if (e) console.error(e);
      process.exit(e ? 1 : 0);
    }
  );
});
