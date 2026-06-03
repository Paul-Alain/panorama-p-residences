import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, User, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/lib/i18n/language-context";
import { useAdminStatus } from "@/lib/use-admin-status";

export function Header() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const { location } = useRouterState();
  const { isAdmin } = useAdminStatus();

  const links = [
    { to: "/", label: t.nav.home },
    { to: "/a-propos", label: t.nav.about },
    { to: "/logements", label: t.nav.logements },
    { to: "/galerie", label: t.nav.gallery },
    { to: "/localisation", label: t.nav.location },
    { to: "/temoignages", label: t.nav.testimonials },
    { to: "/contact", label: t.nav.contact },
  ] as const;

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "text-gold"
                    : "text-foreground/75 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex"
            aria-label={t.account.nav}
            title={t.account.nav}
          >
            <Link to="/mon-espace">
              <User className="h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="gold" size="sm" className="hidden sm:inline-flex">
            <Link to="/reservation">{t.nav.book}</Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="mt-6 flex flex-col gap-1">
                {links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-base font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  to="/mon-espace"
                  onClick={() => setOpen(false)}
                  className="mt-1 inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-base font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <User className="h-4 w-4" /> {t.account.nav}
                </Link>
                <Button asChild variant="gold" className="mt-3">
                  <Link to="/reservation" onClick={() => setOpen(false)}>
                    {t.nav.book}
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
