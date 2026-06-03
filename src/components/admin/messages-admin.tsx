import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Send,
  MailOpen,
  CheckCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n/language-context";
import { parseMessageMeta, stripMessageMeta } from "@/lib/data";
import { adminListMessages, adminUpdateMessage } from "@/lib/admin.functions";

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

const STATUS_LABEL: Record<string, string> = {
  nouveau: "Nouveau",
  lu: "Lu",
  répondu: "Répondu",
};

export function MessagesAdmin() {
  const { t } = useLanguage();
  const d = t.admin.dash;
  const qc = useQueryClient();
  const runList = useServerFn(adminListMessages);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => (await runList()) as Message[],
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-messages"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const { unread, awaiting, recent } = useMemo(() => {
    const unread = data.filter((m) => m.status === "nouveau");
    const awaiting = data.filter(
      (m) => m.status !== "répondu" && !parseMessageMeta(m.message)?.reply,
    );
    return { unread, awaiting, recent: data };
  }, [data]);

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-gold" />;
  if (data.length === 0)
    return <p className="text-muted-foreground">{d.messages.empty}</p>;

  return (
    <div className="space-y-8">
      <Section title={d.messages.unread} count={unread.length} empty={d.messages.none}>
        {unread.map((m) => (
          <MessageCard key={m.id} message={m} onSaved={refresh} />
        ))}
      </Section>
      <Section title={d.messages.awaiting} count={awaiting.length} empty={d.messages.none}>
        {awaiting.map((m) => (
          <MessageCard key={m.id} message={m} onSaved={refresh} />
        ))}
      </Section>
      <Section title={d.messages.recent} count={recent.length} empty={d.messages.none}>
        {recent.map((m) => (
          <MessageCard key={m.id} message={m} onSaved={refresh} />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
        {title}
        <Badge variant="secondary">{count}</Badge>
      </h2>
      {count === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </div>
  );
}

function MessageCard({
  message,
  onSaved,
}: {
  message: Message;
  onSaved: () => void;
}) {
  const { t, lang } = useLanguage();
  const d = t.admin.dash;
  const runUpdate = useServerFn(adminUpdateMessage);
  const meta = parseMessageMeta(message.message);
  const body = stripMessageMeta(message.message);
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState(meta?.reply ?? "");
  const [saving, setSaving] = useState(false);

  const fmtDate = (s: string) => {
    const dt = new Date(s);
    return Number.isNaN(dt.getTime()) ? s : dt.toLocaleDateString(lang);
  };

  const setStatus = async (status: "lu" | "répondu") => {
    setSaving(true);
    try {
      await runUpdate({ data: { id: message.id, status } });
      toast.success(STATUS_LABEL[status]);
      onSaved();
    } catch {
      toast.error("Erreur");
    }
    setSaving(false);
  };

  const sendReply = async () => {
    setSaving(true);
    try {
      await runUpdate({ data: { id: message.id, status: "répondu", reply: reply.trim() } });
      toast.success(STATUS_LABEL["répondu"]);
      onSaved();
    } catch {
      toast.error("Erreur");
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
        {[message.phone, message.email].filter(Boolean).join(" · ") || "—"} · {fmtDate(message.created_at)}
      </p>
      {meta?.subject && <p className="mt-2 font-medium">{meta.subject}</p>}
      <p className="mt-1 whitespace-pre-line text-sm">{body}</p>

      {meta?.reply && !open && (
        <div className="mt-3 rounded-lg border border-gold/30 bg-gold/5 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">
            {t.account.support.reply}
          </p>
          <p className="mt-1 whitespace-pre-line">{meta.reply}</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
        {message.status === "nouveau" && (
          <Button variant="outline" size="sm" disabled={saving} onClick={() => setStatus("lu")}>
            <MailOpen className="h-4 w-4" /> {d.messages.markRead}
          </Button>
        )}
        {message.status !== "répondu" && (
          <Button variant="outline" size="sm" disabled={saving} onClick={() => setStatus("répondu")}>
            <CheckCheck className="h-4 w-4" /> {d.messages.markReplied}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {d.messages.open}
        </Button>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-gold" />}
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          <Textarea
            rows={3}
            value={reply}
            maxLength={5000}
            onChange={(e) => setReply(e.target.value)}
            placeholder={t.account.support.contentPlaceholder}
          />
          <Button variant="gold" size="sm" disabled={saving || !reply.trim()} onClick={sendReply}>
            <Send className="h-4 w-4" /> {t.account.support.send}
          </Button>
        </div>
      )}
    </div>
  );
}
