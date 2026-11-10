import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("Seed : SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD absents, création du compte ignorée.");
  } else {
    if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD : 12 caractères minimum.");
    const exists = await db.user.findUnique({ where: { email } });
    if (!exists) {
      await db.user.create({ data: { email, name: "Super administrateur", role: "SUPER_ADMIN", passwordHash: await hash(password) } });
      console.log("Seed : super administrateur créé.");
    } else console.log("Seed : le compte existe déjà, mot de passe inchangé.");
  }
  if ((await db.championship.count()) === 0) {
    await db.championship.create({
      data: { year: new Date().getFullYear(), maxClubs: 16, tiebreakers: ["POINTS", "HEAD_TO_HEAD", "GOAL_DIFFERENCE", "GOALS_FOR"] },
    });
    console.log("Seed : édition créée (nom provisoire).");
  }
}
main().finally(() => db.$disconnect());
