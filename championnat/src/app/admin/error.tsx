"use client";
export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (<div className="card"><h2>Action impossible</h2><p>Vous n’avez pas les droits nécessaires, ou une erreur est survenue.</p><button className="btn" onClick={reset}>Réessayer</button></div>);
}
