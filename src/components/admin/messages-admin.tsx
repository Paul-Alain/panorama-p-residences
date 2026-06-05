import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2, Send, MailOpen, CheckCheck,
  ChevronDown, ChevronUp, Inbox, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { adminListMessages, adminUpdateMessage } from "@/lib/admin.functions";
import { parseMessageMeta, stripMessageMeta } from "@/lib/data";

// ── Types ────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  message: string;
  status: string;
  user_id: string | null;
  created_at: string;
}

interface EmailLog {
  id: string;
  template_name: string;
  recipient_email: string;
  status: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  nouveau:  "Nouveau",
  lu:       "Lu",
  répondu:  "Répondu",
};

const TEMPLATE_LABEL: Record<string, string> = {
  "reservation-confirmation": "Confirmation réservation",
  "reservation-team-alert":   "Alerte équipe",
  "contact-confirmation":     "Confirmation contact",
  "admin-reply":              "Réponse admin",
  "payment-receipt":          "Reçu de paiement",
  "review-request":           "Demande d'avis",
};

const EMAIL_STATUS_COLOR: Record<string, string> = {
  pending:    "bg-amber-100  text-amber-700",
  sent:       "bg-emerald-100 text-emerald-700",
  failed:     "bg-red-100    text-red-700",
  suppressed: "bg-gray-100   text-gray-600",
};

type Tab = "received" | "sent";

export function MessagesAdmin() {
  const qc        = useQueryClient();
  const runList   = useServerFn(adminListMessages);
  const [tab, setTab] = useState<Tab>("received");

  // ── Messages reçus (formulaire contact) ──────────────────────────────
  const { data: messages = [], isLoading: loadingMsg } = useQuery({
    queryKey: ["admin-messages"],
    queryFn:  async () => (await runList()) as Message[],
    staleTime: 30_000,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-messages"] });
  };

  const { unread, all } = useMemo(() => ({
    unread: messages.filter((m) => m.status === "nouveau"),
    all:    messages,
  }), [messages]);

  // ── Emails envoyés (email_send_log) ──────────────────────────────────
  const { data: emailLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["admin-email-logs"],
    queryFn:  async () => {
      const { data, error } = await supabase
        .from("email_send_log")
        .select("id, template_name, recipient_email, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []) as EmailLog[];
    },
    staleTime: 30_000,
  });

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="space-y-5">

      {/* Tab selector */}
      <div className="flex gap-2">
        <Button
          variant={tab === "received" ? "gold" : "outline"}
          size="sm"
          onClick={() => setTab("received")}>
          <Inbox className="h-4 w-4" />
          Messages reçus
          {unread.length > 0 && (
            <Badge variant="destructive" className="ml-1">{unread.length}</Badge>
          )}
        </Button>
        <Button
          variant={tab === "sent" ? "gold" : "outline"}
          size="sm"
          onClick={() => setTab("sent")}>
          <Mail className="h-4 w-4" />
          Emails envoyés
          <Badge variant="secondary" className="ml-1">{emailLogs.length}</Badge>
        </Button>
      </div>

      {/* ── MESSAGES REÇUS ── */}
      {tab === "received" && (
        <div className="space-y-6">
          {/* Non lus */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              Nouveaux messages
              <Badge variant="secondary">{unread.length}</Badge>
            </h2>
            {loadingMsg ? (
              <Loader2 className="h-5 w-5 animate-spin text-gold" />
            ) : unread.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun nouveau message.</p>
            ) : (
              <div className="space-y-3">
                {unread.map((m) => (
                  <MessageCard key={m.id} message={m} onSaved={refresh} fmtDate={fmtDate} />
                ))}
              </div>
            )}
          </section>

          {/* Tous les messages */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              Tous les messages
              <Badge variant="secondary">{all.length}</Badge>
            </h2>
            {loadingMsg ? (
              <Loader2 className="h-5 w-5 animate-spin text-gold" />
            ) : all.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun message reçu.</p>
            ) : (
              <div className="space-y-3">
                {all.map((m) => (
                  <MessageCard key={m.id} message={m} onSaved={refresh} fmtDate={fmtDate} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── EMAILS ENVOYÉS ── */}
      {tab === "sent" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Historique des 100 derniers emails transactionnels envoyés depuis le site.
          </p>
          {loadingLogs ? (
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
          ) : emailLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun email envoyé.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Destinataire</th>
                    <th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {emailLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-secondary/30">
                      <td className="px-3 py-2">
                        {TEMPLATE_LABEL[log.template_name] ?? log.template_name}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {log.recipient_email}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EMAIL_STATUS_COLOR[log.status] ?? "bg-secondary"}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {fmtDate(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MessageCard ───────────────────────────────────────────────────────────
function MessageCard({
  message, onSaved, fmtDate,
}: {
  message: Message;
  onSaved: () => void;
  fmtDate: (s: string) => string;
}) {
  const runUpdate = useServerFn(adminUpdateMessage);
  const meta      = parseMessageMeta(message.message);
  const body      = stripMessageMeta(message.message);
  const [open,    setOpen]   = useState(false);
  const [reply,   setReply]  = useState(meta?.reply ?? "");
  const [saving,  setSaving] = useState(false);

  const setStatus = async (status: "lu" | "répondu") => {
    setSaving(true);
    try {
      await runUpdate({ data: { id: message.id, status } });
      toast.success(STATUS_LABEL[status]);
      onSaved();
    } catch { toast.error("Erreur"); }
    setSaving(false);
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSaving(true);
    try {
      await runUpdate({ data: { id: message.id, status: "répondu", reply: reply.trim() } });
      toast.success("Réponse envoyée.");
      onSaved();
    } catch { toast.error("Erreur"); }
    setSaving(false);
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-soft">
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

      {meta?.reply && !open && (
        <div className="mt-3 rounded-lg border border-gold/30 bg-gold/5 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">Réponse</p>
          <p className="mt-1 whitespace-pre-line">{meta.reply}</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
        {message.status === "nouveau" && (
          <Button variant="outline" size="sm" disabled={saving}
            onClick={() => setStatus("lu")}>
            <MailOpen className="h-4 w-4" /> Marquer comme lu
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {open ? "Fermer" : "Répondre"}
        </Button>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-gold" />}
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          <Textarea rows={3} value={reply} maxLength={5000}
            onChange={(e) => setReply(e.target.value)}
            placeholder={message.email
              ? `Répondre à ${message.email}...`
              : "Écrire une réponse (note interne — pas d'email si pas d'adresse)..."} />
          <div className="flex gap-2">
            <Button variant="gold" size="sm"
              disabled={saving || !reply.trim()} onClick={sendReply}>
              <Send className="h-4 w-4" />
              {message.email ? "Envoyer par email" : "Sauvegarder la note"}
            </Button>
            {!message.email && (
              <p className="self-center text-xs text-muted-foreground">
                Pas d'email — note interne uniquement.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
