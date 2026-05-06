'use client';

import { useState } from 'react';

type BrandItem = {
  name: string;
  slug: string;
  badge: string;
  src: string;
  tint: string;
};

const SUPPORTING_BRANDS: BrandItem[] = [
  { name: '0x402', slug: '0x402', badge: 'S', src: '/brand/ecosystem/0x402.png', tint: 'from-[#93c5fd]/20 to-[#1d4ed8]/20' },
  { name: 'Jupiter', slug: 'jupiter', badge: 'J', src: '/brand/ecosystem/jupiter.png', tint: 'from-[#5eead4]/18 to-[#0f766e]/18' },
  { name: 'Pyth', slug: 'pyth', badge: 'P', src: '/brand/ecosystem/pyth.png', tint: 'from-[#ffffff]/14 to-[#6b7280]/14' },
  { name: 'Supabase', slug: 'supabase', badge: 'S', src: '/brand/ecosystem/supabase.png', tint: 'from-[#4ade80]/18 to-[#166534]/18' },
  { name: 'Superteamind', slug: 'superteamind', badge: 'ST', src: '/brand/ecosystem/superteamind.png', tint: 'from-[#d8b4fe]/18 to-[#7c3aed]/18' },
  { name: 'Helius', slug: 'helius', badge: 'H', src: '/brand/ecosystem/helius.png', tint: 'from-[#fdba74]/18 to-[#ea580c]/18' },
  { name: 'Solana', slug: 'solana', badge: '◎', src: '/brand/ecosystem/solana.png', tint: 'from-[#14f195]/18 to-[#9945ff]/18' },
];

function BrandTile({ brand }: { brand: BrandItem }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div
      className={`group flex h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-[18px] border border-white/10 bg-gradient-to-br ${brand.tint} shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-md`}
      aria-label={brand.name}
      title={brand.name}
    >
      {!imageFailed ? (
        <img
          src={brand.src}
          alt={brand.name}
          className="h-full w-full object-cover object-center scale-[1.12] transition-transform duration-500 group-hover:scale-[1.18]"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
          <span className="font-sans text-[22px] font-semibold tracking-tight text-white/90 drop-shadow-[0_1px_10px_rgba(0,0,0,0.35)]">
            {brand.badge}
          </span>
        </div>
      )}
    </div>
  );
}

export default function BrandEcosystemStrip() {
  return (
    <div className="flex w-full justify-end pt-8 mt-auto">
      <div className="w-[min(92vw,720px)]">
        <div className="flex flex-col items-end gap-3">
          <div className="pr-2 text-right">
            <div className="font-sans text-[10px] font-semibold uppercase tracking-[0.34em] text-white/56">
              Ecosystem
            </div>
            <div className="mt-1 font-sans text-xs font-medium text-white/74 uppercase tracking-[0.18em]">
              stack
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {SUPPORTING_BRANDS.map((brand) => (
              <BrandTile key={brand.slug} brand={brand} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
