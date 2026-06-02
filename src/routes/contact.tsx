import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ContactForm } from "@/components/forms/contact-form";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-context";
import { siteConfig, whatsappLink } from "@/lib/site-config";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact – Panorama P à Bafoussam" },
      {
        name: "description",
        content:
          "Contactez la résidence Panorama P à Bafoussam par formulaire, WhatsApp, email ou téléphone.",
      },
      { property: "og:title", content: "Contact – Panorama P" },
      { property: "og:description", content: "Écrivez-nous, nous répondons rapidement." },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { t } = useLanguage();

  return (
    <>
      <PageHeader title={t.contact.title} subtitle={t.contact.subtitle} />

      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-3xl border border-border/60 bg-card p-7 shadow-soft sm:p-9">
            <ContactForm />
          </div>

          <div className="space-y-6">
            <h2 className="font-display text-2xl font-semibold">{t.contact.info}</h2>
            <div className="space-y-4">
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-soft transition-colors hover:border-gold"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#1da851]">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                    {t.contact.whatsapp}
                  </span>
                  <span className="font-medium">{siteConfig.phoneDisplay}</span>
                </span>
              </a>

              <a
                href={`mailto:${siteConfig.email}`}
                className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-soft transition-colors hover:border-gold"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15 text-gold">
                  <Mail className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                    {t.contact.emailLabel}
                  </span>
                  <span className="font-medium">{siteConfig.email}</span>
                </span>
              </a>

              <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15 text-gold">
                  <MapPin className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                    {t.contact.addressLabel}
                  </span>
                  <span className="font-medium">{siteConfig.address}</span>
                </span>
              </div>
            </div>

            <Button asChild variant="gold" size="lg" className="w-full">
              <a href={whatsappLink()} target="_blank" rel="noreferrer">
                <Phone className="h-4 w-4" />
                {t.contact.whatsapp}
              </a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
