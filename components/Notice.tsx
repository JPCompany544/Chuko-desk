export function Notice({
  tone,
  children,
}: {
  tone: "ok" | "error" | "neutral";
  children: string;
}) {
  return <p className={`notice ${tone === "neutral" ? "" : tone}`}>{children}</p>;
}
