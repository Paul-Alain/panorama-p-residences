import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  LogOut,
  User as UserIcon,
  CalendarDays,
  MessageSquare,
  Star,
  Users,
  PenLine,
  KeyRound,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n/language-context";
import {
  encodeReview,
  parseReviewMeta,
  stripReviewMeta,
  PENDING_SORT_ORDER,
  type ReviewMeta,
} from "@/lib/data";

const COMPLETED_STATUS = "terminée";

export const Route = createFileRoute("/mon-espace")({
  head: () => ({
    meta: [
      { title: "Mon espace client – Panorama P" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) navigate({ to: "/auth" });
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
      if (!data.session) navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (checking || !session) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  const userId = session.user.id;

  return (
    <>
      <PageHeader title={t.account.title} subtitle={t.account.subtitle}>
        <div className="mt-6 flex justify-center">
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" /> {t.account.signOut}
          </Button>
        </div>
      </PageHeader>

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <Tabs defaultValue="profile">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
            <TabsTrigger value="profile" className="gap-1.5">
              <UserIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.account.tabs.profile}</span>
              <span className="sm:hidden">{t.account.tabs.profile}</span>
            </TabsTrigger>
            <TabsTrigger value="reservations" className="gap-1.5">
              <CalendarDays className="h-4 w-4" />
              <span className="truncate">{t.account.tabs.reservations}</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1.5">
              <MessageSquare className="h-4 w-4" />
              <span className="truncate">{t.account.tabs.messages}</span>
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1.5">
              <Star className="h-4 w-4" />
              <span className="truncate">{t.account.tabs.reviews}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6 space-y-6">
            <ProfileSection userId={userId} email={session.user.email ?? ""} />
            <SecuritySection />
          </TabsContent>

          <TabsContent value="reservations" className="mt-6">
            <ReservationsSection userId={userId} />
          </TabsContent>
          <TabsContent value="messages" className="mt-6">
            <MessagesSection userId={userId} />
          </TabsContent>
          <TabsContent value="reviews" className="mt-6">
            <ReviewsSection userId={userId} />
          </TabsContent>
        </Tabs>
      </section>
    </>
  );
}

function SectionLoader() {
  return <Loader2 className="h-5 w-5 animate-spin text-gold" />;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-card/50 p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

const fmtDate = (d: string) => {
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString();
};

/* ---------------- Profile ---------------- */

interface ProfileRow {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
}

function ProfileSection({ userId, email }: { userId: string; email: string }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["my-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone_number, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ProfileRow | null;
    },
  });

  useEffect(() => {
    if (data) {
      setFullName(data.full_name ?? "");
      setPhone(data.phone_number ?? "");
      setAvatar(data.avatar_url ?? "");
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").upsert(
        {
          id: userId,
          full_name: fullName || null,
          phone_number: phone || null,
          avatar_url: avatar || null,
        },
        { onConflict: "id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.account.profile.saved);
      qc.invalidateQueries({ queryKey: ["my-profile", userId] });
    },
    onError: () => toast.error(t.account.profile.error),
  });

  if (isLoading) return <SectionLoader />;

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft sm:p-8">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
          {avatar ? (
            <img src={avatar} alt={fullName || email} className="h-full w-full object-cover" />
          ) : (
            <UserIcon className="h-7 w-7 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold">
            {fullName || email}
          </p>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label>{t.account.profile.fullName}</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t.account.profile.phone}</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t.account.profile.avatar}</Label>
          <Input
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t.account.profile.email}</Label>
          <Input value={email} disabled />
        </div>
        <Button type="submit" variant="gold" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mutation.isPending ? t.account.profile.saving : t.account.profile.save}
        </Button>
      </form>
    </div>
  );
}

/* ---------------- Security (change password) ---------------- */

function SecuritySection() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success("Votre mot de passe a été mis à jour.");
  };

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft sm:p-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <KeyRound className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-display text-lg font-semibold">Sécurité</p>
          <p className="text-sm text-muted-foreground">Modifier votre mot de passe</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Nouveau mot de passe</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Confirmer le mot de passe</Label>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <Button type="submit" variant="gold" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Mettre à jour
        </Button>
      </form>
    </div>
  );
}



/* ---------------- Shared review data ---------------- */

interface ReviewRow {
  id: string;
  rating: number;
  location: string | null;
  message_fr: string;
  sort_order: number;
  created_at: string;
}

