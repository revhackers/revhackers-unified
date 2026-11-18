import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { SEOProvider } from './components/shared/SEO.tsx'
import { persistUtmParams } from './utils/utm'

// Guarda os UTM da URL de entrada na sessao; os formularios Funnels leem de la.
persistUtmParams();

// Crash Protection: Catch unhandled auth/chunk errors that might cause White Screen
window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || event.reason?.toString() || '';
    if (message.includes('Invalid Refresh Token') || message.includes('Refresh Token Not Found')) {
        console.warn('⚠️ [CRASH PREVENTED] Suppressing fatal Supabase Auth error:', message);
        event.preventDefault();
        try {
            localStorage.removeItem('sb-eqspbruarsdybpfeijnf-auth-token');
            localStorage.removeItem('supabase.auth.token');
        } catch (e) {}
    }

    if (message.includes("Failed to fetch dynamically imported module") || message.includes("Unexpected token '<'")) {
        event.preventDefault();
        const lastReload = parseInt(sessionStorage.getItem('rev_chunk_reload') || '0', 10);
        if (Date.now() - lastReload > 3000) {
            sessionStorage.setItem('rev_chunk_reload', String(Date.now()));
            window.location.reload();
        }
    }
});

window.addEventListener('error', (event) => {
    const message = event.message || '';
    if (message.includes("Failed to fetch dynamically imported module") || message.includes("Unexpected token '<'")) {
        const lastReload = parseInt(sessionStorage.getItem('rev_chunk_reload') || '0', 10);
        if (Date.now() - lastReload > 3000) {
            sessionStorage.setItem('rev_chunk_reload', String(Date.now()));
            window.location.reload();
        }
    }
});

function mountApp() {
    const rootElement = document.getElementById("root");
    if (!rootElement) return;

    try {
        const root = createRoot(rootElement);
        root.render(
            <SEOProvider>
                <App />
            </SEOProvider>
        );
    } catch (err: any) {
        console.error("Fatal Root Mount Error:", err);
        rootElement.innerHTML = `
            <div style="min-height: 100vh; background: #09090b; color: #fafafa; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: system-ui, sans-serif; padding: 20px; text-align: center;">
                <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 8px;">Não foi possível carregar a página.</h1>
                <p style="font-size: 14px; color: #a1a1aa; margin: 0 0 24px; max-width: 400px;">Atualize para tentar novamente.</p>
                <button type="button" onclick="window.location.reload()" style="background: #00CC6A; color: #000; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer;">Atualizar</button>
            </div>
        `;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
} else {
    mountApp();
}
