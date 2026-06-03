import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, CalendarCheck, Star, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n/language-context";
import { adminListUsers } from "@/lib/admin.functions";

interface AdminUser {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  reservations: number;
  reviews: number;
  messages: number;
}

export function UsersAdmin() {
  const { t, lang } = useLanguage();
  const d = t.admin.dash;
  const runList = useServerFn(adminListUsers);
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await runList()) as AdminUser[],
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((u) =>
      `${u.full_name ?? ""} ${u.email ?? ""}`.toLowerCase().includes(q),
    );
  }, [data, search]);

  const fmtDate = (s: string) => {
    const dt = new Date(s);
    return Number.isNaN(dt.getTime()) ? s : dt.toLocaleDateString(lang);
  };

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-gold" />;
  if (data.length === 0)
    return <p className="text-muted-foreground">{d.users.empty}</p>;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={d.users.search}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">{d.users.none}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <div key={u.id} className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{u.full_name || d.users.unnamed}</p>
                  <p className="truncate text-sm text-muted-foreground">{u.email ?? "—"}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {d.users.registered}: {fmtDate(u.created_at)}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 border-t border-border/50 pt-3 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarCheck className="h-4 w-4 text-gold" />
                  {u.reservations} <span className="text-muted-foreground">{d.users.reservations}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-gold" />
                  {u.reviews} <span className="text-muted-foreground">{d.users.reviews}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-gold" />
                  {u.messages} <span className="text-muted-foreground">{d.users.messages}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
