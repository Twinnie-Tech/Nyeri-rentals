export function buildOtpEmail(params: {
  code: string;
  expiresInSeconds: number;
  brandName?: string;
  appUrl?: string;
}) {
  const brand = params.brandName || "GreenKey Realty";
  const minutes = Math.max(1, Math.round(params.expiresInSeconds / 60));
  const subject = `One time ${brand} verification code`;

  const text = [
    `Your ${brand} verification code is: ${params.code}`,
    "",
    `This code expires in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    "If you did not request this code, you can ignore this email.",
    params.appUrl ? `Sign in: ${params.appUrl}/sign-in` : "",
  ]
    .filter(Boolean)
    .join("\n");

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
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:600;">Your verification code</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#3d4a45;">
                Use this one-time code to sign in. It expires in <strong>${minutes} minute${minutes === 1 ? "" : "s"}</strong>.
              </p>
              <p style="margin:0 0 28px;text-align:center;">
                <span style="display:inline-block;font-size:32px;letter-spacing:0.35em;font-weight:700;color:#1a2420;background:#eef5f1;border-radius:12px;padding:16px 20px 16px 28px;">
                  ${params.code}
                </span>
              </p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7a74;">
                If you did not request this email, you can safely ignore it.
              </p>
              <p style="margin:0;text-align:center;font-size:13px;line-height:1.5;color:#6b7a74;">
                2026 © GreenKey Realty
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
