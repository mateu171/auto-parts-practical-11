export interface PartFoundEmailData {
  vinCode: string;
  partTitle: string;
  oemCode: string;
  carLabel: string;
  condition: string;
  price: number;
  managerComment?: string;
  buttonUrl: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function renderPartFoundEmail(data: PartFoundEmailData): string {
  const row = (label: string, value: string) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${label}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:600;">${escapeHtml(value)}</td>
        </tr>`;

  const comment = data.managerComment
    ? `<p style="margin:20px 0 0;padding:12px 14px;background:#f3f4f6;border-left:4px solid #f59e0b;border-radius:4px;color:#374151;">
         <strong>Коментар менеджера:</strong><br>${escapeHtml(data.managerComment)}
       </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Запчастину підібрано</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
               style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:#111827;padding:20px 24px;color:#ffffff;font-size:22px;font-weight:700;">
              &#9881; AutoParts <span style="color:#f59e0b;">Store</span>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <h1 style="margin:0 0 8px;font-size:20px;color:#111827;">Сумісну запчастину підібрано!</h1>
              <p style="margin:0 0 20px;color:#4b5563;line-height:1.5;">
                Менеджер опрацював ваш запит за VIN-кодом
                <strong>${escapeHtml(data.vinCode)}</strong> та підібрав відповідну деталь.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                     style="border:1px solid #e5e7eb;border-radius:6px;border-collapse:separate;">
                ${row('Деталь', data.partTitle)}
                ${row('OEM-код', data.oemCode)}
                ${row('Автомобіль', data.carLabel)}
                ${row('Стан', data.condition)}
                ${row('Ціна', `${data.price.toFixed(2)} грн`)}
              </table>
              ${comment}
              <p style="text-align:center;margin:28px 0 8px;">
                <a href="${escapeHtml(data.buttonUrl)}"
                   style="display:inline-block;background:#f59e0b;color:#111827;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:6px;">
                  Переглянути запчастину
                </a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#f9fafb;color:#9ca3af;font-size:12px;text-align:center;">
              Це автоматичне повідомлення, відповідати на нього не потрібно.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
