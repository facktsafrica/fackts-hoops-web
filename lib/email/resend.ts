type SendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

type ResendErrorPayload = {
  message?: string;
  error?: string | { message?: string };
};

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function resendErrorMessage(result: ResendErrorPayload) {
  if (typeof result.message === "string") return result.message;
  if (typeof result.error === "string") return result.error;
  if (typeof result.error?.message === "string") return result.error.message;
  return "Resend rejected the email request.";
}

export function getEmailConfiguration() {
  return {
    apiKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.EMAIL_FROM ?? "",
    adminEmail: process.env.FACKTS_ADMIN_EMAIL ?? "",
  };
}

export async function sendResendEmail(input: SendEmailInput) {
  const { apiKey, from } = getEmailConfiguration();

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  if (!from) {
    throw new Error(
      "EMAIL_FROM is not configured. Use an address on the verified Resend domain."
    );
  }

  const recipients = (Array.isArray(input.to) ? input.to : [input.to])
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes("@"));

  if (recipients.length === 0) {
    throw new Error("No valid email recipient was provided.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject: input.subject,
      text: input.text,
      html: input.html,
      reply_to: input.replyTo,
    }),
  });

  const result = (await response.json().catch(() => ({}))) as ResendErrorPayload & {
    id?: string;
  };

  if (!response.ok) {
    throw new Error(resendErrorMessage(result));
  }

  return result;
}
