import type { Jersey } from '../types/jersey';

interface InstagramSectionProps {
  jerseys: Jersey[];
}

export function InstagramSection({ jerseys }: InstagramSectionProps) {
  const shots = jerseys.filter((j) => j.images.length > 0).slice(0, 3);

  return (
    <section className="px-5 py-14 sm:px-8">
      <h2 className="text-center font-display text-4xl font-900 tracking-tight uppercase sm:text-6xl">
        NOS <span className="text-outline">SIGA</span> NO INSTA!
      </h2>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <div>
          <p className="font-display text-3xl font-900 tracking-tight sm:text-4xl">@SOCCERPIKA</p>
          <a
            href="https://instagram.com/soccerpika"
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline mt-3 inline-block text-sm tracking-wide uppercase hover:text-brand"
          >
            Siga-nos no Instagram
          </a>
        </div>

        <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          {shots.map((jersey) => (
            <li key={jersey.id}>
              <a
                href="https://instagram.com/soccerpika"
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square overflow-hidden bg-surface"
              >
                <img
                  src={jersey.images[0]}
                  alt={jersey.name}
                  loading="lazy"
                  className="h-full w-full object-contain transition-transform duration-500 hover:scale-105"
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
