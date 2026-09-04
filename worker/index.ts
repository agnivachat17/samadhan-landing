export interface Env {
  ASSETS: Fetcher;
  SMTP_HOST?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  RESEND_API_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle invite email — try Gmail SMTP via Nodemailer (Node compat), fallback to MailChannels
    if (url.pathname === "/api/send-invite" && request.method === "POST") {
      try {
        const { to, subject, html, inviteLink, organizationName, memberRole } =
          (await request.json()) as {
            to: string;
            subject: string;
            html: string;
            inviteLink?: string;
            organizationName?: string;
            memberRole?: string;
          };

        if (!to || !subject || !html) {
          return new Response(
            JSON.stringify({ error: "Missing to/subject/html" }),
            {
              status: 400,
              headers: {
                "content-type": "application/json",
                "access-control-allow-origin": "*",
              },
            }
          );
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
          return new Response(
            JSON.stringify({ error: "Invalid recipient email" }),
            {
              status: 400,
              headers: {
                "content-type": "application/json",
                "access-control-allow-origin": "*",
              },
            }
          );
        }

        // 1) Resend HTTP API — actually works on Workers (no TCP needed)
        const resendKey = (env as any).RESEND_API_KEY as string | undefined;
        if (resendKey) {
          try {
            const resendRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Samadhan — Government of Jharkhand <onboarding@resend.dev>",
                to: [to],
                subject,
                html,
                reply_to: ["ankanmondal9280@gmail.com"],
              }),
            });
            const resendText = await resendRes.text();
            if (resendRes.ok) {
              return new Response(JSON.stringify({ ok: true, via: "resend", id: resendText.slice(0, 200) }), {
                headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
              });
            }
            console.warn("Resend failed", resendRes.status, resendText.slice(0, 500));
            // Resend test mode 403 — only allows onboarding@resend.dev → your own ankan9353@gmail.com until you verify a domain at resend.com/domains
            if (resendRes.status === 403 && resendText.includes("verify a domain")) {
              return new Response(JSON.stringify({ ok: true, via: "link-only", warning: `Resend test limit: verify a domain at resend.com/domains to email ${to}. Invite link is valid: ${inviteLink}`, resendBody: resendText.slice(0, 500) }), {
                headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
              });
            }
            // fall through to SMTP/MailChannels
          } catch (re: any) {
            console.warn("Resend error", re?.message?.slice(0, 200));
          }
        }

        // 2) Gmail SMTP via Nodemailer (works locally, unreliable on edge — kept as fallback)
        const smtpHost = (env as any).SMTP_HOST || "smtp.gmail.com";
        const smtpUser = (env as any).SMTP_USER || "ankanmondal9280@gmail.com";
        const smtpPass = (env as any).SMTP_PASS || "yxrqrsordfckhffs";
        try {
          const nodemailer = await import("nodemailer");
          const transporter = (nodemailer as any).createTransport({
            host: smtpHost,
            port: 587,
            secure: false,
            auth: { user: smtpUser, pass: smtpPass },
            tls: { rejectUnauthorized: false },
          });
          await transporter.sendMail({
            from: `"Samadhan — Government of Jharkhand" <${smtpUser}>`,
            to,
            subject,
            html,
            replyTo: smtpUser,
          });
          return new Response(JSON.stringify({ ok: true, via: "gmail-smtp" }), {
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*",
            },
          });
        } catch (smtpErr: any) {
          console.warn("Gmail SMTP failed, falling back to MailChannels", smtpErr?.message?.slice(0, 200));
          // Fallback to MailChannels (may 401 if not whitelisted, but we try)
          const mailRes = await fetch("https://api.mailchannels.net/tx/v1/send", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: to, name: memberRole ?? "Member" }] }],
              from: { email: "noreply@samadhan.app", name: "Samadhan — Government of Jharkhand" },
              reply_to: { email: smtpUser, name: "Samadhan Support" },
              subject,
              content: [{ type: "text/html", value: html }],
            }),
          });
          const mailText = await mailRes.text();
          if (!mailRes.ok) {
            console.error("MailChannels also failed", mailRes.status, mailText);
            // Still return 200 with link, so UI can show manual copy — email is best-effort
            return new Response(
              JSON.stringify({ ok: true, via: "link-only", warning: `Email not sent (${mailRes.status}), but link is valid: ${inviteLink}` }),
              {
                headers: {
                  "content-type": "application/json",
                  "access-control-allow-origin": "*",
                },
              }
            );
          }
          return new Response(JSON.stringify({ ok: true, via: "mailchannels" }), {
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*",
            },
          });
        }
      } catch (e: any) {
        return new Response(
          JSON.stringify({ error: e?.message ?? "Unknown error" }),
          {
            status: 500,
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*",
            },
          }
        );
      }
    }

    if (url.pathname === "/api/send-invite" && request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type",
        },
      });
    }

    // Fallback to static assets (SPA)
    // @ts-ignore — env.ASSETS is provided by Wrangler assets binding
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not found", { status: 404 });
  },
} as ExportedHandler<Env>;
