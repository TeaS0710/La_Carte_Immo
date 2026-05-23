const taux = [
  { duree: "10 ans", taux: "2,95 %" },
  { duree: "15 ans", taux: "3,15 %" },
  { duree: "20 ans", taux: "3,25 %" },
  { duree: "25 ans", taux: "3,40 %" },
];

export default function TauxSection() {
  return (
    <section className="bg-[#f8f9fa] border-b border-[color:var(--line-soft)] py-20 md:py-24">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-[1fr_1.3fr] gap-10 lg:gap-16 items-center">
        <div>
          <div className="text-[12px] uppercase tracking-[0.18em] text-[color:var(--brand-strong)] mb-3">
            Indicatif · {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </div>
          <h2 className="text-3xl md:text-[2.5rem] font-semibold tracking-tight text-ink leading-tight text-balance">
            Les taux fixes du mois
          </h2>
          <p className="text-ink-soft mt-4 leading-relaxed max-w-md">
            Taux pouvant varier d&apos;une région à l&apos;autre. Votre courtier
            dédié les renégocie pour vous auprès de chaque banque partenaire.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[color:var(--line)] divide-y divide-[color:var(--line-soft)] overflow-hidden">
          {taux.map((t) => (
            <div
              key={t.duree}
              className="flex items-center justify-between px-6 md:px-7 py-5"
            >
              <div className="text-ink font-medium text-lg">{t.duree}</div>
              <div className="tabular text-[color:var(--brand-strong)] font-semibold text-2xl">
                {t.taux}
              </div>
            </div>
          ))}
          <div className="px-6 md:px-7 py-3.5 bg-[#f8f9fa] text-[12px] text-ink-mute text-center">
            Taux nominaux indicatifs hors assurance, sous réserve d&apos;acceptation du dossier
          </div>
        </div>
      </div>
    </section>
  );
}
