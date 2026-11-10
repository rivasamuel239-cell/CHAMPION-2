"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requirePerm } from "@/lib/session";
import type { FormState } from "@/lib/form-state";

const done = (msg?: string): never => redirect(msg ? `/admin/groupes?e=${encodeURIComponent(msg)}` : "/admin/groupes");

export async function createGroup(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requirePerm("groups:manage");
  const parsed = z.string().trim().min(1, "Nom du groupe requis.").max(20, "Nom trop long.").safeParse(fd.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const champ = await db.championship.findFirst();
  if (!champ) return { error: "Aucune édition configurée." };
  try {
    const g = await db.group.create({ data: { championshipId: champ.id, name: parsed.data } });
    await audit({ userId: user.id, action: "GROUP_CREATED", entity: "Group", entityId: g.id, after: { name: g.name } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "Ce groupe existe déjà." };
    return { error: "Création impossible." };
  }
  revalidatePath("/admin/groupes");
  return { ok: "Groupe créé." };
}

export async function groupAction(fd: FormData) {
  const user = await requirePerm("groups:manage");
  const intent = String(fd.get("intent") ?? "");
  const groupId = String(fd.get("groupId") ?? "");
  const clubId = String(fd.get("clubId") ?? "");
  const group = await db.group.findUnique({ where: { id: groupId }, select: { id: true, published: true } });
  if (!group) return done("Groupe introuvable.");
  if (intent === "add") {
    const club = await db.club.findUnique({ where: { id: clubId }, select: { status: true } });
    if (!club || club.status !== "VALIDATED") return done("Seul un club validé peut rejoindre un groupe.");
    try { await db.groupClub.create({ data: { groupId, clubId } }); }
    catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return done("Ce club est déjà dans un groupe.");
      throw e;
    }
  } else if (intent === "remove") {
    await db.groupClub.deleteMany({ where: { groupId, clubId } });
  } else if (intent === "publish") {
    await db.group.update({ where: { id: groupId }, data: { published: !group.published } });
  } else return done("Action inconnue.");
  await audit({ userId: user.id, action: `GROUP_${intent.toUpperCase()}`, entity: "Group", entityId: groupId, after: clubId ? { clubId } : undefined });
  revalidatePath("/admin/groupes");
  revalidatePath("/equipes");
  return done();
}
