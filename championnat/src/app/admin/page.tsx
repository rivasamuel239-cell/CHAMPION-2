import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const u = await requireUser();
  const champ = await db.championship.findFirst();
  const [total, validated, pending, suspended, groups] = await Promise.all([
    db.club.count({ where: { status: { not: "REJECTED" } } }),
    db.club.count({ where: { status: "VALIDATED" } }),
    db.club.count({ where: { status: "PENDING" } }),
    db.club.count({ where: { status: "SUSPENDED" } }),
    db.group.count(),
  ]);
  const logs = can(u.role, "audit:read") ? await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } }) : [];
  const K = ({ l, v }: { l: string; v: string | number }) => (<div className="card"><div className="muted">{l}</div><div className="kpi">{v}</div></div>);
  return (
    <>
      <h1>Tableau de bord</h1><p className="muted">{champ?.name} · édition {champ?.year}</p>
      <div className="row">
        <K l="Clubs validés" v={`${validated} / ${champ?.maxClubs ?? 16}`} /><K l="Clubs inscrits" v={total} />
        <K l="En attente de validation" v={pending} /><K l="Suspendus" v={suspended} /><K l="Groupes" v={groups} />
      </div>
      {logs.length > 0 && (<div className="card"><h2>Dernières activités</h2>{logs.map((l) => (
        <div className="li" key={l.id}><span>{l.action} · {l.entity}</span><span className="muted">{l.user?.name ?? "système"} · {l.createdAt.toLocaleString("fr-FR")}</span></div>))}</div>)}
    </>
  );
}
