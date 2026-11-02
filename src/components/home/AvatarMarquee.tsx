/* eslint-disable @next/next/no-img-element */

type Person = { handle: string; name: string };

const COLUMNS: { people: Person[]; direction: "up" | "down"; duration: string }[] = [
  {
    direction: "up",
    duration: "46s",
    people: [
      { handle: "elonmusk", name: "Elon Musk" },
      { handle: "vladtenev", name: "Vlad Tenev" },
      { handle: "naval", name: "Naval" },
    ],
  },
  {
    direction: "down",
    duration: "38s",
    people: [
      { handle: "sama", name: "Sam Altman" },
      { handle: "karpathy", name: "Andrej Karpathy" },
      { handle: "jessepollak", name: "Jesse Pollak" },
    ],
  },
  {
    direction: "up",
    duration: "52s",
    people: [
      { handle: "VitalikButerin", name: "Vitalik Buterin" },
      { handle: "brian_armstrong", name: "Brian Armstrong" },
      { handle: "balajis", name: "Balaji" },
    ],
  },
  {
    direction: "down",
    duration: "42s",
    people: [
      { handle: "nikitabier", name: "Nikita Bier" },
      { handle: "pmarca", name: "Marc Andreessen" },
      { handle: "rajgokal", name: "Raj Gokal" },
    ],
  },
];

/** Four columns of avatars scrolling in alternating directions. Each column is doubled for a seamless loop. */
export function AvatarMarquee() {
  return (
    <div className="marquee fade-y relative h-full overflow-hidden px-4 pt-4">
      <div className="grid h-full grid-cols-4 gap-3">
        {COLUMNS.map((col, c) => {
          const tiles = [...col.people, ...col.people];
          return (
            <div key={c} className="relative overflow-hidden">
              <div
                className="marquee-col flex flex-col gap-3"
                data-direction={col.direction}
                style={{ "--duration": col.duration } as React.CSSProperties}
              >
                {tiles.map((p, i) => (
                  <div
                    key={`${p.handle}-${i}`}
                    className={`relative shrink-0 overflow-hidden rounded-2xl bg-card-2 ${
                      (i + c) % 3 === 1 ? "aspect-[4/5]" : "aspect-square"
                    }`}
                  >
                    <img
                      src={`/api/avatar/${p.handle}?s=400`}
                      alt={p.name}
                      loading={i < col.people.length ? "eager" : "lazy"}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 truncate rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium leading-none text-white backdrop-blur">
                      {p.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
