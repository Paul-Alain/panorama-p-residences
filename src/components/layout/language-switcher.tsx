import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { languages } from "@/lib/i18n/translations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSwitcher({ variant = "default" }: { variant?: "default" | "light" }) {
  const { lang, setLang } = useLanguage();
  const current = languages.find((l) => l.code === lang);
  const color =
    variant === "light"
      ? "text-primary-foreground/90 hover:text-primary-foreground"
      : "text-foreground/80 hover:text-foreground";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-sm font-medium transition-colors ${color}`}
      >
        <Globe className="h-4 w-4" />
        {current?.short}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {languages.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code)}
            className={l.code === lang ? "font-semibold text-gold" : ""}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
