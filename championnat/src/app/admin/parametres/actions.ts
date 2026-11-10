"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requirePerm } from "@/lib/session";
import type { FormState } from "@/lib/form-state";

const schema = z.object({
  name: z.string().trim().min(3, "Nom trop court.").max(80, "Nom trop long."),
  year: z.coerce.number().int().min(2000, "Année invalide.").max(2100, "Année invalide."),
  slogan: z.string().trim().max(120, "Slogan trop long.").optional(),
});

export async function updateSettings(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requirePerm("settings:manage");
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const champ = await db.championship.findFirst();
  if (!champ) return { error: "Aucune édition configurée." };
  await db.championship.update({ where: { id: champ.id }, data: { name: parsed.data.name, year: parsed.data.year, slogan: parsed.data.slogan || null } });
  await audit({ userId: user.id, action: "SETTINGS_UPDATED", entity: "Championship", entityId: champ.id, before: { name: champ.name }, after: { name: parsed.data.name } });
  revalidatePath("/"); revalidatePath("/admin");
  return { ok: "Paramètres enregistrés." };
}
