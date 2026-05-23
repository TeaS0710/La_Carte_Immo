import Image from "next/image";

export default function CertifsStrip() {
  return (
    <section className="bg-white border-b border-[color:var(--line-soft)] py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-center text-[14px] text-ink-soft">
        <div className="flex items-center gap-3">
          <Image
            src="/prelys/cncef.png"
            alt="CNCEF"
            width={56}
            height={56}
            className="h-10 w-auto object-contain"
          />
          <span>Membre du CNCEF Crédit</span>
        </div>
        <span className="hidden sm:inline text-[color:var(--line)]">·</span>
        <span>Réseau noté 4,9 / 5 sur Google par 7 253 avis</span>
        <span className="hidden sm:inline text-[color:var(--line)]">·</span>
        <span>Plus de 35 agences en France</span>
      </div>
    </section>
  );
}
