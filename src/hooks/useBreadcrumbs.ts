import { useLocation, useParams } from 'react-router-dom';

interface Breadcrumb {
  label: string;
  to?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/pipeline': 'Pipeline',
  '/admin/projects': 'Projetos',
  '/admin/clients': 'Clientes',
  '/admin/proposals': 'Propostas',
  '/admin/cases': 'Cases',
  '/admin/users': 'Usuarios',
  '/admin/integrations': 'Integracoes',
  '/admin/profile': 'Perfil',
  '/admin/ai-chat': 'AI Chat',
  '/rei-hub': 'REI Hub',
};

export function useBreadcrumbs(dynamicLabel?: string): Breadcrumb[] {
  const location = useLocation();
  const path = location.pathname;

  // Not an admin route - no breadcrumbs
  if (!path.startsWith('/admin') && !path.startsWith('/rei-hub')) return [];

  const crumbs: Breadcrumb[] = [{ label: 'Dashboard', to: '/admin' }];

  // Exact match for known routes
  if (path === '/admin') return crumbs;

  // Check for project detail routes: /admin/projects/:id or /admin/projects/:id/execucao
  const projectMatch = path.match(/^\/admin\/projects\/([^/]+)(\/.*)?$/);
  if (projectMatch) {
    crumbs.push({ label: 'Projetos', to: '/admin/projects' });
    const subPath = projectMatch[2];
    if (subPath === '/execucao') {
      crumbs.push({ label: dynamicLabel || 'Projeto', to: `/admin/projects/${projectMatch[1]}` });
      crumbs.push({ label: 'Project OS' });
    } else if (subPath === '/wiki') {
      crumbs.push({ label: dynamicLabel || 'Projeto', to: `/admin/projects/${projectMatch[1]}` });
      crumbs.push({ label: 'Wiki' });
    } else {
      crumbs.push({ label: dynamicLabel || 'Projeto' });
    }
    return crumbs;
  }

  // Check for hub routes: /hub/:id
  const hubMatch = path.match(/^\/hub\/([^/]+)/);
  if (hubMatch) {
    crumbs.push({ label: dynamicLabel || 'Projeto Hub' });
    return crumbs;
  }

  // Standard known routes
  const label = ROUTE_LABELS[path];
  if (label) {
    crumbs.push({ label });
    return crumbs;
  }

  // REI hub sub-routes
  if (path.startsWith('/rei-hub')) {
    return [{ label: 'Dashboard', to: '/admin' }, { label: 'REI Hub' }];
  }

  // Fallback: use the last segment
  const segments = path.split('/').filter(Boolean);
  if (segments.length > 1) {
    const lastSegment = segments[segments.length - 1];
    crumbs.push({ label: lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1) });
  }

  return crumbs;
}
