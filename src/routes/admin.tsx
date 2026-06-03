import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, LogOut, ShieldCheck, Home } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
} from "@/lib/admin.functions";
import { logementsQuery, formatPrice, type Logement } from "@/lib/data";

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
  message: string; created_at: string;
}

function MessagesAdmin() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Message[];
    },
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-gold" />;
  if (data.length === 0) return <p className="text-muted-foreground">Aucun message.</p>;

  return (
    <div className="space-y-3">
      {data.map((m) => (
        <div key={m.id} className="rounded-xl border border-border/60 bg-card p-4">
          <p className="font-medium">{m.name}</p>
          <p className="text-sm text-muted-foreground">
            {[m.phone, m.email].filter(Boolean).join(" · ") || "—"}
          </p>
          <p className="mt-2 text-sm">{m.message}</p>
        </div>
      ))}
    </div>
  );
}
