import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { supabase } from '@/integrations/supabase/client';
import {
  Search, Home, LayoutDashboard, FolderKanban,
  Users, FileText, Plus, Briefcase, Lightbulb,
  type LucideIcon
} from 'lucide-react';

interface CommandAction {
  icon: LucideIcon;
  label: string;
  sublabel?: string;
  onSelect: () => void;
  group: string;
}

const NAV_ACTIONS: Omit<CommandAction, 'onSelect'>[] = [
  { icon: Home, label: 'Dashboard', group: 'Navegacao' },
  { icon: LayoutDashboard, label: 'Pipeline', group: 'Navegacao' },
  { icon: FolderKanban, label: 'Projetos', group: 'Navegacao' },
  { icon: Users, label: 'Clientes', group: 'Navegacao' },
  { icon: FileText, label: 'Propostas', group: 'Navegacao' },
  { icon: Briefcase, label: 'Cases', group: 'Navegacao' },
];

const NAV_ROUTES: Record<string, string> = {
  'Dashboard': '/admin',
  'Pipeline': '/admin/pipeline',
  'Projetos': '/admin/projects',
  'Clientes': '/admin/clients',
  'Propostas': '/admin/proposals',
  'Cases': '/admin/cases',
};

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dynamicResults, setDynamicResults] = useState<CommandAction[]>([]);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const searchSupabase = useCallback(async (term: string) => {
    if (term.length < 2) { setDynamicResults([]); return; }
    const pattern = `%${term}%`;
    const results: CommandAction[] = [];

    try {
      const [projectsRes, profilesRes] = await Promise.all([
        supabase
          .from('rei_projects')
          .select('id, client_name, client_company, trade_name, type')
          .or(`client_name.ilike.${pattern},client_company.ilike.${pattern},trade_name.ilike.${pattern}`)
          .limit(5),
        supabase
          .from('profiles')
          .select('id, full_name, email')
          .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
          .limit(5),
      ]);

      if (projectsRes.data) {
        for (const p of projectsRes.data) {
          results.push({
            icon: FolderKanban,
            label: (p as any).trade_name || (p as any).client_company || (p as any).client_name || 'Projeto',
            sublabel: (p as any).type || '',
            onSelect: () => navigate(`/admin/projects/${(p as any).id}`),
            group: 'Projetos',
          });
        }
      }
      if (profilesRes.data) {
        for (const u of profilesRes.data) {
          results.push({
            icon: Users,
            label: (u as any).full_name || (u as any).email || 'Usuario',
            sublabel: (u as any).email || '',
            onSelect: () => navigate(`/admin/clients`),
            group: 'Clientes',
          });
        }
      }
    } catch (err) {
      console.error('[CommandPalette] search error:', err);
    }

    setDynamicResults(results);
  }, [navigate]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchSupabase(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, searchSupabase]);

  const staticActions: CommandAction[] = [
    ...NAV_ACTIONS.map(a => ({
      ...a,
      onSelect: () => navigate(NAV_ROUTES[a.label] || '/admin'),
    })),
    {
      icon: Plus,
      label: 'Novo Projeto',
      group: 'Acoes Rapidas',
      onSelect: () => navigate('/admin/projects'),
    },
    {
      icon: Plus,
      label: 'Nova Proposta',
      group: 'Acoes Rapidas',
      onSelect: () => navigate('/admin/proposals'),
    },
  ];

  const allActions = [...staticActions, ...dynamicResults];

  const groupedActions = allActions.reduce((acc, action) => {
    if (!acc[action.group]) acc[action.group] = [];
    acc[action.group].push(action);
    return acc;
  }, {} as Record<string, CommandAction[]>);

  if (!open) return null;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(v) => { setOpen(v); if (!v) { setQuery(''); setDynamicResults([]); } }}
      className="fixed inset-0 z-[100]"
    >
      <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />

      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg">
        <div className="bg-white shadow-sm border border-zinc-200 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200">
            <Search className="w-4 h-4 text-zinc-400" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar paginas, projetos, clientes..."
              className="flex-1 text-sm font-medium outline-none bg-transparent placeholder:text-zinc-400"
            />
            <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-medium text-zinc-500 bg-zinc-100">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-96 overflow-y-auto p-2">
            <Command.Empty className="px-4 py-8 text-center text-sm text-zinc-500">
              Nenhum resultado encontrado.
            </Command.Empty>

            {Object.entries(groupedActions).map(([group, items]) => (
              <Command.Group key={group} className="mb-3 last:mb-0">
                <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  {group}
                </div>
                {items.map((action, idx) => (
                  <Command.Item
                    key={`${action.label}-${idx}`}
                    onSelect={() => { action.onSelect(); setOpen(false); setQuery(''); setDynamicResults([]); }}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-zinc-50 transition-colors data-[selected=true]:bg-zinc-100"
                  >
                    <action.icon className="w-4 h-4 text-zinc-400" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-zinc-900">{action.label}</span>
                      {action.sublabel && (
                        <span className="text-xs text-zinc-400 ml-2">{action.sublabel}</span>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </div>
      </div>
    </Command.Dialog>
  );
};

export default CommandPalette;
