import type { FieldError } from "@/lib/types";

export function explainFailure(message: string, errors: FieldError[] = []): string {
  const details = [...new Set(errors.flatMap((error) => (error.message ? [error.message] : [])))];
  const summary = message.trim();
  if (details.length === 0) return summary || "Request failed.";
  if (!summary || summary.toLowerCase() === "validation errors") return details.join(". ");
  if (details.every((detail) => summary.includes(detail))) return summary;
  return `${summary}. ${details.join(". ")}`;
}
