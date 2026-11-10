import { db } from "@/lib/db";
import { requirePerm } from "@/lib/session";
import { can } from "@/lib/permissions";
import { ActionForm } from "@/components/ActionForm";
import { clubAction, createClub, uploadLogo } from "./actions";

export const dynamic = "force-dynamic";
const LABEL = { PENDING: "En attente", VALIDATED: "Validé", REJECTED: "Refusé", SUSPENDED: "Suspendu", DRAFT: "Brouillon" } as const;

export default async function ClubsPage({ searchParams }: { searchParams: { e?: string } }) {
  const u = await requirePerm("clubs:write");
  const champ = await db.championship.findFirst();
  const clubs = champ ? await db.club.findMany({
    where: { championshipId: champ.id }, orderBy: { name: "asc" },
    select: { id: true, name: true, status: true, hasLogo: true, logoValidated: true, presidentName: true, phone: true, email: true },
  }) : [];
  const active = clubs.filter((c) => c.status !== "REJECTED").length;
  const canValidate = can(u.role, "clubs:validate");
  return (
    <>
      <h1>Clubs <span className="tag">{active} / {champ?.maxClubs ?? 16}</span></h1>
      {searchParams.e && <p className="msg err" role="alert">{searchParams.e}</p>}
      <div className="card"><h2>Inscrire un club</h2>
        <ActionForm action={createClub}>
          <div className="row">
            <div><label htmlFor="name">Nom officiel</label><input id="name" name="name" required maxLength={60} /></div>
            <div><label htmlFor="presidentName">Président / responsable</label><input id="presidentName" name="presidentName" required maxLength={80} /></div>
            <div><label htmlFor="representative">Représentant du club</label><input id="representative" name="representative" required maxLength={80} /></div>
            <div><label htmlFor="phone">Téléphone</label><input id="phone" name="phone" type="tel" required maxLength={20} /></div>
            <div><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" required maxLength={120} /></div>
            <div><label htmlFor="address">Adresse / localisation</label><input id="address" name="address" required maxLength={160} /></div>
            <div><label htmlFor="colors">Couleurs officielles</label><input id="colors" name="colors" required maxLength={60} /></div>
          </div>
          <button className="btn" type="submit" disabled={active >= (champ?.maxClubs ?? 16)}>Ajouter le club</button>
        </ActionForm>
        <p className="muted">Le logo (PNG à fond transparent) est envoyé ensuite, puis validé avant l’inscription des joueurs.</p>
      </div>
      <div className="card"><h2>Liste des clubs</h2>
        {clubs.length === 0 && <p className="muted">Aucun club.</p>}
        {clubs.map((c) => (
          <div className="li" key={c.id} style={{ alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: ".8rem" }}>
              {c.hasLogo ? <img className="logo-prev" src={`/api/logo/${c.id}`} alt={`Logo ${c.name}`} /> : <div className="logo-prev" />}
              <div><strong>{c.name}</strong><br /><span className="muted">{c.presidentName} · {c.phone} · {c.email}</span><br />
                <span className={`tag ${c.status === "VALIDATED" ? "g" : c.status === "REJECTED" ? "r" : ""}`}>{LABEL[c.status]}</span>{" "}
                <span className={`tag ${c.logoValidated ? "g" : ""}`}>{c.logoValidated ? "Logo validé" : c.hasLogo ? "Logo à valider" : "Logo manquant"}</span></div>
            </div>
            <div style={{ minWidth: 240 }}>
              <ActionForm action={uploadLogo}>
                <input type="hidden" name="clubId" value={c.id} />
                <input type="file" name="logo" accept="image/png" required />
                <button className="btn alt" type="submit">Envoyer le logo</button>
              </ActionForm>
              {canValidate && (
                <form action={clubAction}>
                  <input type="hidden" name="clubId" value={c.id} />
                  <button className="btn" name="intent" value="validate_logo" disabled={!c.hasLogo || c.logoValidated}>Valider le logo</button>
                  <button className="btn" name="intent" value="validate" disabled={!c.logoValidated || c.status === "VALIDATED"}>Valider le club</button>
                  <button className="btn alt" name="intent" value="suspend" disabled={c.status !== "VALIDATED"}>Suspendre</button>
                  <button className="btn alt" name="intent" value="refuse" disabled={c.status === "REJECTED"}>Refuser</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
