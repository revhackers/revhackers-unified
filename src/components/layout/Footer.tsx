import { Link } from 'react-router-dom';
import { Mail, Linkedin, Instagram, Youtube } from 'lucide-react';
import NewsletterForm from '../shared/NewsletterForm';
import { APP_CONFIG } from '@/config/constants';
import { APP_ROUTES } from '@/config/routes';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { icon: Instagram, href: APP_CONFIG.URLS.INSTAGRAM, label: 'Instagram' },
    { icon: Linkedin, href: APP_CONFIG.URLS.LINKEDIN, label: 'LinkedIn' },
    { icon: Youtube, href: APP_CONFIG.URLS.YOUTUBE, label: 'YouTube' },
    { icon: Mail, href: `mailto:${APP_CONFIG.EMAILS.CONTACT}`, label: 'Email' }
  ];

  return (
    <footer className="bg-black text-white pt-24 pb-12 border-t border-white/5">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 lg:gap-24">

          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-10">
            <Link to={APP_ROUTES.PUBLIC.HOME} className="inline-block group focus:outline-none">
              <img
                src="/brand/revhackers-wordmark-white.png"
                alt="RevHackers Logo"
                className="w-48 md:w-56 max-w-full h-auto transition-all duration-300 group-hover:opacity-90"
              />
            </Link>

            <p className="text-sm text-zinc-400 leading-relaxed max-w-xs">
              Engenharia de RevOps, GTM e ABM com inteligência artificial. CRM, automações e dados integrados para escalar receita B2B.
            </p>

            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-950 hover:bg-[#00CC6A] hover:border-[#00CC6A] transition-all shadow-xs"
                  aria-label={social.label}
                >
                  <social.icon size={18} strokeWidth={1.75} />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="lg:col-span-2 space-y-8">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-300 mb-2">Navegação Core</h3>
            <ul className="space-y-4 text-mini font-medium text-zinc-400">
              <li><Link to={APP_ROUTES.PUBLIC.HOME} className="hover:text-white transition-colors">Home (O Funil)</Link></li>
              <li><Link to={APP_ROUTES.PUBLIC.SERVICOS} className="hover:text-white transition-colors">Ecossistema IA + CRM</Link></li>
              <li><Link to={APP_ROUTES.PUBLIC.METODOLOGIA} className="hover:text-white transition-colors">Metodologia</Link></li>
              <li><Link to={APP_ROUTES.PUBLIC.CASES} className="hover:text-white transition-colors">Clientes & Fechamentos</Link></li>
              <li><Link to="/quem-somos" className="hover:text-white transition-colors">Quem Somos</Link></li>
              <li><Link to={APP_ROUTES.PUBLIC.BLOG} className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link to={APP_ROUTES.PUBLIC.MATERIAIS} className="hover:text-white transition-colors">Materiais</Link></li>
              <li><Link to={APP_ROUTES.PUBLIC.COMUNIDADE} className="hover:text-white transition-colors">Operações Fechadas</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-300 mb-2">Auditorias Rápidas</h3>
            <ul className="space-y-4 text-mini font-medium text-zinc-400">
              <li><Link to="/score" className="hover:text-white transition-colors">Vazamento 360 do Crescimento</Link></li>
              <li><Link to="/score-revenue" className="hover:text-white transition-colors">Diagnóstico do CRM</Link></li>
              <li><Link to="/score-founder" className="hover:text-white transition-colors">Dependência do Founder</Link></li>
              <li><Link to={APP_ROUTES.SCORES.SITE_SCORE} className="hover:text-white transition-colors">Diagnóstico de Site e LP</Link></li>
              <li><Link to={APP_ROUTES.PUBLIC.DIAGNOSTICO} className="hover:text-white transition-colors">Todos os diagnósticos</Link></li>
              <li><Link to={APP_ROUTES.PUBLIC.BOOKING} className="hover:text-white transition-colors text-revgreen font-bold">Solicitar Auditoria</Link></li>
            </ul>
          </div>

          {/* Newsletter Section */}
          <div className="lg:col-span-4 space-y-8">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-300 mb-2">Newsletter</h3>
            <NewsletterForm variant="footer" />
          </div>
        </div>

        {/* Partner Badges — com 100% de legibilidade */}
        <div className="mt-16 pt-8 border-t border-zinc-900">
          <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold text-center mb-6">
            Technology Partners
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {/* Claude Partner Network */}
            <a href="https://anthropic.com" target="_blank" rel="noopener noreferrer" className="h-7 flex items-center group">
              <img
                src="/brand/claude-partner-network.svg"
                alt="Claude Partner Network"
                className="h-5 w-auto object-contain opacity-75 group-hover:opacity-100 transition-opacity block"
              />
            </a>

            <div className="w-px h-4 bg-zinc-800 hidden sm:block self-center" />

            {/* Google for Startups */}
            <a href="https://startup.google.com" target="_blank" rel="noopener noreferrer" className="h-7 flex items-center gap-2 opacity-75 hover:opacity-100 transition-opacity group select-none">
              <svg className="w-4 h-4 shrink-0 block" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-white text-xs font-medium tracking-tight whitespace-nowrap leading-none">Google for Startups</span>
            </a>

            <div className="w-px h-4 bg-zinc-800 hidden sm:block self-center" />

            {/* Funnels */}
            <a href="https://usefunnels.io" target="_blank" rel="noopener noreferrer" className="h-7 flex items-center group">
              <img
                src="/brand/funnels-logo-white.png"
                alt="Funnels Partner"
                className="h-5 w-auto object-contain opacity-75 group-hover:opacity-100 transition-opacity block"
              />
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
            <p className="text-zinc-400 text-[0.65rem] uppercase font-semibold tracking-[0.2em]">
              © {currentYear} RevHackers. Engineering Revenue for Scale.
            </p>
            <address className="not-italic text-zinc-400 text-[0.6rem] uppercase tracking-[0.15em]">
              São Paulo, SP · Brasil
            </address>
          </div>
          <div className="flex gap-8 text-[0.65rem] uppercase font-semibold tracking-[0.2em] text-zinc-400">
            <Link to={APP_ROUTES.LEGAL_AND_FEEDBACK.PRIVACIDADE} className="hover:text-white transition-colors">Privacidade</Link>
            <Link to={APP_ROUTES.LEGAL_AND_FEEDBACK.TERMOS_DE_USO} className="hover:text-white transition-colors">Termos</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