function useMyReviews(userId: string) {
  return useQuery({
    queryKey: ["my-reviews", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("id, rating, location, message_fr, sort_order, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReviewRow[];
    },
  });
}

/* ---------------- Star rating input ---------------- */

function StarInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${label} ${i + 1}`}
            onClick={() => onChange(i + 1)}
            className="p-0.5"
          >
            <Star
              className={`h-5 w-5 transition-colors ${
                i < value ? "fill-gold text-gold" : "text-muted-foreground/40"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Reservations ---------------- */

interface ReservationRow {
  id: string;
  name: string;
  arrival_date: string;
  departure_date: string;
  guests: number;
  logement_type: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

function ReservationsSection({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const [reviewTarget, setReviewTarget] = useState<ReservationRow | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["my-reservations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("id, name, arrival_date, departure_date, guests, logement_type, message, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReservationRow[];
    },
  });

  const { data: reviews = [] } = useMyReviews(userId);
  const reviewedReservationIds = useMemo(() => {
    const set = new Set<string>();
    for (const rev of reviews) {
      const meta = parseReviewMeta(rev.message_fr);
      if (meta?.reservationId) set.add(meta.reservationId);
    }
    return set;
  }, [reviews]);

  if (isLoading) return <SectionLoader />;
  if (data.length === 0) return <EmptyState text={t.account.empty.reservations} />;

  return (
    <>
      <div className="space-y-3">
        {data.map((r) => {
          const completed = r.status === COMPLETED_STATUS;
          const alreadyReviewed = reviewedReservationIds.has(r.id);
          return (
            <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {fmtDate(r.arrival_date)} → {fmtDate(r.departure_date)}
                </p>
                <Badge variant="secondary" className="capitalize">{r.status}</Badge>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {r.guests} {t.account.labels.guests}
                </span>
                {r.logement_type && <span>· {r.logement_type}</span>}
              </p>
              {r.message && <p className="mt-2 text-sm">{r.message}</p>}
              {completed && (
                <div className="mt-4 border-t border-border/60 pt-4">
                  {alreadyReviewed ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                      {t.account.review.already}
                    </span>
                  ) : (
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => setReviewTarget(r)}
                    >
                      <PenLine className="h-4 w-4" /> {t.account.review.cta}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ReviewDialog
        userId={userId}
        reservation={reviewTarget}
        onClose={() => setReviewTarget(null)}
      />
    </>
  );
}

/* ---------------- Review dialog ---------------- */

const SUB_KEYS = ["cleanliness", "comfort", "security", "hospitality", "value"] as const;
type SubKey = (typeof SUB_KEYS)[number];

function ReviewDialog({
  userId,
  reservation,
  onClose,
}: {
  userId: string;
  reservation: ReservationRow | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [overall, setOverall] = useState(5);
  const [subs, setSubs] = useState<Record<SubKey, number>>({
    cleanliness: 5,
    comfort: 5,
    security: 5,
    hospitality: 5,
    value: 5,
  });
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (reservation) {
      setOverall(5);
      setSubs({ cleanliness: 5, comfort: 5, security: 5, hospitality: 5, value: 5 });
      setComment("");
    }
  }, [reservation]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!reservation) return;
      const meta: ReviewMeta = {
        reservationId: reservation.id,
        cleanliness: subs.cleanliness,
        comfort: subs.comfort,
        security: subs.security,
        hospitality: subs.hospitality,
        value: subs.value,
      };
      const { error } = await supabase.from("testimonials").insert({
        user_id: userId,
        name: reservation.name || "Client",
        rating: overall,
        sort_order: PENDING_SORT_ORDER,
        message_fr: encodeReview(comment, meta),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.account.review.success);
      qc.invalidateQueries({ queryKey: ["my-reviews", userId] });
      onClose();
    },
    onError: () => toast.error(t.account.review.error),
  });

  return (
    <Dialog open={!!reservation} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.account.review.title}</DialogTitle>
          <DialogDescription>{t.account.review.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-secondary/40 p-4">
            <StarInput value={overall} onChange={setOverall} label={t.account.review.overall} />
          </div>
          <div className="space-y-3">
            {SUB_KEYS.map((key) => (
              <StarInput
                key={key}
                value={subs[key]}
                onChange={(v) => setSubs((s) => ({ ...s, [key]: v }))}
                label={t.account.review[key]}
              />
            ))}
          </div>
          <div className="space-y-1.5">
            <Label>{t.account.review.comment}</Label>
            <Textarea
              rows={4}
              value={comment}
              maxLength={1000}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t.account.review.commentPlaceholder}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            {t.account.review.cancel}
          </Button>
          <Button variant="gold" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mutation.isPending ? t.account.review.submitting : t.account.review.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Messages ---------------- */

interface MessageRow {
  id: string;
  message: string;
  status: string;
  created_at: string;
}

function MessagesSection({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-messages", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, message, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
  });

  if (isLoading) return <SectionLoader />;
  if (data.length === 0) return <EmptyState text={t.account.empty.messages} />;

  return (
    <div className="space-y-3">
      {data.map((m) => (
        <div key={m.id} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{fmtDate(m.created_at)}</p>
            <Badge variant="secondary" className="capitalize">{m.status}</Badge>
          </div>
          <p className="mt-2 text-sm">{m.message}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Reviews ---------------- */

function ReviewsSection({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const { data = [], isLoading } = useMyReviews(userId);

  if (isLoading) return <SectionLoader />;
  if (data.length === 0) return <EmptyState text={t.account.empty.reviews} />;

  return (
    <div className="space-y-3">
      {data.map((rev) => {
        const pending = rev.sort_order < 0;
        const comment = stripReviewMeta(rev.message_fr);
        return (
          <div key={rev.id} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < rev.rating ? "fill-gold text-gold" : "text-muted-foreground/40"}`}
                  />
                ))}
              </div>
              <Badge variant={pending ? "secondary" : "default"}>
                {pending ? t.account.review.pending : t.account.review.approved}
              </Badge>
            </div>
            {comment && <p className="mt-2 text-sm">{comment}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              {[rev.location, fmtDate(rev.created_at)].filter(Boolean).join(" · ")}
            </p>
          </div>
        );
      })}
    </div>
  );
}
