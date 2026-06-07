import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2, UserPlus, Trash2, Activity, ShieldCheck,
  RefreshCw, Lock, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  opListTeam, opSetTeamRole, opRemoveTeamRole,
  opListActivity, staffGetStatus, opReplaceManager,
} from "@/lib/operations.functions";
import { TEAM_ROLE_LABELS } from "@/lib/operations";
import { formatRelativeFr } from "@/lib/format";

const ACTION_LABELS: Record<string, string> = {
  statut_reservation:  "Statut de réservation modifié",
  checkin:             "Check-in effectué",
  checkout:            "Check-out effectué",
  statut_unite:        "Statut d'unité modifié",
  paiement_ajoute:     "Paiement ajouté",
  reservation_creee:   "Réservation créée",
  role_attribue:       "Rôle attribué",
};

export function TeamAdmin() {
  const qc            = useQueryClient();
  const runTeam       = useServerFn(opListTeam);
  const runActivity   = useServerFn(opListActivity);
  const runSet        = useServerFn(opSetTeamRole);
  const runRemove     = useServerFn(opRemoveTeamRole);
  const runReplace    = useServerFn(opReplaceManager);
  const runStatus     = useServerFn(staffGetStatus);

  const [addIdentifier,     setAddIdentifier]     = useState("");
  const [replaceIdentifier, setReplaceIdentifier] = useState("");
  const [busy,              setBusy]              = useState(false);

  const { data: status } = useQuery({
    queryKey: ["op-staff-status"],
    queryFn:  () => runStatus(),
    staleTime: 60_000,
  });

  // Only proprietaire (owner) can access this tab
  const isOwner = status?.roles?.includes("admin") || status?.roles?.includes("proprietaire");

  const { data: team = [], isLoading } = useQuery({
    queryKey: ["op-team"],
    queryFn:  () => runTeam(),
    staleTime: 60_000,
  });

  const { data: activity = [] } = useQuery({
    queryKey: ["op-activity"],
    queryFn:  () => runActivity(),
    staleTime: 30_000,
  });

  const currentManagers = team.filter((m) => m.roles.includes("gestionnaire"));

  const addOwner = async () => {
    if (!addIdentifier.trim()) return toast.error("Saisissez un nom, téléphone ou e-mail.");
    setBusy(true);
    try {
      const res = await runSet({ data: { identifier: addIdentifier.trim(), role: "proprietaire" } });
      await qc.invalidateQueries({ queryKey: ["op-team"] });
      toast.success(`Propriétaire ajouté${(res as any).targetEmail ? ` (${(res as any).targetEmail})` : ""}.`);
      setAddIdentifier("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setBusy(false);
  };

  const replaceManager = async () => {
    if (!replaceIdentifier.trim()) return toast.error("Saisissez un nom, téléphone ou e-mail.");
    if (!confirm("Cette action va retirer le rôle gestionnaire à tous les gestionnaires actuels et attribuer ce rôle au nouveau. Confirmer ?")) return;
    setBusy(true);
    try {
      const res = await runReplace({ data: { identifier: replaceIdentifier.trim() } });
      await qc.invalidateQueries({ queryKey: ["op-team"] });
      toast.success(`Gestionnaire remplacé${(res as any).targetEmail ? ` par ${(res as any).targetEmail}` : ""}.`);
      setReplaceIdentifier("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setBusy(false);
  };

  const removeRole = async (userId: string, role: string) => {
    if (!confirm(`Retirer le rôle "${TEAM_ROLE_LABELS[role] ?? role}" ?`)) return;
    try {
      await runRemove({ data: { userId, role } });
      await qc.invalidateQueries({ queryKey: ["op-team"] });
      toast.success("Rôle retiré.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  // Non-owner sees a read-only view
  if (!isOwner) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-50 p-4 text-sm text-amber-800">
          <Lock className="h-4 w-4 shrink-0" />
          Cet onglet est réservé au propriétaire.
        </div>

        {/* Read-only team list for manager */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Eye className="h-5 w-5 text-gold" /> Équipe (lecture seule)
          </h2>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {team.map((m) => (
                <div key={m.id}
                  className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                  <p className="flex items-center gap-2 font-medium">
                    <ShieldCheck className="h-4 w-4 text-gold" />
                    {m.name ?? m.email ?? "Membre"}
                  </p>
                  {m.email && <p className="text-sm text-muted-foreground">{m.email}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.roles
                      .filter((r) => ['admin','proprietaire','gestionnaire'].includes(r))
                      .map((r) => (
                      <Badge key={r} variant="secondary">
                        {TEAM_ROLE_LABELS[r] ?? r}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Gestionnaire actuel ── */}
      <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <ShieldCheck className="h-5 w-5 text-gold" />
          Gestionnaire actuel
        </h2>
        {currentManagers.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Aucun gestionnaire assigné.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {currentManagers.map((m) => (
              <div key={m.id}
                className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div>
                  <p className="font-medium">{m.name ?? m.email ?? "Gestionnaire"}</p>
                  {m.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
                </div>
                <Button size="sm" variant="outline"
                  className="text-destructive border-red-300 hover:bg-red-50"
                  onClick={() => removeRole(m.id, "gestionnaire")}>
                  <Trash2 className="h-3.5 w-3.5" /> Retirer
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Remplacer le gestionnaire ── */}
      <section className="rounded-2xl border-2 border-amber-300/60 bg-amber-50/50 p-5 shadow-soft">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-amber-800">
          <RefreshCw className="h-5 w-5" />
          Remplacer le gestionnaire
        </h2>
        <p className="mt-1 text-sm text-amber-700">
          Cette action retire le rôle gestionnaire à l'actuel et l'attribue au nouveau.
          Le nouveau membre doit déjà avoir créé un compte sur le site.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Input
            className="flex-1 min-w-48"
            placeholder="Nom, téléphone ou e-mail du nouveau gestionnaire"
            value={replaceIdentifier}
            onChange={(e) => setReplaceIdentifier(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && replaceManager()}
          />
          <Button variant="gold" disabled={busy} onClick={replaceManager}>
            {busy
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RefreshCw className="h-4 w-4" />}
            Remplacer
          </Button>
        </div>
      </section>

      {/* ── Ajouter un propriétaire ── */}
      <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <UserPlus className="h-5 w-5 text-gold" />
          Ajouter un propriétaire
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Entrez le nom, téléphone ou e-mail du compte à promouvoir propriétaire.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Input
            className="flex-1 min-w-48"
            placeholder="Nom, téléphone ou e-mail"
            value={addIdentifier}
            onChange={(e) => setAddIdentifier(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addOwner()}
          />
          <Button variant="gold" disabled={busy} onClick={addOwner}>
            {busy
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <UserPlus className="h-4 w-4" />}
            Ajouter
          </Button>
        </div>
      </section>

      {/* ── Toute l'équipe ── */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Toute l'équipe</h2>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gold" />
        ) : team.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun membre.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {team.map((m) => (
              <div key={m.id}
                className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                <p className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="h-4 w-4 text-gold" />
                  {m.name ?? m.email ?? "Membre"}
                </p>
                {m.email && <p className="text-sm text-muted-foreground">{m.email}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.roles
                    .filter((r) => ['admin','proprietaire','gestionnaire'].includes(r))
                    .map((r) => (
                    <Badge key={r} variant="secondary" className="gap-1">
                      {TEAM_ROLE_LABELS[r] ?? r}
                      {r !== "admin" && (
                        <button
                          onClick={() => removeRole(m.id, r)}
                          className="ml-1 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Journal d'activité ── */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Activity className="h-5 w-5 text-gold" /> Journal d'activité
        </h2>
        <div className="rounded-2xl border border-border/60 bg-card p-2 shadow-soft">
          {activity.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucune activité enregistrée.</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{a.user_name ?? "Équipe"}</span>{" "}
                    <span className="text-muted-foreground">
                      — {ACTION_LABELS[a.action] ?? a.action}
                    </span>
                    {a.summary && (
                      <span className="block text-xs text-muted-foreground">{a.summary}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeFr(a.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
