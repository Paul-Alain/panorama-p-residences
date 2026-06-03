import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Star, Check, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/language-context";
import { stripReviewMeta } from "@/lib/data";
import { adminListReviewsFull, adminModerateReview } from "@/lib/admin.functions";

interface Review {
  id: string;
  name: string;
  location: string | null;
  rating: number;
  message_fr: string;
  sort_order: number;
  created_at: string;
  user_id: string | null;
}

export function ReviewsAdmin() {
  const { t, lang } = useLanguage();
  const d = t.admin.dash;
  const qc = useQueryClient();
  const runList = useServerFn(adminListReviewsFull);
  const runModerate = useServerFn(adminModerateReview);
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => (await runList()) as Review[],
  });

  const { pending, approved } = useMemo(
    () => ({
      pending: data.filter((r) => r.sort_order < 0),
      approved: data.filter((r) => r.sort_order >= 0),
    }),
    [data],
  );

  const moderate = async (id: string, action: "approve" | "hide") => {
    setSavingId(id);
    try {
      await runModerate({ data: { id, action } });
      await qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      await qc.invalidateQueries({ queryKey: ["admin-stats"] });
      await qc.invalidateQueries({ queryKey: ["testimonials"] });
      toast.success(action === "approve" ? d.reviews.approve : d.reviews.hide);
    } catch {
      toast.error("Erreur");
    }
    setSavingId(null);
  };

  const fmtDate = (s: string) => {
    const dt = new Date(s);
    return Number.isNaN(dt.getTime()) ? s : dt.toLocaleDateString(lang);
  };

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-gold" />;
  if (data.length === 0)
    return <p className="text-muted-foreground">{d.reviews.empty}</p>;

  const Card = ({ r, action }: { r: Review; action: "approve" | "hide" }) => (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-gold">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${i < r.rating ? "fill-current" : "text-muted-foreground/30"}`}
            />
          ))}
        </div>
        <Button
          variant={action === "approve" ? "gold" : "outline"}
          size="sm"
          disabled={savingId === r.id}
          onClick={() => moderate(r.id, action)}
        >
          {savingId === r.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : action === "approve" ? (
            <Check className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
          {action === "approve" ? d.reviews.approve : d.reviews.hide}
        </Button>
      </div>
      <p className="mt-2 whitespace-pre-line text-sm">{stripReviewMeta(r.message_fr) || "—"}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {d.reviews.by} {r.name}
        {r.location ? ` · ${r.location}` : ""} · {d.reviews.on} {fmtDate(r.created_at)}
      </p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          {d.reviews.pending}
          <Badge variant="secondary">{pending.length}</Badge>
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">{d.reviews.none}</p>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <Card key={r.id} r={r} action="approve" />
            ))}
          </div>
        )}
      </div>
      <div>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          {d.reviews.approved}
          <Badge variant="secondary">{approved.length}</Badge>
        </h2>
        {approved.length === 0 ? (
          <p className="text-sm text-muted-foreground">{d.reviews.none}</p>
        ) : (
          <div className="space-y-3">
            {approved.map((r) => (
              <Card key={r.id} r={r} action="hide" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
