/**
 * Reusable avatar circle.
 * Shows uploaded image when available, otherwise renders coloured initials.
 */

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-2xl",
} as const;

type AvatarSize = keyof typeof SIZE_CLASSES;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

type Props = {
  src?: string | null;
  name: string;
  size?: AvatarSize;
  className?: string;
};

export function UserAvatar({ src, name, size = "md", className = "" }: Props) {
  const ring = SIZE_CLASSES[size];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${name}'s avatar`}
        className={`${ring} shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-slate-900 ${className}`}
      />
    );
  }

  return (
    <span
      aria-label={`${name}'s avatar`}
      className={`${ring} inline-flex shrink-0 items-center justify-center rounded-full bg-accent font-bold text-white ${className}`}
    >
      {getInitials(name || "?")}
    </span>
  );
}
