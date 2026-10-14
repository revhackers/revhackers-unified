import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PageLayout from '@/components/layout/PageLayout';
import SEO from '@/components/shared/SEO';
import { APP_ROUTES } from '@/config/routes';

const helpfulLinks = [
  { to: APP_ROUTES.PUBLIC.DIAGNOSTICO, label: 'Diagnósticos gratuitos' },
  { to: APP_ROUTES.PUBLIC.SERVICOS, label: 'Ecossistema de serviços' },
  { to: APP_ROUTES.PUBLIC.METODOLOGIA, label: 'Metodologia' },
  { to: APP_ROUTES.PUBLIC.BLOG, label: 'Blog' },
];

const NotFound = () => {
  return (
    <PageLayout>
      <SEO
        title="Página não encontrada"
        description="A página que você procura não existe ou foi movida. Acesse os diagnósticos, serviços e conteúdos da RevHackers."
        noindex
      />
      <div className="min-h-[70vh] flex flex-col items-center justify-center pt-32 pb-20">
        <div className="text-center max-w-2xl mx-auto px-4">
          <p className="text-xs font-mono font-bold tracking-widest uppercase text-zinc-500 mb-4">Erro 404</p>
          <h1 className="text-2xl md:text-3xl font-bold mb-4 text-zinc-900">Página não encontrada</h1>
          <p className="text-zinc-600 mb-8">
            A página que você está procurando foi movida, removida, renomeada ou talvez nunca tenha existido.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <Button asChild className="btn-primary">
              <Link to={APP_ROUTES.PUBLIC.HOME}>Voltar para Home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={APP_ROUTES.PUBLIC.BOOKING}>Agendar auditoria</Link>
            </Button>
          </div>
          <nav aria-label="Páginas úteis">
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-zinc-700">
              {helpfulLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="underline underline-offset-4 hover:text-black">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </PageLayout>
  );
};

export default NotFound;
