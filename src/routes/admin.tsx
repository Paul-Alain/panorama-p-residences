import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2,
  LogOut,
  ShieldCheck,
  Home,
  LayoutDashboard,
  CalendarDays,
  MessageSquare,
  Star,
  Users,
  BedDouble,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { AdminNotifications } from "@/components/notifications/admin-notifications";
import { DashboardOverview } from "@/components/admin/dashboard-overview";
import { ReservationsAdmin } from "@/components/admin/reservations-admin";
import { MessagesAdmin } from "@/components/admin/messages-admin";
import { ReviewsAdmin } from "@/components/admin/reviews-admin";
import { UsersAdmin } from "@/components/admin/users-admin";
import { LogementsAdmin } from "@/components/admin/logements-admin";
import { useLanguage } from "@/lib/i18n/language-context";
import { claimAdmin, getAdminStatus } from "@/lib/admin.functions";

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

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
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
  const { t } = useLanguage();
  const tabs = t.admin.dash.tabs;

  return (
    <Tabs defaultValue="overview">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <TabsList className="w-max">
          <TabsTrigger value="overview" className="gap-1.5">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">{tabs.overview}</span>
          </TabsTrigger>
          <TabsTrigger value="reservations" className="gap-1.5">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">{tabs.reservations}</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">{tabs.messages}</span>
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-1.5">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">{tabs.reviews}</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{tabs.users}</span>
          </TabsTrigger>
          <TabsTrigger value="logements" className="gap-1.5">
            <BedDouble className="h-4 w-4" />
            <span className="hidden sm:inline">{tabs.logements}</span>
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="overview" className="mt-6"><DashboardOverview /></TabsContent>
      <TabsContent value="reservations" className="mt-6"><ReservationsAdmin /></TabsContent>
      <TabsContent value="messages" className="mt-6"><MessagesAdmin /></TabsContent>
      <TabsContent value="reviews" className="mt-6"><ReviewsAdmin /></TabsContent>
      <TabsContent value="users" className="mt-6"><UsersAdmin /></TabsContent>
      <TabsContent value="logements" className="mt-6"><LogementsAdmin /></TabsContent>
    </Tabs>
  );
}
