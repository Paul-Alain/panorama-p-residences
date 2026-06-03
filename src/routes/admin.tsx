import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, LogOut, ShieldCheck, Home, Send } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LogementEditor } from "@/components/admin/logement-editor";
import { supabase } from "@/integrations/supabase/client";
import {
  claimAdmin,
  getAdminStatus,
  adminDeleteLogement,
  adminListReservations,
  adminListMessages,
  adminUpdateMessage,
} from "@/lib/admin.functions";
import {
  logementsQuery,
  formatPrice,
  parseMessageMeta,
  stripMessageMeta,
  type Logement,
} from "@/lib/data";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Administration – Panorama P" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const runClaim = useServerFn(claimAdmin);
  const runGetAdminStatus = useServerFn(getAdminStatus);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) navigate({ to: "/auth" });
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    // Admin status is verified server-side; the client flag is only a UI hint.
    runGetAdminStatus()
      .then((res) => {
        if (!active) return;
        setIsAdmin(res.isAdmin);
        setChecking(false);
      })
      .catch(() => {
        if (!active) return;
        setIsAdmin(false);
        setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [session, runGetAdminStatus]);


  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await runClaim();
      if (res.admin) {
        setIsAdmin(true);
        toast.success("Accès administrateur activé.");
      } else {
        toast.error("Un administrateur existe déjà.");
      }
    } catch {
      toast.error("Erreur lors de l'activation.");
    }
    setClaiming(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (!session || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border/60 bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            {isAdmin && <AdminNotifications adminId={session.user.id} />}
            <Button asChild variant="ghost" size="sm">
              <Link to="/"><Home className="h-4 w-4" /> Site</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {!isAdmin ? (
          <div className="mx-auto max-w-md rounded-3xl border border-border/60 bg-card p-8 text-center shadow-soft">
            <ShieldCheck className="mx-auto h-10 w-10 text-gold" />
            <h1 className="mt-4 font-display text-2xl font-semibold">Activer l'accès administrateur</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Vous êtes connecté en tant que <strong>{session.user.email}</strong>. Activez l'accès
              administrateur pour gérer le contenu du site.
            </p>
            <Button variant="gold" className="mt-6 w-full" onClick={handleClaim} disabled={claiming}>
              {claiming && <Loader2 className="h-4 w-4 animate-spin" />}
              Activer
            </Button>
          </div>
        ) : (
          <AdminDashboard />
        )}
      </main>
    </div>
  );
}

function AdminDashboard() {
  return (
    <Tabs defaultValue="logements">
      <TabsList>
        <TabsTrigger value="logements">Logements</TabsTrigger>
        <TabsTrigger value="reservations">Réservations</TabsTrigger>
        <TabsTrigger value="messages">Messages</TabsTrigger>
      </TabsList>
      <TabsContent value="logements" className="mt-6"><LogementsAdmin /></TabsContent>
      <TabsContent value="reservations" className="mt-6"><ReservationsAdmin /></TabsContent>
      <TabsContent value="messages" className="mt-6"><MessagesAdmin /></TabsContent>
    </Tabs>
  );
}

