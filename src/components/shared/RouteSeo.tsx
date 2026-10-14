import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { getRobotsContent, isNoIndexPath } from '@/lib/seo';

/**
 * Aplica `noindex, nofollow` em rotas privadas (painel, login, paginas por token,
 * resultados por lead) que nao montam o componente SEO. O index.html estatico e
 * indexavel por padrao; sem isto essas rotas herdariam title/canonical da home.
 */
const RouteSeo = () => {
  const { pathname } = useLocation();
  if (!isNoIndexPath(pathname)) return null;
  return (
    <Helmet>
      <meta name="robots" content={getRobotsContent(pathname)} />
    </Helmet>
  );
};

export default RouteSeo;
