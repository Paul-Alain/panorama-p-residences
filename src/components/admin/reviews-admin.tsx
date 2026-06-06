import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Star, Eye, EyeOff, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { opListReviews, opModerateReview } from "@/lib/review.functions";

export function ReviewsAdmin() {
  const qc          = useQueryClient();
  const runList     = useServerFn(opListReviews);
  const runModerate = useServerFn(opModerateReview);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn:  () => runList(),
    staleTime: 30_000,
  });

  const pending   = data.filter((r) => !r.published && !r.rejected);
  const published = data.filter((r) => r.published);
  const rejected  = data.filter((r) => r.rejected && !r.published);

  const moderate = async (id: string, action: "publish" | "unpublish") => {
    setBusyId(id);
    try {
      await runModerate({ data: { id, action } });
      await qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success(action === "publish" ? "Avis publié." : "Avis masqué.");
    } catch {
      toast.error("Erreur.");
    }
    setBusyId(null);
  };

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "long", year: "numeric",
    });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-gold" />;

  return (
    <div className="space-y-8">

      {/* En attente */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          En attente de modération
          <Badge variant="secondary">{pending.length}</Badge>
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun avis en attente.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <ReviewCard key={r.id} r={r} busyId={busyId}
                action="publish" onModerate={moderate} fmtDate={fmtDate} />
            ))}
          </div>
        )}
      </section>

      {/* Publiés */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          Publiés sur le site
          <Badge variant="secondary">{published.length}</Badge>
        </h2>
        {published.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun avis publié.</p>
        ) : (
          <div className="space-y-3">
            {published.map((r) => (
              <ReviewCard key={r.id} r={r} busyId={busyId}
                action="unpublish" onModerate={moderate} fmtDate={fmtDate} />
            ))}
          </div>
        )}
      </section>

      {/* Non publiés */}
      {rejected.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            Non publiés
            <Badge variant="secondary">{rejected.length}</Badge>
          </h2>
          <div className="space-y-3">
            {rejected.map((r) => (
              <ReviewCard key={r.id} r={r} busyId={busyId}
                action="publish" onModerate={moderate} fmtDate={fmtDate} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}

function ReviewCard({
  r, busyId, action, onModerate, fmtDate,
}: {
  r: any;
  busyId: string | null;
  action: "publish" | "unpublish";
  onModerate: (id: string, action: "publish" | "unpublish") => void;
  fmtDate: (s: string) => string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-amber-500">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i}
                className={`h-4 w-4 ${i < r.rating ? "fill-current" : "text-muted-foreground/20"}`} />
            ))}
            <span className="ml-1 text-xs font-semibold text-amber-700">{r.rating}/5</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {(r as any).guest_name} · {fmtDate((r as any).created_at)}
          </p>
        </div>
        <Button
          size="sm"
          variant={action === "publish" ? "gold" : "outline"}
          disabled={busyId === r.id}
          onClick={() => onModerate(r.id, action)}
        >
          {busyId === r.id
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : action === "publish"
              ? <><Eye className="h-4 w-4" /> Publier</>
              : <><EyeOff className="h-4 w-4" /> Masquer</>}
        </Button>
      </div>
      <p className="mt-3 text-sm leading-relaxed">{(r as any).comment || "—"}</p>
    </div>
  );
}