function LogementsAdmin() {
  const qc = useQueryClient();
  const { data: logements = [], isLoading } = useQuery(logementsQuery);
  const [editing, setEditing] = useState<Logement | null>(null);
  const [open, setOpen] = useState(false);
  const runDeleteLogement = useServerFn(adminDeleteLogement);

  const refresh = () => qc.invalidateQueries({ queryKey: ["logements"] });

  const remove = async (id: string) => {
    try {
      await runDeleteLogement({ data: { id } });
    } catch {
      toast.error("Suppression refusée.");
      return;
    }
    toast.success("Logement supprimé.");
    refresh();
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="gold" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </div>
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-gold" />
      ) : (
        <div className="space-y-3">
          {logements.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{l.title_fr}</p>
                  <Badge variant="secondary">{l.type}</Badge>
                  {!l.available && <Badge variant="destructive">Complet</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{formatPrice(l.price, l.currency)} / {l.price_unit}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="icon" onClick={() => { setEditing(l); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer ce logement ?</AlertDialogTitle>
                      <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove(l.id)}>Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
      <LogementEditor open={open} onOpenChange={setOpen} logement={editing} onSaved={refresh} />
    </div>
  );
}

interface Reservation {
  id: string; name: string; phone: string; email: string | null;
  arrival_date: string; departure_date: string; guests: number;
  logement_type: string | null; message: string | null; status: string; created_at: string;
}

function ReservationsAdmin() {
  const runListReservations = useServerFn(adminListReservations);
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-reservations"],
    queryFn: async () => (await runListReservations()) as Reservation[],
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-gold" />;
  if (data.length === 0) return <p className="text-muted-foreground">Aucune réservation.</p>;

  return (
    <div className="space-y-3">
      {data.map((r) => (
        <div key={r.id} className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{r.name} · {r.phone}</p>
            <Badge variant="secondary">{r.logement_type ?? "—"}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {r.arrival_date} → {r.departure_date} · {r.guests} pers.
            {r.email ? ` · ${r.email}` : ""}
          </p>
          {r.message && <p className="mt-2 text-sm">{r.message}</p>}
        </div>
      ))}
    </div>
  );
}

interface Message {
  id: string; name: string; phone: string | null; email: string | null;
  message: string; status: string; user_id: string | null; created_at: string;
}

const ADMIN_STATUSES = ["nouveau", "lu", "répondu"] as const;
const STATUS_LABEL: Record<string, string> = {
  nouveau: "Nouveau",
  lu: "Lu",
  répondu: "Répondu",
};

function MessagesAdmin() {
  const qc = useQueryClient();
  const runListMessages = useServerFn(adminListMessages);
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => (await runListMessages()) as Message[],
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-gold" />;
  if (data.length === 0) return <p className="text-muted-foreground">Aucun message.</p>;

  return (
    <div className="space-y-3">
      {data.map((m) => (
        <MessageAdminCard
          key={m.id}
          message={m}
          onSaved={() => qc.invalidateQueries({ queryKey: ["admin-messages"] })}
        />
      ))}
    </div>
  );
}

function MessageAdminCard({
  message,
  onSaved,
}: {
  message: Message;
  onSaved: () => void;
}) {
  const runUpdate = useServerFn(adminUpdateMessage);
  const meta = parseMessageMeta(message.message);
  const body = stripMessageMeta(message.message);
  const [status, setStatus] = useState(message.status);
  const [reply, setReply] = useState(meta?.reply ?? "");
  const [saving, setSaving] = useState(false);

  const fmtDate = (d: string) => {
    const date = new Date(d);
    return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString();
  };

  const save = async (opts: { withReply: boolean }) => {
    setSaving(true);
    try {
      await runUpdate({
        data: {
          id: message.id,
          status,
          ...(opts.withReply ? { reply: reply.trim() } : {}),
        },
      });
      toast.success("Message mis à jour.");
      onSaved();
    } catch {
      toast.error("Mise à jour refusée.");
    }
    setSaving(false);
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{message.name}</p>
        <Badge variant={message.status === "répondu" ? "default" : "secondary"}>
          {STATUS_LABEL[message.status] ?? message.status}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {[message.phone, message.email].filter(Boolean).join(" · ") || "—"}
        {" · "}
        {fmtDate(message.created_at)}
      </p>
      {meta?.subject && <p className="mt-2 font-medium">{meta.subject}</p>}
      <p className="mt-1 whitespace-pre-line text-sm">{body}</p>

      {meta?.reply && (
        <div className="mt-3 rounded-lg border border-gold/30 bg-gold/5 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">
            Réponse envoyée
          </p>
          <p className="mt-1 whitespace-pre-line">{meta.reply}</p>
        </div>
      )}

      <div className="mt-4 grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-[180px_1fr] sm:items-start">
        <div className="space-y-1.5">
          <Label className="text-xs">Statut</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADMIN_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={saving}
            onClick={() => save({ withReply: false })}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer le statut
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Réponse</Label>
          <Textarea
            rows={3}
            value={reply}
            maxLength={5000}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Votre réponse au client…"
          />
          <Button
            variant="gold"
            size="sm"
            disabled={saving || !reply.trim()}
            onClick={() => save({ withReply: true })}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Envoyer la réponse
          </Button>
        </div>
      </div>
    </div>
  );
}
