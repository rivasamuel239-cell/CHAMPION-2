import { db } from "@/lib/db";
import { requirePerm } from "@/lib/session";
import { ActionForm } from "@/components/ActionForm";
import { createGroup, groupAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function GroupesPage({ searchParams }: { searchParams: { e?: string } }) {
  await requirePerm("groups:manage");
  const [groups, free] = await Promise.all([
    db.group.findMany({ orderBy: { name: "asc" }, include: { clubs: { include: { club: { select: { id: true, name: true } } } } } }),
    db.club.findMany({ where: { status: "VALIDATED", groupLink: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <h1>Groupes</h1>
      {searchParams.e && <p className="msg err" role="alert">{searchParams.e}</p>}
      <div className="card"><h2>Créer un groupe</h2>
        <ActionForm action={createGroup}>
          <label htmlFor="name">Nom (ex. Groupe A)</label><input id="name" name="name" required maxLength={20} />
          <button className="btn" type="submit">Créer</button>
        </ActionForm>
      </div>
      {groups.length === 0 && <p className="muted">Aucun groupe.</p>}
      {groups.map((g) => (
        <div className="card" key={g.id}>
          <h2>{g.name} <span className={`tag ${g.published ? "g" : ""}`}>{g.published ? "Publié" : "Non publié"}</span></h2>
          {g.clubs.map((gc) => (
            <form action={groupAction} className="li" key={gc.clubId}>
              <span>{gc.club.name}</span>
              <input type="hidden" name="groupId" value={g.id} /><input type="hidden" name="clubId" value={gc.clubId} />
              <button className="btn alt" name="intent" value="remove" style={{ margin: 0 }}>Retirer</button>
            </form>
          ))}
          <form action={groupAction}>
            <input type="hidden" name="groupId" value={g.id} />
            <label htmlFor={`c-${g.id}`}>Ajouter un club validé</label>
            <select id={`c-${g.id}`} name="clubId" disabled={free.length === 0}>{free.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <button className="btn" name="intent" value="add" disabled={free.length === 0}>Ajouter</button>
            <button className="btn alt" name="intent" value="publish">{g.published ? "Retirer de la publication" : "Publier"}</button>
          </form>
        </div>
      ))}
    </>
  );
}
