import { lazy, Suspense } from "react";
import FounderVideoWidget from "@/components/shared/FounderVideoWidget";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";

// ─── Imports eager ───────────────────────────────────────────────────
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { PageErrorBoundary } from "./components/shared/PageErrorBoundary";
import ChatbotManager from "./components/shared/ChatbotManager";

// ─── Loading Fallback ────────────────────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
    <div className="w-10 h-10 border-2 border-zinc-800 border-t-revgreen rounded-full animate-spin"></div>
  </div>
);

// ─── Lazy Imports (Code-Split Routes) ────────────────────────────────
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Diagnostico = lazy(() => import("./pages/Diagnostico"));
const QuemSomos = lazy(() => import("./pages/QuemSomos"));
const Servicos = lazy(() => import("./pages/Servicos"));
const ServicosDetalhe = lazy(() => import("./pages/ServicosDetalhe"));
const Cases = lazy(() => import("./pages/Cases"));
const CasesDetalhe = lazy(() => import("./pages/CasesDetalhe"));
const Materiais = lazy(() => import("./pages/Materiais"));
const MaterialLanding = lazy(() => import("./pages/MaterialLanding"));
const MaterialThankYou = lazy(() => import("./pages/MaterialThankYou"));
const MaterialAccess = lazy(() => import("./pages/MaterialAccess"));
const Metodologia = lazy(() => import("./pages/Metodologia"));
const Comunidade = lazy(() => import("./pages/Comunidade"));
const Booking = lazy(() => import("./pages/Booking"));
const PartnerDetail = lazy(() => import("./pages/PartnerDetail"));
const PartnerEnics = lazy(() => import("./pages/PartnerEnics"));
const TermosDeUso = lazy(() => import("./pages/TermosDeUso"));
const Privacidade = lazy(() => import("./pages/Privacidade"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const PesquisaNPS = lazy(() => import("./pages/PesquisaNPS"));
const ObrigadoNPS = lazy(() => import("./pages/ObrigadoNPS"));

// Score Pages (pesadas)
const GrowthScore = lazy(() => import("./pages/GrowthScore"));
const SiteScore = lazy(() => import("./pages/SiteScore"));
const FounderScore = lazy(() => import("./pages/FounderScore"));
const RevenueScore = lazy(() => import("./pages/RevenueScore"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // IMPEDE PERDA DE DADOS EM FORMS AO TROCAR DE ABA
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <>
          <Toaster />
          <Sonner />
          <ScrollToTop />
          <ChatbotManager />
          <Suspense fallback={<PageLoader />}>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/diagnostico" element={<Diagnostico />} />
                <Route path="/quem-somos" element={<QuemSomos />} />
                <Route path="/servicos" element={<Servicos />} />
                <Route path="/servicos/:slug" element={<ServicosDetalhe />} />
                <Route path="/metodologia" element={<Metodologia />} />
                <Route path="/cases" element={<Cases />} />
                <Route path="/cases/:slug" element={<CasesDetalhe />} />
                <Route path="/partners/:slug" element={<PartnerDetail />} />
                <Route path="/partners/enics" element={<PartnerEnics />} />
                <Route path="/materiais" element={<Materiais />} />
                <Route path="/materiais/:slug" element={<MaterialLanding />} />
                <Route path="/materiais/obrigado" element={<MaterialThankYou />} />
                <Route path="/materiais/acesso/:slug" element={<MaterialAccess />} />
                <Route path="/comunidade" element={<Comunidade />} />
                <Route path="/booking" element={<Booking />} />
                <Route path="/agenda" element={<Navigate to="/booking" replace />} />
                <Route path="/agenda-diagnostico" element={<Navigate to="/booking" replace />} />
                <Route path="/agenda/giulliano" element={<Navigate to="/booking" replace />} />
                <Route path="/agenda-giulliano" element={<Navigate to="/booking" replace />} />
                <Route path="/agenda-luna" element={<Navigate to="/booking" replace />} />
                <Route path="/agenda-linkedin" element={<Navigate to="/booking" replace />} />
                <Route path="/agenda-kickoff" element={<Navigate to="/booking" replace />} />

                {/* Legal & Feedback */}
                <Route path="/termos-de-uso" element={<TermosDeUso />} />
                <Route path="/privacidade" element={<Privacidade />} />
                <Route path="/obrigado" element={<ThankYou />} />
                <Route path="/pesquisa-nps" element={<PesquisaNPS />} />
                <Route path="/obrigado-nps" element={<ObrigadoNPS />} />

                {/* Public Scores (Lead Gen) */}
                <Route path="/score" element={<PageErrorBoundary><GrowthScore /></PageErrorBoundary>} />
                <Route path="/score-site" element={<PageErrorBoundary><SiteScore /></PageErrorBoundary>} />
                <Route path="/score-revenue" element={<PageErrorBoundary><RevenueScore /></PageErrorBoundary>} />
                <Route path="/score-founder" element={<PageErrorBoundary><FounderScore /></PageErrorBoundary>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </Suspense>
          <FounderVideoWidget />
        </>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
