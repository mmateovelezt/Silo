type SimpleStatus = "connected" | "connecting" | "disconnected" | "error";

interface Props {
  status: SimpleStatus;
}

const STATUS_COLORS: Record<
  SimpleStatus,
  { dot: string; ring: string; text: string; label: string }
> = {
  connected: {
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/30",
    text: "text-emerald-400",
    label: "Listening",
  },
  error: {
    dot: "bg-amber-500",
    ring: "ring-amber-500/30",
    text: "text-amber-400",
    label: "Something went wrong",
  },
  disconnected: {
    dot: "bg-rose-500",
    ring: "ring-rose-500/30",
    text: "text-rose-400",
    label: "Ready to listen",
  },
  connecting: {
    dot: "bg-zinc-400",
    ring: "ring-zinc-400/30",
    text: "text-zinc-400",
    label: "Getting ready...",
  },
};

export function ConnectionStatusIndicator({ status }: Props) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.disconnected;
  const shouldPulse = status === "connected" || status === "connecting";

  return (
    <div className="relative" style={{ WebkitAppRegion: "no-drag" } as any}>
      <div
        className={`
          group flex items-center gap-1.5 px-2 py-1 rounded-md
          bg-zinc-900/60 border border-zinc-800 
        `}
        title={colors.label}
      >
        <span className="relative flex h-2 w-2">
          {shouldPulse && (
            <span
              className={`absolute inset-0 rounded-full ${colors.dot} opacity-40 animate-ping`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${colors.dot} ring-2 ${colors.ring}`}
          />
        </span>
        <span
          className={`text-[10px] font-bold uppercase tracking-wide ${colors.text} hidden sm:inline`}
        >
          {colors.label}
        </span>
      </div>
    </div>
  );
}
