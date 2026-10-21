import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import FounderVideoWidget from "@/components/shared/FounderVideoWidget";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { PageErrorBoundary } from "@/components/shared/PageErrorBoundary";
import ChatbotManager from "@/components/shared/ChatbotManager";
import ScrollToTop from "./components/ScrollToTop";
import Index from "./pages/Index";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import NotFound from "./pages/NotFound";
import "./styles/article.css";

// Site público. Identidade, acesso e permissões do software pertencem ao GHL.
// O site não implementa login, dashboard administrativo nem portais próprios.
const QuemSomos = lazy(() => import("./pages/QuemSomos"));
const Diagnostico = lazy(() => import("./pages/Diagnostico"));
const Servicos = lazy(() => import("./pages/Servicos"));
const ServicosDetalhe = lazy(() => import("./pages/ServicosDetalhe"));
const Cases = lazy(() => import("./pages/Cases"));
const CasesDetalhe = lazy(() => import("./pages/CasesDetalhe"));
const Downloads = lazy(() => import("./pages/Downloads"));
const Materiais = lazy(() => import("./pages/Materiais"));
const MaterialLanding = lazy(() => import("./pages/MaterialLanding"));
const Metodologia = lazy(() => import("./pages/Metodologia"));
const Comunidade = lazy(() => import("./pages/Comunidade"));
const Booking = lazy(() => import("./pages/Booking"));
const AgendaGiulliano = lazy(() => import("./pages/AgendaGiulliano"));
const PartnerDetail = lazy(() => import("./pages/PartnerDetail"));
const PartnerEnics = lazy(() => import("./pages/PartnerEnics"));
const TermosDeUso = lazy(() => import("./pages/TermosDeUso"));
const Privacidade = lazy(() => import("./pages/Privacidade"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const CadastroParceiro = lazy(() => import("./pages/CadastroParceiro"));
const PesquisaNPS = lazy(() => import("./pages/PesquisaNPS"));
const ObrigadoNPS = lazy(() => import("./pages/ObrigadoNPS"));
const ClaudePartnerNetworkPage = lazy(() => import("./pages/ClaudePartnerNetworkPage"));
const ClaudePartnerThankYouPage = lazy(() => import("./pages/ClaudePartnerThankYouPage"));
const GrowthScore = lazy(() => import("./pages/GrowthScore"));
const SiteScore = lazy(() => import("./pages/SiteScore"));
const FounderScore = lazy(() => import("./pages/FounderScore"));
const RevenueScore = lazy(() => import("./pages/RevenueScore"));
const EnrichedDiagnostic = lazy(() => import("./pages/EnrichedDiagnostic"));
const ProposalPresentation = lazy(() => import("./pages/public/ProposalPresentation"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, refetchOnReconnect: false, staleTime: 300000 } }
});
const PageLoader = () => (
  <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
    <div className="w-10 h-10 border-2 border-zinc-800 border-t-revgreen rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
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
              <Route path="/diagnostico/v2" element={<PageErrorBoundary><EnrichedDiagnostic /></PageErrorBoundary>} />
              <Route path="/score" element={<PageErrorBoundary><GrowthScore /></PageErrorBoundary>} />
              <Route path="/score-site" element={<PageErrorBoundary><SiteScore /></PageErrorBoundary>} />
              <Route path="/score-founder" element={<PageErrorBoundary><FounderScore /></PageErrorBoundary>} />
              <Route path="/score-revenue" element={<PageErrorBoundary><RevenueScore /></PageErrorBoundary>} />
              <Route path="/quem-somos" element={<QuemSomos />} />
              <Route path="/servicos" element={<Servicos />} />
              <Route path="/servicos/:slug" element={<ServicosDetalhe />} />
              <Route path="/metodologia" element={<Metodologia />} />
              <Route path="/cases" element={<Cases />} />
              <Route path="/cases/:slug" element={<CasesDetalhe />} />
              <Route path="/downloads" element={<Downloads />} />
              <Route path="/materiais" element={<Materiais />} />
              <Route path="/materiais/:slug" element={<MaterialLanding />} />
              <Route path="/comunidade" element={<Comunidade />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/agenda" element={<Navigate to="/booking" replace />} />
              <Route path="/agenda-diagnostico" element={<Navigate to="/booking" replace />} />
              <Route path="/agenda-giulliano" element={<AgendaGiulliano />} />
              <Route path="/agenda/giulliano" element={<Navigate to="/booking" replace />} />
              <Route path="/agenda-luna" element={<Navigate to="/booking" replace />} />
              <Route path="/agenda-linkedin" element={<Navigate to="/booking" replace />} />
              <Route path="/agenda-kickoff" element={<Navigate to="/booking" replace />} />
              <Route path="/cadastro-parceiro" element={<CadastroParceiro />} />
              <Route path="/partners/:slug" element={<PartnerDetail />} />
              <Route path="/partners/enics" element={<PartnerEnics />} />
              <Route path="/claude-partner-network" element={<ClaudePartnerNetworkPage />} />
              <Route path="/claude-partner-network/obrigado" element={<ClaudePartnerThankYouPage />} />
              <Route path="/p/:slug" element={<ProposalPresentation />} />
              <Route path="/termos-de-uso" element={<TermosDeUso />} />
              <Route path="/privacidade" element={<Privacidade />} />
              <Route path="/obrigado" element={<ThankYou />} />
              <Route path="/pesquisa-nps" element={<PesquisaNPS />} />
              <Route path="/obrigado-nps" element={<ObrigadoNPS />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </Suspense>
        <FounderVideoWidget />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
export default App;
