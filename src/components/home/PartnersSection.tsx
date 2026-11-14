
import Section from '@/components/ui/Section';

const partners = [
  { name: "Heineken", logo: "/uploads/aada4820-3f12-4185-9af6-811f30795a93.png", scale: 1.3 },
  { name: "Lindoya", logo: "/uploads/lindoya-logo.png", scale: 1.3 },
  { name: "FMU", logo: "/uploads/e0d3d03b-c1d5-4a6e-9a61-3a1c2a707b5f.png", scale: 1.4 },
  { name: "Anhembi Morumbi", logo: "/uploads/f5e74a47-fc77-4b34-970e-e839080310fd.png", scale: 1.1 },
  { name: "Cruzeiro do Sul", logo: "/uploads/cruzeiro-site-dark.svg", scale: 1.25 },
  { name: "Agence", logo: "/uploads/6c09375e-5298-4672-9226-27eb60a6b038.png", scale: 1.3 },
  { name: "BLDN", logo: "/uploads/oftw/694c77062fe4f1854fadf797.svg", scale: 1.3 },
  { name: "Idee Seguros", logo: "/uploads/oftw/694c73dcdda192452a508485.png", scale: 1.4 },
  { name: "Emagrecentro", logo: "/uploads/emagrecentro-logo-new.png", scale: 1.8 },
  { name: "BT", logo: "/uploads/bt-logo-new.png", scale: 1.4 },
  { name: "Tegra", logo: "/uploads/tegra-logo-new.png", scale: 1.6 },
  { name: "Tikpag", logo: "/uploads/tikpag-logo-final.png", scale: 1.6 },
  { name: "Placlux", logo: "/uploads/oftw/694c76cfe889d38ced51667d.png", scale: 1.3 },
  { name: "Funnels", logo: "/brand/funnels-logo-white.png", scale: 1.3 },
  { name: "ENICS", logo: "/uploads/a05718ad-1822-4102-909a-7e86af151e98.png", scale: 1.4 }
];

const PartnersSection = () => {
  const renderLogos = () => (
    <>
      {partners.map((partner, index) => (
        <div
          key={index}
          className="flex-shrink-0 flex items-center justify-center w-52 h-24 px-4 overflow-hidden transition-all duration-300"
        >
          <img
            src={partner.logo}
            alt={partner.name}
            style={{
              transform: partner.scale ? `scale(${partner.scale})` : 'scale(1)',
            }}
            className="max-h-14 max-w-[170px] w-auto object-contain opacity-90 hover:opacity-100 hover:scale-105 transition-all duration-500 filter drop-shadow-xs"
          />
        </div>
      ))}
    </>
  );

  return (
    <Section variant="light" className="bg-white py-12 md:py-16 overflow-hidden">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <img
            src="/brand/revhackers-wordmark-white.png"
            alt="RevHackers Logo"
            className="h-6 sm:h-7 w-auto brightness-0 transition-all"
          />
        </div>
        <span className="text-zinc-500 text-xs font-bold tracking-wider uppercase">
          Empresas que confiam na RevHackers
        </span>
      </div>

      <div
        className="relative flex overflow-hidden"
        style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}
      >
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-100%); }
          }
          .animate-marquee-infinite {
            animation: marquee 45s linear infinite;
          }
        `}</style>

        <div className="flex min-w-fit animate-marquee-infinite items-center gap-16 px-8">
          {renderLogos()}
        </div>
        <div className="flex min-w-fit animate-marquee-infinite items-center gap-16 px-8" aria-hidden="true">
          {renderLogos()}
        </div>
        <div className="flex min-w-fit animate-marquee-infinite items-center gap-16 px-8 hidden 2xl:flex" aria-hidden="true">
          {renderLogos()}
        </div>
      </div>
    </Section>
  );
};

export default PartnersSection;
