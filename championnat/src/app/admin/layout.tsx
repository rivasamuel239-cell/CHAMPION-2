import Link from "next/link";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  async function logout() { "use server"; await signOut({ redirectTo: "/" }); }
  return (
    <>
      <header className="hdr">
        <strong>Administration</strong>
        <Link href="/admin">Tableau de bord</Link>
        {can(u.role, "clubs:write") && <Link href="/admin/clubs">Clubs</Link>}
        {can(u.role, "groups:manage") && <Link href="/admin/groupes">Groupes</Link>}
        {can(u.role, "settings:manage") && <Link href="/admin/parametres">Paramètres</Link>}
        <span className="sp" /><span>{u.name}</span>
        <form action={logout}><button className="btn light" type="submit">Se déconnecter</button></form>
      </header>
      <main className="wrap">{children}</main>
    </>
  );
}
