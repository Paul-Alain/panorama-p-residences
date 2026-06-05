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
  CalendarRange,
  Contact,
  UsersRound,

} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { roleTier, ROLE_TIER_LABELS } from "@/lib/operations";
import { useLanguage } from "@/lib/i18n/language-context";
import { supabase } from "@/integrations/supabase/client";
import { AdminNotifications } from "@/components/notifications/admin-notifications";
import { DashboardOverview } from "@/components/admin/dashboard-overview";
import { ReservationsAdmin } from "@/components/admin/reservations-admin";
import { MessagesAdmin } from "@/components/admin/messages-admin";
import { ReviewsAdmin } from "@/components/admin/reviews-admin";
import { OccupancyCalendar } from "@/components/admin/occupancy-calendar";
import { ClientsAdmin } from "@/components/admin/clients-admin";
import { TeamAdmin } from "@/components/admin/team-admin";
import { SettingsAdmin } from "@/components/admin/settings-admin";
import { claimAdmin } from "@/lib/admin.functions";
import { staffGetStatus } from "@/lib/operations.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Administration – Panorama P" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [claiming, setClaiming] = useState(false);
  const runClaim = useServerFn(claimAdmin);
  const runGetAdminStatus = useServerFn(staffGetStatus);

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
        setIsAdmin(res.isStaff);
        setRoles(res.roles ?? []);
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
            {isAdmin && (() => {
              const tier = roleTier(roles);
              return tier ? (
                <Badge variant="outline" className="hidden border-gold/40 text-gold sm:inline-flex">
                  {ROLE_TIER_LABELS[lang][tier]}
                </Badge>
              ) : null;
            })()}
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
  const tabs: { value: string; label: string; icon: typeof LayoutDashboard }[] = [
    { value: "overview", label: "Tableau de bord", icon: LayoutDashboard },
    { value: "reservations", label: "Réservations", icon: CalendarDays },
    { value: "calendar", label: "Calendrier", icon: CalendarRange },
    { value: "clients", label: "Clients", icon: Contact },
    { value: "messages", label: "Messages", icon: MessageSquare },
    { value: "reviews", label: "Avis", icon: Star },
    { value: "team", label: "Équipe", icon: UsersRound },

  ];

  return (
    <Tabs defaultValue="overview">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <TabsList className="w-max">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value="overview" className="mt-6"><DashboardOverview /></TabsContent>
      <TabsContent value="reservations" className="mt-6"><ReservationsAdmin /></TabsContent>
      <TabsContent value="calendar" className="mt-6"><OccupancyCalendar /></TabsContent>
      <TabsContent value="clients" className="mt-6"><ClientsAdmin /></TabsContent>
      <TabsContent value="messages" className="mt-6"><MessagesAdmin /></TabsContent>
      <TabsContent value="reviews" className="mt-6"><ReviewsAdmin /></TabsContent>
      <TabsContent value="team" className="mt-6"><TeamAdmin /></TabsContent>

    </Tabs>
  );
}

