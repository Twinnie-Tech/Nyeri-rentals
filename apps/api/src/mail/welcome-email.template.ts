export function buildWelcomeEmail(params: {
  name?: string | null;
  brandName?: string;
  appUrl?: string;
}) {
  const brand = params.brandName || "GreenKey Realty";
  const appUrl = params.appUrl || "http://localhost:3000";
  const greeting = params.name?.trim()
    ? `Welcome, ${params.name.trim()}`
    : "Welcome aboard";
  const subject = `Welcome to ${brand}`;

  const text = [
    `${greeting}!`,
    "",
    `Thanks for joining ${brand}. You're all set to explore listings, save favourites, and connect with agents across Kenya.`,
    "",
    `Get started: ${appUrl}`,
    `Complete your profile: ${appUrl}/onboarding`,
    "",
    "If you did not create this account, please contact us.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3f7f5;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a2420;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f7f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #dce6e1;">
          <tr>
            <td>
              <p style="margin:0 0 8px;font-size:14px;color:#5a6b64;letter-spacing:0.04em;text-transform:uppercase;">${brand}</p>
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:600;">${greeting}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4a45;">
                Thanks for joining ${brand}. You're all set to explore listings, save favourites, and connect with agents across Kenya.
              </p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.5;color:#3d4a45;">
                Finish setting up your profile so we can personalise your experience.
              </p>
              <p style="margin:0 0 28px;text-align:center;">
                <a href="${appUrl}/onboarding" style="display:inline-block;background:#1f6b4a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:10px;padding:12px 22px;">
                  Complete your profile
                </a>
              </p>
              <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#6b7a74;">
                Or browse homes anytime at <a href="${appUrl}" style="color:#1f6b4a;">${appUrl.replace(/^https?:\/\//, "")}</a>
              </p>
              <p style="margin:24px 0 0;text-align:center;font-size:13px;line-height:1.5;color:#6b7a74;">
                2026 © ${brand}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
