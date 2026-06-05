import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, UserPlus, Trash2, Activity, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { opListTeam, opSetTeamRole, opRemoveTeamRole, opListActivity, staffGetStatus } from "@/lib/operations.functions";
import { TEAM_ROLE_LABELS, ASSIGNABLE_ROLES } from "@/lib/operations";
import { formatRelativeFr } from "@/lib/format";

const ACTION_LABELS: Record<string, string> = {
  statut_reservation: "Statut de réservation modifié",
  checkin: "Check-in effectué",
  checkout: "Check-out effectué",
  statut_unite: "Statut d'unité modifié",
  paiement_ajoute: "Paiement ajouté",
  reservation_creee: "Réservation créée",
  role_attribue: "Rôle attribué",
};

export function TeamAdmin() {
  const qc = useQueryClient();
  const runTeam = useServerFn(opListTeam);
  const runActivity = useServerFn(opListActivity);
  const runSet = useServerFn(opSetTeamRole);
  const runRemove = useServerFn(opRemoveTeamRole);
  const runStatus = useServerFn(staffGetStatus);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("gestionnaire");
  const [busy, setBusy] = useState(false);

  const { data: status } = useQuery({
    queryKey: ["op-staff-status"],
    queryFn: () => runStatus(),
    staleTime: 60_000,
  });
  const canManage = status?.canManageTeam ?? false;

  const { data: team = [], isLoading } = useQuery({
    queryKey: ["op-team"],
    queryFn: () => runTeam(),
    staleTime: 60_000,
  });
  const { data: activity = [] } = useQuery({
    queryKey: ["op-activity"],
    queryFn: () => runActivity(),
    staleTime: 30_000,
  });

  const addMember = async () => {
    if (!email.trim()) return toast.error("Saisissez un e-mail.");
    setBusy(true);
    try {
      await runSet({ data: { email: email.trim(), role: role as any } });
      await qc.invalidateQueries({ queryKey: ["op-team"] });
      toast.success("Rôle attribué.");
      setEmail("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setBusy(false);
  };

  const removeRole = async (userId: string, r: string) => {
    try {
      await runRemove({ data: { userId, role: r } });
      await qc.invalidateQueries({ queryKey: ["op-team"] });
      toast.success("Rôle retiré.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="space-y-8">
      {/* Add member */}
      <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <UserPlus className="h-5 w-5 text-gold" /> Ajouter un membre
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le membre doit déjà avoir créé un compte avec cet e-mail.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Input placeholder="E-mail du membre" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNABLE_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {TEAM_ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="gold" disabled={busy} onClick={addMember}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Ajouter
          </Button>
        </div>
      </section>

      {/* Team list */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Équipe</h2>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gold" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {team.map((m) => (
              <div key={m.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                <p className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="h-4 w-4 text-gold" /> {m.name ?? m.email ?? "Membre"}
                </p>
                {m.email && <p className="text-sm text-muted-foreground">{m.email}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.roles.map((r) => (
                    <Badge key={r} variant="secondary" className="gap-1">
                      {TEAM_ROLE_LABELS[r] ?? r}
                      {r !== "admin" && (
                        <button onClick={() => removeRole(m.id, r)} className="ml-1 text-muted-foreground hover:text-destructive">
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

      {/* Activity log */}
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
                <li key={a.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{a.user_name ?? "Équipe"}</span>{" "}
                    <span className="text-muted-foreground">— {ACTION_LABELS[a.action] ?? a.action}</span>
                    {a.summary && <span className="block text-xs text-muted-foreground">{a.summary}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeFr(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
