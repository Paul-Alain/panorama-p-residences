import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Star, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/logo";
import { opGetReviewToken, opSubmitReview } from "@/lib/review.functions";

export const Route = createFileRoute("/noter/$token")({
  head: () => ({
    meta: [
      { title: "Votre avis — Résidence Panorama P" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NoterPage,
});

function NoterPage() {
  const { token } = Route.useParams();
  const runGet    = useServerFn(opGetReviewToken);
  const runSubmit = useServerFn(opSubmitReview);

  const { data: tokenData, isLoading } = useQuery({
    queryKey: ["review-token", token],
    queryFn:  () => runGet({ data: { token } }),
    staleTime: Infinity,
    retry: false,
  });

  const [name,      setName]      = useState("");
  const [rating,    setRating]    = useState(0);
  const [hovered,   setHovered]   = useState(0);
  const [comment,   setComment]   = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill name once token data arrives
  useState(() => {
    if (tokenData?.valid && tokenData.guestName && !name) {
      setName(tokenData.guestName);
    }
  });

  const mutation = useMutation({
    mutationFn: () =>
      runSubmit({ data: { token, name: name.trim(), rating, comment: comment.trim() } }),
    onSuccess: () => setSubmitted(true),
  });

  if (isLoading) return (
    <Shell><Loader2 className="h-8 w-8 animate-spin text-amber-800 mx-auto" /></Shell>
  );

  if (!tokenData?.valid) {
    const reason = (tokenData as any)?.reason;
    return (
      <Shell>
        <div className="text-center space-y-3">
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="font-display text-2xl font-bold">
            {reason === "used"    ? "Avis déjà soumis" :
             reason === "expired" ? "Lien expiré"       : "Lien invalide"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {reason === "used"
              ? "Vous avez déjà soumis votre avis via ce lien. Merci !\nYou have already submitted your review. Thank you!"
              : reason === "expired"
              ? "Ce lien de notation a expiré (valable 30 jours).\nThis review link has expired (valid for 30 days)."
              : "Ce lien est invalide ou n'existe pas.\nThis link is invalid or does not exist."}
          </p>
        </div>
      </Shell>
    );
  }

  if (submitted) return (
    <Shell>
      <div className="text-center space-y-4">
        <CheckCircle2 className="h-14 w-14 text-emerald-600 mx-auto" />
        <h1 className="font-display text-2xl font-bold text-emerald-700">
          Merci pour votre avis !
        </h1>
        <p className="text-muted-foreground">
          Nous vous remercions sincèrement pour votre retour. Votre satisfaction est notre priorité.
        </p>
        <hr className="my-2" />
        <p className="text-muted-foreground text-sm italic">
          Thank you so much for your feedback. Your satisfaction is our priority.
        </p>
      </div>
    </Shell>
  );

  const guestName = tokenData.guestName ?? "";
  const canSubmit = name.trim().length > 0 && rating > 0 && comment.trim().length > 0;

  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold text-center">
        Votre avis nous intéresse
      </h1>
      <p className="text-sm text-muted-foreground text-center">
        Merci pour votre séjour à la Résidence Panorama P · Thank you for your stay
      </p>

      <div className="space-y-5 mt-6">
        {/* Nom pré-rempli */}
        <div className="space-y-1.5">
          <Label>Votre nom complet · Your full name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={guestName || "Votre nom"}
            maxLength={120}
          />
        </div>

        {/* Étoiles */}
        <div className="space-y-2">
          <Label>Note · Rating</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-9 w-9 transition-colors ${
                    star <= (hovered || rating)
                      ? "fill-amber-500 text-amber-500"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-xs text-muted-foreground">
              {["","Très déçu","Déçu","Correct","Bien","Excellent !"][rating]}
              {" · "}
              {["","Very disappointed","Disappointed","OK","Good","Excellent!"][rating]}
            </p>
          )}
        </div>

        {/* Commentaire */}
        <div className="space-y-1.5">
          <Label>Votre commentaire · Your comment</Label>
          <Textarea
            rows={5}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Partagez votre expérience... · Share your experience..."
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground text-right">
            {comment.length}/2000
          </p>
        </div>

        <Button
          className="w-full bg-amber-800 hover:bg-amber-900 text-white font-bold py-3"
          disabled={!canSubmit || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending
            ? <Loader2 className="h-5 w-5 animate-spin" />
            : <Star className="h-5 w-5" />}
          Envoyer mon avis · Submit my review
        </Button>

        {mutation.isError && (
          <p className="text-sm text-destructive text-center">
            {(mutation.error as Error).message}
          </p>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      <header className="border-b border-border/60 bg-background">
        <div className="mx-auto max-w-lg px-4 h-16 flex items-center">
          <Logo />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-border/60 bg-card p-8 shadow-soft">
          {children}
        </div>
      </main>
    </div>
  );
}
