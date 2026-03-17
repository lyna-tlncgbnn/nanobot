import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  children,
}: {
  className?: string;
  variant?: "default" | "secondary";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.18em]",
        variant === "default"
          ? "border border-[rgba(180,106,44,0.22)] bg-[rgba(180,106,44,0.10)] text-accent"
          : "border border-border bg-panel-strong text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
