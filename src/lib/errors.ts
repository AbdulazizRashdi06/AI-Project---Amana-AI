import { ZodError } from "zod";

export function friendlyError(error: unknown, fallback = "Please try again."): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? fallback;
  }

  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message;

  if (message.includes("auth/invalid-credential")) {
    return "The email or password is not correct.";
  }

  if (message.includes("auth/user-not-found")) {
    return "No account exists for that email.";
  }

  if (message.includes("auth/email-already-in-use")) {
    return "An account already exists for that email.";
  }

  if (message.includes("auth/operation-not-allowed")) {
    return "Email/password sign-in is not enabled in Firebase Auth yet.";
  }

  if (message.includes("auth/configuration-not-found")) {
    return "Firebase Authentication is not enabled for this project yet. In Firebase Console, open Authentication, click Get started, and enable Email/Password sign-in.";
  }

  if (message.includes("storage") || message.includes("Firebase Storage")) {
    return "Firebase Storage is not set up yet. Remove photos and submit text-only for now, or open Firebase Console > Storage > Get started.";
  }

  if (message.includes("functions/not-found") || message.includes("not-found") || message.includes("internal")) {
    return "Cloud Functions are not deployed yet. Upgrade the Firebase project to Blaze, then deploy Functions so AI matching and chat actions can run.";
  }

  if (message.includes("Missing or insufficient permissions")) {
    return "Firebase rules blocked this action. Check the project rules and your account role.";
  }

  return message || fallback;
}
