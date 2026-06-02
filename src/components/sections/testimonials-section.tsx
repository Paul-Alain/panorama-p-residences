import { Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { useLanguage } from "@/lib/i18n/language-context";
import { testimonialsQuery, localized } from "@/lib/data";

export function TestimonialsSection() {
  const { t, lang } = useLanguage();
  const { data: testimonials = [] } = useQuery(testimonialsQuery);

  return (
    <section className="bg-secondary/40 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="★★★★★"
          title={t.testimonials.title}
          subtitle={t.testimonials.subtitle}
        />

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((review, i) => (
            <Reveal key={review.id} delay={i * 80}>
              <figure className="flex h-full flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
                <div className="flex gap-0.5">
                  {Array.from({ length: review.rating }).map((_, idx) => (
                    <Star key={idx} className="h-4 w-4 fill-gold text-gold" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground/80">
                  “{localized(review, "message", lang)}”
                </blockquote>
                <figcaption className="mt-5 border-t border-border/60 pt-4">
                  <p className="font-display text-lg font-semibold">{review.name}</p>
                  {review.location && (
                    <p className="text-xs text-muted-foreground">{review.location}</p>
                  )}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
