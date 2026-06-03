import { Link } from "@tanstack/react-router";
import logoMark from "@/assets/logo-panorama-p.png.asset.json";

export function Logo({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "light";
}) {
  const text = variant === "light" ? "text-primary-foreground" : "text-foreground";
  const sub = variant === "light" ? "text-primary-foreground/70" : "text-muted-foreground";

  return (
    <Link to="/" className={`group flex items-center gap-2.5 ${className}`}>
      <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold shadow-gold transition-transform duration-300 group-hover:scale-105">
        <svg
          viewBox="0 0 32 32"
          className="h-6 w-6"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 22 L11 12 L16 18 L21 9 L29 22 Z"
            fill="oklch(0.25 0.015 60)"
            opacity="0.9"
          />
          <circle cx="24" cy="8" r="2.4" fill="oklch(0.99 0.01 85)" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className={`font-display text-xl font-semibold tracking-tight ${text}`}>
          Panorama <span className="text-gold">P</span>
        </span>
        <span className={`text-[0.62rem] font-medium uppercase tracking-[0.22em] ${sub}`}>
          Bafoussam
        </span>
      </span>
    </Link>
  );
}
