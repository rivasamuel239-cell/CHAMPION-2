import { db } from "@/lib/db";
import { requirePerm } from "@/lib/session";
import { ActionForm } from "@/components/ActionForm";
import { updateSettings } from "./actions";

export const dynamic = "force-dynamic";

export default async function Parametres() {
  await requirePerm("settings:manage");
  const c = await db.championship.findFirst();
  if (!c) return <p>Aucune édition configurée.</p>;
  return (
    <>
      <h1>Paramètres</h1>
      <div className="card">
        <ActionForm action={updateSettings}>
          <label htmlFor="name">Nom du championnat (provisoire, modifiable)</label><input id="name" name="name" defaultValue={c.name} required maxLength={80} />
          <label htmlFor="year">Année</label><input id="year" name="year" type="number" defaultValue={c.year} required min={2000} max={2100} />
          <label htmlFor="slogan">Slogan</label><input id="slogan" name="slogan" defaultValue={c.slogan ?? ""} maxLength={120} />
          <button className="btn" type="submit">Enregistrer</button>
        </ActionForm>
      </div>
    </>
  );
}
