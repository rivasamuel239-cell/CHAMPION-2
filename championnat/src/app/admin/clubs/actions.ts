"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requirePerm } from "@/lib/session";
import { checkPng } from "@/lib/png";
import type { FormState } from "@/lib/form-state";

const clubSchema = z.object({
  name: z.string().trim().min(2, "Nom du club trop court.").max(60, "Nom du club trop long."),
  presidentName: z.string().trim().min(2, "Nom du président requis.").max(80),
  representative: z.string().trim().min(2, "Nom du représentant requis.").max(80),
  phone: z.string().trim().regex(/^[+0-9 ()-]{6,20}$/, "Numéro de téléphone invalide."),
  email: z.string().trim().email("Adresse e-mail invalide.").max(120),
  address: z.string().trim().min(2, "Adresse requise.").max(160),
  colors: z.string().trim().min(2, "Couleurs officielles requises.").max(60),
});

function fail(message: string): never {
  redirect(`/admin/clubs?e=${encodeURIComponent(message)}`);
}

export async function createClub(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requirePerm("clubs:write");
  const parsed = clubSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const champ = await db.championship.findFirst();
  if (!champ) return { error: "Aucune édition configurée." };
  try {
    const club = await db.$transaction(async (tx) => {
      const n = await tx.club.count({ where: { championshipId: champ.id, status: { not: "REJECTED" } } });
      if (n >= champ.maxClubs) throw new Error("LIMIT");
      return tx.club.create({ data: { ...parsed.data, championshipId: champ.id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await audit({ userId: user.id, action: "CLUB_CREATED", entity: "Club", entityId: club.id, after: { name: club.name } });
  } catch (e) {
    if (e instanceof Error && e.message === "LIMIT") return { error: `Limite atteinte : ${champ.maxClubs} clubs maximum, un nouveau club est refusé.` };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "Un club porte déjà ce nom." };
    return { error: "Enregistrement impossible, réessayez." };
  }
  revalidatePath("/admin/clubs");
  return { ok: "Club ajouté, en attente de validation." };
}

export async function uploadLogo(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requirePerm("clubs:write");
  const id = String(fd.get("clubId") ?? "");
  const file = fd.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisissez un fichier PNG." };
  if (file.size > 1_000_000) return { error: "Fichier trop lourd (1 Mo maximum)." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkPng(bytes);
  if (!check.ok) return { error: check.error };
  const club = await db.club.findUnique({ where: { id }, select: { id: true } });
  if (!club) return { error: "Club introuvable." };
  await db.club.update({ where: { id }, data: { logoPng: Buffer.from(bytes), hasLogo: true, logoValidated: false } });
  await audit({ userId: user.id, action: "CLUB_LOGO_UPLOADED", entity: "Club", entityId: id });
  revalidatePath("/admin/clubs");
  return { ok: "Logo envoyé : il doit maintenant être validé par un administrateur." };
}

export async function clubAction(fd: FormData) {
  const user = await requirePerm("clubs:validate");
  const intent = String(fd.get("intent") ?? "");
  const id = String(fd.get("clubId") ?? "");
  const club = await db.club.findUnique({ where: { id }, select: { id: true, status: true, hasLogo: true, logoValidated: true } });
  if (!club) return fail("Club introuvable.");
  if (intent === "validate_logo") {
    if (!club.hasLogo) return fail("Aucun logo n’a été envoyé.");
    await db.club.update({ where: { id }, data: { logoValidated: true } });
  } else if (intent === "validate") {
    if (!club.logoValidated) return fail("Validez d’abord le logo du club.");
    await db.club.update({ where: { id }, data: { status: "VALIDATED" } });
  } else if (intent === "refuse") {
    await db.$transaction([
      db.club.update({ where: { id }, data: { status: "REJECTED" } }),
      db.groupClub.deleteMany({ where: { clubId: id } }),
    ]);
  } else if (intent === "suspend") {
    await db.club.update({ where: { id }, data: { status: "SUSPENDED" } });
  } else return fail("Action inconnue.");
  await audit({ userId: user.id, action: `CLUB_${intent.toUpperCase()}`, entity: "Club", entityId: id, before: { status: club.status } });
  revalidatePath("/admin/clubs");
  revalidatePath("/");
  redirect("/admin/clubs");
}
