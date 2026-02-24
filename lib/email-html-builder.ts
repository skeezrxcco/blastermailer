import type { TemplateEditorData, TemplateOption } from "@/components/shared/newsletter/template-data"
import type { EditorThemeState } from "@/app/chat/chat-page.types"

/**
 * Renders template data into a standalone email-safe HTML string.
 * Uses inline styles for maximum email client compatibility.
 */
export function buildEmailHtml(
  template: TemplateOption,
  data: TemplateEditorData,
  theme?: EditorThemeState | null,
): string {
  const accentA = theme?.accentA ?? template.accentA
  const accentB = theme?.accentB ?? template.accentB
  const surface = theme?.surface ?? template.surface
  const ctaBg = theme?.ctaBg ?? template.ctaBg
  const ctaText = theme?.ctaText ?? template.ctaText
  const dishOneImage = theme?.dishOneImage ?? template.dishOneImage
  const dishTwoImage = theme?.dishTwoImage ?? template.dishTwoImage

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.subjectLine || data.headline)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#18181b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#18181b;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;border-radius:26px;overflow:hidden;background-color:#fafafa;">
          <!-- Hero -->
          <tr>
            <td style="position:relative;height:290px;background-image:url('${escapeAttr(data.heroImage)}');background-size:cover;background-position:center;">
              <!--[if mso]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:640px;height:290px;"><v:fill type="frame" src="${escapeAttr(data.heroImage)}" /><v:textbox inset="0,0,0,0"><![endif]-->
              <div style="background:linear-gradient(125deg,${accentA}dd 0%,${accentB}88 52%,rgba(0,0,0,0.44) 100%);padding:0;height:290px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="height:290px;">
                  <tr>
                    <td valign="bottom" style="padding:20px;">
                      <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">${escapeHtml(data.preheader)}</p>
                      <h1 style="margin:8px 0 0;font-size:28px;font-weight:600;line-height:1.2;color:#ffffff;">${escapeHtml(data.headline)}</h1>
                      <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.9);max-width:560px;">${escapeHtml(data.subheadline)}</p>
                    </td>
                  </tr>
                </table>
              </div>
              <!--[if mso]></v:textbox></v:rect><![endif]-->
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:${surface};padding:24px 20px;">
              <!-- Brand row -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:20px;font-weight:600;color:#18181b;">${escapeHtml(data.restaurantName)}</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#52525b;">${escapeHtml(data.subjectLine)}</p>
                  </td>
                  <td align="right" valign="top">
                    <span style="display:inline-block;background-color:rgba(255,255,255,0.8);border-radius:20px;padding:4px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#3f3f46;">${escapeHtml(template.theme)}</span>
                  </td>
                </tr>
              </table>

              <!-- Offer card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td style="background-color:rgba(255,255,255,0.75);border-radius:16px;padding:16px;">
                    <h2 style="margin:0;font-size:18px;font-weight:600;color:#18181b;">${escapeHtml(data.offerTitle)}</h2>
                    <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#52525b;">${escapeHtml(data.offerDescription)}</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                      <tr>
                        <td style="background-color:${ctaBg};border-radius:12px;padding:10px 20px;">
                          <a href="#" style="font-size:14px;font-weight:600;color:${ctaText};text-decoration:none;display:inline-block;">${escapeHtml(data.ctaText)}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Feature cards -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td width="48%" valign="top" style="background-color:#ffffff;border-radius:16px;overflow:hidden;">
                    <img src="${escapeAttr(dishOneImage)}" alt="${escapeAttr(data.dishOneTitle)}" width="300" style="width:100%;height:128px;object-fit:cover;display:block;">
                    <div style="padding:12px;">
                      <p style="margin:0;font-size:14px;font-weight:600;color:#18181b;">${escapeHtml(data.dishOneTitle)}</p>
                      <p style="margin:4px 0 0;font-size:12px;line-height:1.5;color:#52525b;">${escapeHtml(data.dishOneDescription)}</p>
                    </div>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" valign="top" style="background-color:#ffffff;border-radius:16px;overflow:hidden;">
                    <img src="${escapeAttr(dishTwoImage)}" alt="${escapeAttr(data.dishTwoTitle)}" width="300" style="width:100%;height:128px;object-fit:cover;display:block;">
                    <div style="padding:12px;">
                      <p style="margin:0;font-size:14px;font-weight:600;color:#18181b;">${escapeHtml(data.dishTwoTitle)}</p>
                      <p style="margin:4px 0 0;font-size:12px;line-height:1.5;color:#52525b;">${escapeHtml(data.dishTwoDescription)}</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#ffffff;padding:16px 20px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#71717a;">${escapeHtml(data.footerNote)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
