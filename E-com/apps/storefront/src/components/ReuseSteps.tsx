const MONO = "var(--font-mono), ui-monospace, monospace"

const STEPS = [
  {
    n: "01",
    who: "You",
    title: "Order your case",
    body: "A prepaid reuse envelope rides along in every box.",
    scene: StampScene,
  },
  {
    n: "02",
    who: "You",
    title: "Pack the old one",
    body: "Any brand, any model — into the envelope it goes.",
    scene: PackScene,
  },
  {
    n: "03",
    who: "Courier",
    title: "Hand it back",
    body: "Give it to your delivery partner. Same drop, zero detour.",
    scene: HandoverScene,
  },
  {
    n: "04",
    who: "Flowcase",
    title: "10% lands",
    body: "We scan the envelope and REUSE10 hits your inbox.",
    scene: DiscountScene,
  },
]

/**
 * "How it works" — visual-first transparency strip. Each card carries a
 * line-art scene (order stamp, faded packaging, courier handover, 10% ticket)
 * plus one short sentence instead of a heavy paragraph.
 */
export function ReuseSteps() {
  return (
    <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6 sm:py-18">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-center lg:justify-between lg:items-end lg:text-left">
        <p className="label text-muted-foreground">01 — How it works</p>
        <p className="label text-muted-foreground">Four steps · zero paperwork</p>
      </div>
      <div className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step) => {
          const Scene = step.scene
          return (
            <div key={step.n} className="group bg-background p-5 lg:p-6">
              <div className="relative overflow-hidden border border-border bg-muted/60 scene-bg">
                <Scene />
                <span className="label absolute left-3 top-3 flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground" aria-hidden="true" />
                  {step.who}
                </span>
              </div>
              <div className="mt-5 flex items-baseline gap-3">
                <span className="display-tight font-display text-3xl font-bold text-foreground">
                  {step.n}
                </span>
                <h2 className="display-tight font-display text-lg font-semibold">
                  {step.title}
                </h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ── Scenes ─────────────────────────────────────────────────── */

function Scene({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 320 176"
      role="img"
      aria-hidden="true"
      className="h-full w-full text-foreground transition-transform duration-500 ease-out group-hover:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
      fill="none"
    >
      {children}
    </svg>
  )
}

export function StampScene() {
  return (
    <Scene>
      {/* parcel */}
      <rect x="52" y="58" width="126" height="88" stroke="currentColor" strokeWidth="2.5" />
      <path d="M115 58v88" stroke="currentColor" strokeWidth="2.5" />
      <path d="M52 78c18-6 30-6 48 0s30 6 48 0 30-6 30-6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 5" />
      {/* rubber stamp — presses down on a loop */}
      <g className="scene-stamp">
        <g transform="rotate(-12 224 96)">
          <rect x="158" y="66" width="132" height="58" stroke="#0700ff" strokeWidth="2.5" />
          <rect x="164" y="72" width="120" height="46" stroke="#0700ff" strokeWidth="1.5" strokeDasharray="5 4" />
          <text x="224" y="95" textAnchor="middle" fontFamily={MONO} fontSize="13" fontWeight="700" letterSpacing="1.5" fill="#0700ff">
            ORDER PLACED
          </text>
          <text x="224" y="111" textAnchor="middle" fontFamily={MONO} fontSize="9" letterSpacing="1.2" fill="#0700ff">
            #FC-2049 · 25 SEP
          </text>
        </g>
      </g>
    </Scene>
  )
}

export function PackScene() {
  return (
    <Scene>
      {/* packaging — deliberately faded */}
      <g opacity="0.4">
        <path d="M40 84h96v66H40z" stroke="currentColor" strokeWidth="2.5" />
        <path d="M40 84l24-34h96l-24 34" stroke="currentColor" strokeWidth="2.5" />
        <path d="M136 84l24-34v66l-24 34" stroke="currentColor" strokeWidth="2.5" />
        <path d="M188 66h94v70h-94z" stroke="currentColor" strokeWidth="2.5" />
        <path d="M188 66l47 34 47-34" stroke="currentColor" strokeWidth="2.5" />
        <path d="M188 136l38-30M282 136l-38-30" stroke="currentColor" strokeWidth="1.5" />
      </g>
      {/* old case — full signal, mid-arc into the envelope */}
      <path
        d="M126 118c34-44 62-50 84-36"
        stroke="#0700ff"
        strokeWidth="2"
        strokeDasharray="5 5"
        strokeLinecap="round"
        className="scene-dash"
      />
      <g transform="rotate(14 200 74)">
        <rect x="178" y="34" width="44" height="76" rx="9" stroke="#0700ff" strokeWidth="2.5" />
        <rect x="188" y="44" width="20" height="20" rx="5" fill="#0700ff" />
        <circle cx="217" cy="98" r="3" fill="#0700ff" />
      </g>
    </Scene>
  )
}

function HandoverScene() {
  return (
    <Scene>
      {/* sender */}
      <circle cx="58" cy="64" r="16" stroke="currentColor" strokeWidth="2.5" />
      <path d="M30 150c0-26 12-44 28-44s28 18 28 44" stroke="currentColor" strokeWidth="2.5" />
      <path d="M86 108l34 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* courier with cap + shoulder bag */}
      <circle cx="252" cy="60" r="16" stroke="currentColor" strokeWidth="2.5" />
      <path d="M236 52c2-12 10-18 16-18s14 6 16 18" stroke="currentColor" strokeWidth="2.5" />
      <path d="M268 52h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M224 150c0-26 12-46 28-46s28 20 28 46" stroke="currentColor" strokeWidth="2.5" />
      <path d="M240 106l-14-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M264 112l14 14" stroke="currentColor" strokeWidth="2.5" />
      <rect x="272" y="124" width="30" height="26" stroke="currentColor" strokeWidth="2.5" />
      {/* envelope mid-handoff — floats between the hands */}
      <g className="scene-glide">
        <g transform="rotate(-6 160 106)">
          <rect x="126" y="86" width="68" height="44" stroke="#0700ff" strokeWidth="2.5" />
          <path d="M126 86l34 25 34-25" stroke="#0700ff" strokeWidth="2.5" />
          <circle cx="160" cy="116" r="7" fill="#0700ff" />
        </g>
      </g>
      <path
        d="M96 100h16M210 100h10"
        stroke="#0700ff"
        strokeWidth="2.5"
        strokeDasharray="5 5"
        strokeLinecap="round"
        className="scene-dash"
      />
    </Scene>
  )
}

export function DiscountScene() {
  return (
    <Scene>
      {/* ticket */}
      <path
        d="M46 46h228v28a12 12 0 000 24v28H46v-28a12 12 0 000-24z"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path d="M170 46v84" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" />
      <text x="108" y="105" textAnchor="middle" fontFamily="var(--font-display), sans-serif" fontSize="44" fontWeight="800" letterSpacing="-2" fill="currentColor">
        10%
      </text>
      <text x="222" y="86" textAnchor="middle" fontFamily={MONO} fontSize="13" fontWeight="700" letterSpacing="1.5" fill="currentColor">
        REUSE10
      </text>
      <text x="222" y="104" textAnchor="middle" fontFamily={MONO} fontSize="8.5" letterSpacing="1" fill="currentColor" opacity="0.6">
        NEXT ORDER
      </text>
      {/* applied badge */}
      <g transform="translate(258 34)">
        <g className="scene-pop">
          <circle r="17" fill="#0700ff" />
          <path d="M-7 0l5 6 10-12" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
    </Scene>
  )
}
