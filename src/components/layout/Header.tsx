import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ChevronDown, Activity, Users, TrendingUp, BarChart2, Lock, User, ArrowRight, Settings, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from "@/lib/utils";
import ContactFormModal from '@/components/shared/ContactFormModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  variant?: 'default' | 'light';
}

const Header = ({ variant = 'default' }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isMobile = useIsMobile();

  // Helper variables for styling based on variant/scroll state
  const isLightMode = variant === 'light' && !scrolled;

  const textColor = scrolled ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-300 hover:text-white";
  const hoverBg = scrolled ? "hover:bg-zinc-50" : "hover:bg-white/10";
  const logoClass = scrolled ? "brightness-0" : "";

  const NavLink = ({ to, children }: { to: string, children: React.ReactNode }) => (
    <Link
      to={to}
      className="px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap rounded-lg text-zinc-300 hover:text-white hover:bg-white/10"
      onClick={() => window.scrollTo(0, 0)}
    >
      {children}
    </Link>
  );

  const MobileNavLink = ({ to, onClick, children }: { to: string, onClick: () => void, children: React.ReactNode }) => (
    <Link
      to={to}
      className="text-xl font-medium transition-colors py-2 border-b block text-zinc-800 border-zinc-100 hover:text-[#00CC6A]"
      onClick={onClick}
    >
      {children}
    </Link>
  );

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const scrollToTop = () => {
    window.scrollTo(0, 0);
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="w-full fixed top-0 left-0 right-0 z-[60] bg-black border-b border-zinc-800 py-3 transition-all duration-300">
        <div className="container-custom flex justify-between items-center relative gap-4">
          {/* Left: Logo */}
          <div className="flex items-center gap-4 z-10 flex-shrink-0">
            <Link to="/" onClick={scrollToTop} className="block group">
              <img
                src="/brand/revhackers-wordmark-white.png"
                alt="RevHackers Logo"
                className="w-44 sm:w-48 lg:w-52 max-w-full h-auto transition-all duration-300 group-hover:opacity-90"
              />
            </Link>
          </div>

          {/* Center: Navigation */}
          <nav className="hidden xl:flex items-center justify-center flex-1">
            <div className="flex items-center rounded-xl px-2 py-1 border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
              <div className="flex items-center space-x-1">
                <NavLink to="/">Home</NavLink>
                <div className="w-px h-3 mx-1 bg-zinc-200" />

                <DropdownMenu>
                  <DropdownMenuTrigger className="px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 rounded-lg focus:outline-none data-[state=open]:text-[#00CC6A] text-zinc-300 hover:text-white hover:bg-white/10">
                    Auditoria <ChevronDown className="w-3 h-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent sideOffset={8} className="bg-white border border-zinc-200 p-1.5 w-[260px] z-[70] rounded-xl shadow-lg">
                    <DropdownMenuItem asChild>
                      <Link to="/score" className="flex items-center gap-2.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 cursor-pointer px-3 py-2 rounded-lg text-sm font-medium" onClick={scrollToTop}>
                        <Activity className="w-4 h-4 text-zinc-400" /> Diagnóstico 360
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/score-revenue" className="flex items-center gap-2.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 cursor-pointer px-3 py-2 rounded-lg text-sm font-medium" onClick={scrollToTop}>
                        <TrendingUp className="w-4 h-4 text-zinc-400" /> Diagnóstico CRM
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/score-founder" className="flex items-center gap-2.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 cursor-pointer px-3 py-2 rounded-lg text-sm font-medium" onClick={scrollToTop}>
                        <Users className="w-4 h-4 text-zinc-400" /> Diagnóstico do Fundador
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/score-site" className="flex items-center gap-2.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 cursor-pointer px-3 py-2 rounded-lg text-sm font-medium" onClick={scrollToTop}>
                        <Globe className="w-4 h-4 text-zinc-400" /> Diagnóstico Site / LP
                      </Link>
                    </DropdownMenuItem>
                    <div className="h-px bg-zinc-100 my-1" />
                    <DropdownMenuItem asChild>
                      <Link to="/diagnostico" className="flex items-center gap-2.5 text-zinc-900 hover:bg-zinc-50 cursor-pointer px-3 py-2 rounded-lg text-sm font-semibold" onClick={scrollToTop}>
                        <BarChart2 className="w-4 h-4 text-zinc-900" /> Ver Todas as Auditorias
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="w-px h-3 mx-1 bg-zinc-800" />
                <NavLink to="/metodologia">Metodologia</NavLink>
                <div className="w-px h-3 mx-1 bg-zinc-800" />
                <NavLink to="/servicos">Ecossistema</NavLink>
                <div className="w-px h-3 mx-1 bg-zinc-800" />
                <NavLink to="/cases">Casos</NavLink>
                <div className="w-px h-3 mx-1 bg-zinc-800" />
                <NavLink to="/materiais">Materiais</NavLink>
                <div className="w-px h-3 mx-1 bg-zinc-800" />
                <NavLink to="/blog">Blog</NavLink>
              </div>
            </div>
          </nav>

          {/* Right: Subtle CTA */}
          <div className="hidden xl:flex items-center justify-end gap-4 z-10 flex-shrink-0">
            <Button
              onClick={() => setIsLeadModalOpen(true)}
              variant="default"
              size="default"
              className="bg-[#00CC6A] text-black hover:bg-[#00b35e] font-bold text-sm rounded-lg h-10 px-5 border-none transition-colors flex items-center gap-2"
            >
              <span>Falar com especialista</span>
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Button>
          </div>

          <button
            onClick={toggleMenu}
            className={cn(
              "xl:hidden p-2 transition-colors ml-auto z-10",
              scrolled ? "text-zinc-900 hover:text-[#00CC6A]" : "text-white hover:text-[#00CC6A]"
            )}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {
          isMenuOpen && (
            <div className="xl:hidden bg-white border-t border-zinc-200 absolute top-full left-0 w-full h-screen animate-fade-in z-50 p-6 overflow-y-auto pb-20">
              <div className="flex flex-col space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
                  <Link to="/" onClick={scrollToTop} className="block">
                    <img
                      src="/brand/revhackers-wordmark-white.png"
                      alt="RevHackers Logo"
                      className="w-40 max-w-full h-auto"
                    />
                  </Link>
                </div>
                <MobileNavLink to="/" onClick={scrollToTop}>Home</MobileNavLink>

                <div className="py-2 border-b border-white/5">
                  <div className="text-xs font-mono-tech text-zinc-500 uppercase mb-3">Auditorias Críticas</div>
                  <div className="space-y-4 pl-2">
                    <Link to="/score" onClick={scrollToTop} className="flex items-center gap-3 text-lg font-medium text-zinc-300 hover:text-revgreen">
                      <Activity className="w-4 h-4 text-revgreen" /> Diagnostico 360
                    </Link>
                    <Link to="/score-revenue" onClick={scrollToTop} className="flex items-center gap-3 text-lg font-medium text-zinc-300 hover:text-revgreen">
                      <TrendingUp className="w-4 h-4 text-revgreen" /> Diagnostico CRM
                    </Link>
                    <Link to="/score-founder" onClick={scrollToTop} className="flex items-center gap-3 text-lg font-medium text-zinc-300 hover:text-revgreen">
                      <Users className="w-4 h-4 text-revgreen" /> Diagnostico do Fundador
                    </Link>
                    <Link to="/score-site" onClick={scrollToTop} className="flex items-center gap-3 text-lg font-medium text-zinc-300 hover:text-revgreen">
                      <Globe className="w-4 h-4 text-revgreen" /> Diagnostico Site / LP
                    </Link>
                  </div>
                </div>

                <MobileNavLink to="/metodologia" onClick={scrollToTop}>Metodologia</MobileNavLink>
                <MobileNavLink to="/servicos" onClick={scrollToTop}>Ecossistema</MobileNavLink>
                <MobileNavLink to="/cases" onClick={scrollToTop}>Casos</MobileNavLink>
                <MobileNavLink to="/materiais" onClick={scrollToTop}>Materiais</MobileNavLink>
                <MobileNavLink to="/blog" onClick={scrollToTop}>Blog</MobileNavLink>

                <Button
                  onClick={() => { scrollToTop(); setIsLeadModalOpen(true); }}
                  variant="default"
                  size="lg"
                  className="w-full font-bold uppercase tracking-widest text-xs"
                >
                  Agendar Integração <ArrowRight className="w-4 h-4 ml-1" strokeWidth={1.5} />
                </Button>
              </div>
            </div>
          )
        }
      </header >
      <ContactFormModal isOpen={isLeadModalOpen} onClose={() => setIsLeadModalOpen(false)} />
    </>
  );
};

export default Header;
