const axios = require("axios");

const BREVO_API_KEY = process.env.BREVO_API_KEY;

async function sendEmail({ toEmail, subject, htmlContent, toName = "User" }) {
  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          email: "saidazim186@gmail.com",
          name: "OrbiTest company",
        },
        to: [
          {
            email: toEmail,
            name: toName,
          },
        ],
        subject,
        htmlContent,
      },
      {
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 5000,
      }
    );

    return response.data;
  } catch (err) {
    if (err.response) {
      console.error("Brevo API error:", err.response.data);
    } else {
      console.error("Request error:", err.message);
    }
    throw err;
  }
}

function registrationEmailTemplate({ firstName, lastName }) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>Регистрация OrbiTest</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" style="background:#ffffff; border-radius:8px; overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:24px;">
              <img
                src="https://your-domain.com/orbitest-logo.png"
                alt="OrbiTest"
                width="140"
                style="display:block; margin-bottom:16px;"
              />
              <h1 style="margin:0; font-size:22px; color:#1f2937;">
                Добро пожаловать в OrbiTest 🎉
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:0 32px 32px; color:#374151; font-size:15px; line-height:1.6;">
              <p>
                Здравствуйте${fullName ? `, <strong>${fullName}</strong>` : ""}!
              </p>

              <p>
                Вы успешно зарегистрировались в системе <strong>OrbiTest</strong>.
                Теперь вы можете пользоваться всеми возможностями платформы.
              </p>

              <p>
                Если вы не регистрировались — просто проигнорируйте это письмо.
              </p>

              <p style="margin-top:24px;">
                С уважением,<br />
                <strong>Команда OrbiTest</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background:#f9fafb; padding:16px; font-size:12px; color:#6b7280;">
              © ${new Date().getFullYear()} OrbiTest. Все права защищены.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

module.exports = { sendEmail, registrationEmailTemplate };
