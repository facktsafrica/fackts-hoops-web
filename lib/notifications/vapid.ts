import webpush from "web-push";

const DEFAULT_VAPID_SUBJECT = "mailto:facktsafrica@gmail.com";

type VapidEnvironment = Record<string, string | undefined>;

function validVapidSubject(value: string | undefined) {
  const candidate = value?.trim();
  if (!candidate) return DEFAULT_VAPID_SUBJECT;

  try {
    const url = new URL(candidate);
    if (url.protocol === "https:") return candidate;
    if (url.protocol === "mailto:" && url.pathname.includes("@")) {
      return candidate;
    }
  } catch {
    // A bad optional subject must not disable otherwise valid push keys.
  }

  return DEFAULT_VAPID_SUBJECT;
}

export function resolveVapidConfiguration(
  environment: VapidEnvironment = process.env
) {
  const publicKey =
    environment.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "";
  const privateKey = environment.VAPID_PRIVATE_KEY?.trim() || "";

  if (!publicKey || !privateKey) {
    return {
      configuration: null,
      issue: "VAPID keys are missing.",
    };
  }

  const configuration = {
    publicKey,
    privateKey,
    subject: validVapidSubject(environment.VAPID_SUBJECT),
  };

  try {
    webpush.setVapidDetails(
      configuration.subject,
      configuration.publicKey,
      configuration.privateKey
    );
    return { configuration, issue: null };
  } catch {
    return {
      configuration: null,
      issue: "The configured VAPID keys are invalid.",
    };
  }
}
