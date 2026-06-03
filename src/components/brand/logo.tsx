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
      <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-background shadow-gold transition-transform duration-300 group-hover:scale-105">
        <img
          src={logoMark.url}
          alt="Logo Panorama P Residence"
          className="h-9 w-9 object-contain"
        />
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
