import { lazy, Suspense } from "react";
import CommandPalette from "@/components/ui/CommandPalette";
import FounderVideoWidget from "@/components/shared/FounderVideoWidget";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import "./styles/article.css";

// ─── Eager Imports (Critical Public Pages) ───────────────────────────
import Index from "./pages/Index";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
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
// Public Pages
const PublicDealRoom = lazy(() => import("./pages/public/PublicDealRoom"));
const ProposalPresentation = lazy(() => import("./pages/public/ProposalPresentation"));
const Diagnostico = lazy(() => import("./pages/Diagnostico"));
const DiagnosticoLinkedin = lazy(() => import("./pages/DiagnosticoLinkedin"));
const DiagnosticoLinkedinShare = lazy(() => import("./pages/DiagnosticoLinkedinShare"));
const SupabaseDiagnostic = lazy(() => import("./pages/SupabaseDiagnostic"));
const QuemSomos = lazy(() => import("./pages/QuemSomos"));
const Servicos = lazy(() => import("./pages/Servicos"));
const ServicosDetalhe = lazy(() => import("./pages/ServicosDetalhe"));
const Cases = lazy(() => import("./pages/Cases"));
const CasesDetalhe = lazy(() => import("./pages/CasesDetalhe"));
const Downloads = lazy(() => import("./pages/Downloads"));
const Materiais = lazy(() => import("./pages/Materiais"));
const MaterialLanding = lazy(() => import("./pages/MaterialLanding"));
const Metodologia = lazy(() => import("./pages/Metodologia"));
const ClaudePartnerNetworkPage = lazy(() => import("./pages/ClaudePartnerNetworkPage"));
const ClaudePartnerThankYouPage = lazy(() => import("./pages/ClaudePartnerThankYouPage"));
const SetupPasswordPage = lazy(() => import("./pages/auth/SetupPasswordPage"));
const Comunidade = lazy(() => import("./pages/Comunidade"));
const Booking = lazy(() => import("./pages/Booking"));
// Dead import removed: Agenda (route is redirect to /booking)
const PartnerDetail = lazy(() => import("./pages/PartnerDetail"));
const PartnerEnics = lazy(() => import("./pages/PartnerEnics"));
const TermosDeUso = lazy(() => import("./pages/TermosDeUso"));
const Privacidade = lazy(() => import("./pages/Privacidade"));
const ThankYou = lazy(() => import("./pages/ThankYou"));

const CadastroParceiro = lazy(() => import("./pages/CadastroParceiro"));
const PesquisaNPS = lazy(() => import("./pages/PesquisaNPS"));
const ObrigadoNPS = lazy(() => import("./pages/ObrigadoNPS"));
const ClientOnboarding = lazy(() => import("./pages/public/ClientOnboarding"));
const OnboardingSuccess = lazy(() => import("./pages/public/OnboardingSuccess"));
const MaterialUpload = lazy(() => import("./pages/public/MaterialUpload"));
const PublicDiagnosticResult = lazy(() => import("./pages/PublicDiagnosticResult"));
const SchedulingSuccess = lazy(() => import("./pages/SchedulingSuccess"));
const CertificateOfAuthenticity = lazy(() => import("./pages/public/CertificateOfAuthenticity"));
const MagicApproval = lazy(() => import("./pages/public/MagicApproval"));
const PublicKickoffValidation = lazy(() => import("./pages/public/PublicKickoffValidation"));

// Specialized Agenda Pages (kept only real pages, others are redirects)
const AgendaGiulliano = lazy(() => import("./pages/AgendaGiulliano"));

// Score Pages (Heavy - 21-70KB each)
const GrowthScore = lazy(() => import("./pages/GrowthScore"));
const SiteScore = lazy(() => import("./pages/SiteScore"));
const FounderScore = lazy(() => import("./pages/FounderScore"));
const RevenueScore = lazy(() => import("./pages/RevenueScore"));
const GrowthDiagnostic = lazy(() => import("./pages/GrowthDiagnostic"));
const EnrichedDiagnostic = lazy(() => import("./pages/EnrichedDiagnostic"));

// REI Workflows (Heavy - 15-38KB each)
// Dead import removed: ReiHub (route is redirect to /admin/projects)
const ReiDev = lazy(() => import("./pages/REI-Dev"));
const ReiConsulting = lazy(() => import("./pages/REI-Consulting"));
const ReiFounder = lazy(() => import("./pages/REI-Founder"));
const REIWizardPage = lazy(() => import("./pages/REIWizardPage"));
const REIResult = lazy(() => import("./pages/REIResult"));
// Dead imports removed: REIDashboard, REIOnboarding (routes are redirects to /admin/projects)
const GrowthMapPage = lazy(() => import("./pages/GrowthMap"));
const PublicGrowthMap = lazy(() => import("./pages/PublicGrowthMap"));

// Auth Pages
const Login = lazy(() => import("./pages/auth/Login"));
// Dead import removed: Signup (route is redirect to /login)
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const UpdatePassword = lazy(() => import("./pages/auth/UpdatePassword"));
const CompleteProfile = lazy(() => import("./pages/auth/CompleteProfile"));

// Admin Pages (Never loaded by public visitors)
const ProfileSettings = lazy(() => import("./pages/admin/ProfileSettings"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const HubMessaging = lazy(() => import("./pages/admin/HubMessaging"));

const AdminMaterials = lazy(() => import("./pages/admin/AdminMaterials"));
const AdminClients = lazy(() => import("./pages/admin/AdminClients"));
const ClientForm = lazy(() => import("./pages/admin/ClientForm"));
const AdminMaterialNew = lazy(() => import("./pages/admin/AdminMaterialNew"));
const AdminMaterialEdit = lazy(() => import("./pages/admin/AdminMaterialEdit"));

const FixMaterialsPage = lazy(() => import("./pages/admin/FixMaterialsPage"));
const AdminCases = lazy(() => import("./pages/admin/AdminCases"));
const AdminCaseNew = lazy(() => import("./pages/admin/AdminCaseNew"));
const AdminCaseEdit = lazy(() => import("./pages/admin/AdminCaseEdit"));
const DiagnosticView = lazy(() => import("./pages/admin/DiagnosticView"));
// Deprecated: const AdminREIProjects = lazy(() => import("./pages/admin/AdminREIProjects"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const REIProjectForm = lazy(() => import("./pages/admin/REIProjectForm"));
const GrowthCronograma = lazy(() => import("./pages/admin/GrowthCronograma"));
const RevenueCockpit = lazy(() => import("./pages/admin/RevenueCockpit"));
const FinanceCockpit = lazy(() => import("./pages/admin/FinanceCockpit").then(m => ({ default: m.FinanceCockpit })));
const REICockpit = lazy(() => import("./pages/admin/REICockpit"));
// Dead import removed: OrchestratedOnboarding (no route defined)

const ProjectDetails = lazy(() => import("./pages/admin/ProjectDetails"));
const AdminProjects = lazy(() => import("./pages/admin/AdminProjects"));
import { AdminBlog } from "@/pages/admin/AdminBlog";
const PostEditor = lazy(() => import("./components/admin/PostEditor"));
const StrategicPlanGenerator = lazy(() => import("./pages/admin/StrategicPlanGenerator"));
const KnowledgeDocument = lazy(() => import("./pages/admin/KnowledgeDocument"));
const MeetingRecordingDoc = lazy(() => import("./pages/admin/MeetingRecordingDoc"));
const IntelligenceDashboard = lazy(() => import("./pages/admin/IntelligenceDashboard"));
const LifecycleTimeline = lazy(() => import("./pages/admin/LifecycleTimeline"));

// Client Pages
const StrategicPlanPresentation = lazy(() => import("./pages/client/StrategicPlanPresentation"));
const SuccessPlanPresentation = lazy(() => import("./pages/client/SuccessPlanPresentation"));
const ClientProjectHub = lazy(() => import("./pages/client/ClientProjectHub"));

// Pitch Deck (Cinema Mode para Vendas)
const PitchDeckPresentation = lazy(() => import("./pages/admin/PitchDeckPresentation"));

// ─── Redirect Helper: /admin/jornada/:id → /admin/projects/:id ─────────────
const JornadaRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/admin/projects/${id}`} replace />;
};

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
        <AuthProvider>
          <>
            <Toaster />
            <Sonner />
            <ScrollToTop />
            <ChatbotManager />
            <Suspense fallback={<PageLoader />}>
              <ErrorBoundary>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/claude-partner-network" element={<ClaudePartnerNetworkPage />} />
                  <Route path="/claude-partner-network/obrigado" element={<ClaudePartnerThankYouPage />} />
                  <Route path="/public/growthmap/:share_token" element={<PublicGrowthMap />} />
                  <Route path="/p/:slug" element={<ProposalPresentation />} /> {/* Proposal Slide Presentation */}
              <Route path="/p/:slug/legacy" element={<PublicDealRoom />} /> {/* Legacy Deal Room Route */}
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
              <Route path="/downloads" element={<Downloads />} />
              <Route path="/materiais" element={<Materiais />} />
              <Route path="/materiais/:slug" element={<MaterialLanding />} />
              <Route path="/comunidade" element={<Comunidade />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/agenda" element={<Navigate to="/booking" replace />} />
              <Route path="/agenda-diagnostico" element={<Navigate to="/booking" replace />} />
              <Route path="/supabase-diagnostic" element={<SupabaseDiagnostic />} />

              {/* Public Onboarding */}
              <Route path="/cadastro-cliente" element={<ClientOnboarding />} />
              <Route path="/onboarding/success" element={<OnboardingSuccess />} />
              <Route path="/upload-materiais/:projectId" element={<MaterialUpload />} />
              <Route path="/public/kickoff/:id" element={<PublicKickoffValidation />} />

              {/* Legal & Feedback */}
              <Route path="/termos-de-uso" element={<TermosDeUso />} />
              <Route path="/privacidade" element={<Privacidade />} />
              <Route path="/obrigado" element={<ThankYou />} />
              <Route path="/pesquisa-nps" element={<PesquisaNPS />} />
              <Route path="/obrigado-nps" element={<ObrigadoNPS />} />
              <Route path="/legal/certificado/:hash" element={<CertificateOfAuthenticity />} />
              
              {/* Epic 8: Magic Approval Route */}
              <Route path="/approve/:token" element={<MagicApproval />} />

              {/* Specialized Pages - Consolidadas em /booking */}
              <Route path="/agenda/giulliano" element={<Navigate to="/booking" replace />} />
              <Route path="/agenda-giulliano" element={<AgendaGiulliano />} />
              <Route path="/agenda-luna" element={<Navigate to="/booking" replace />} />
              <Route path="/agenda-linkedin" element={<Navigate to="/booking" replace />} />
              <Route path="/agenda-kickoff" element={<Navigate to="/booking" replace />} />
              
              <Route path="/cadastro-parceiro" element={<CadastroParceiro />} />

              {/* REI System (Internal) - Unified */}
              <Route path="/rei" element={<ProtectedRoute><REICockpit /></ProtectedRoute>} />
              <Route path="/rei/wizard" element={<ProtectedRoute><REIWizardPage /></ProtectedRoute>} />
              <Route path="/rei-onboarding" element={<ProtectedRoute><REIWizardPage /></ProtectedRoute>} />
              <Route path="/rei/resultado/:id" element={<ProtectedRoute><REIResult /></ProtectedRoute>} />
              <Route path="/rei/success" element={<ProtectedRoute><SchedulingSuccess /></ProtectedRoute>} />

              {/* Public Scores (Lead Gen) */}
              <Route path="/score" element={<PageErrorBoundary><GrowthScore /></PageErrorBoundary>} />
              <Route path="/score-site" element={<PageErrorBoundary><SiteScore /></PageErrorBoundary>} />
              <Route path="/score-revenue" element={<PageErrorBoundary><RevenueScore /></PageErrorBoundary>} />
              <Route path="/diagnostico-growth" element={<PageErrorBoundary><GrowthDiagnostic /></PageErrorBoundary>} />
              <Route path="/diagnostico/v2" element={<PageErrorBoundary><EnrichedDiagnostic /></PageErrorBoundary>} />

              <Route path="/diagnostico/resultado/:id" element={<PublicDiagnosticResult />} />
              {/* Diagnóstico LinkedIn (fluxo isolado, motor observável client-side) */}
              <Route path="/diagnostico/linkedin" element={<PageErrorBoundary><DiagnosticoLinkedin /></PageErrorBoundary>} />
              <Route path="/diagnostico/linkedin/r/:slug" element={<DiagnosticoLinkedinShare />} />

              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Navigate to="/login" replace />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<UpdatePassword />} />
              <Route path="/auth/setup-password" element={<SetupPasswordPage />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route path="/rei-hub" element={<Navigate to="/admin/projects" replace />} />
              <Route path="/rei-dev" element={<ReiDev />} />
              <Route path="/rei-consulting" element={<ReiConsulting />} />
              <Route path="/rei-founder" element={<ReiFounder />} />


              {/* Redirect /dashboard to /admin (unified Painel Administrativo) */}
              <Route path="/dashboard" element={<Navigate to="/admin" replace />} />

              {/* Admin Management - Painel Administrativo */}
              <Route path="/admin" element={<ProtectedRoute><PageErrorBoundary><AdminDashboard /></PageErrorBoundary></ProtectedRoute>} />
              <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
              {/* Redirect legado: /jornada/:id → /projects/:id */}
              <Route path="/admin/jornada/:id" element={<JornadaRedirect />} />

              <Route path="/admin/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
              <Route path="/admin/finance" element={<ProtectedRoute><FinanceCockpit /></ProtectedRoute>} />
              <Route path="/admin/rei" element={<ProtectedRoute><REICockpit /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/mensagens" element={<ProtectedRoute><HubMessaging /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<Navigate to="/admin/profile" replace />} />
              <Route path="/admin/intelligence" element={<ProtectedRoute><IntelligenceDashboard /></ProtectedRoute>} />
              <Route path="/admin/intelligence/:projectId" element={<ProtectedRoute><IntelligenceDashboard /></ProtectedRoute>} />

              {/* Admin - Clients (legado - tabela clients) */}
              <Route path="/admin/clients" element={<ProtectedRoute><PageErrorBoundary><AdminClients /></PageErrorBoundary></ProtectedRoute>} />
              <Route path="/admin/clients/novo" element={<ProtectedRoute><ClientForm /></ProtectedRoute>} />
              <Route path="/admin/clients/edit/:id" element={<ProtectedRoute><ClientForm /></ProtectedRoute>} />

              {/* Admin - Posts */}
              {/* Admin - Posts (Rotas removidas) */}

              {/* Pitch Deck (Cinema Mode - fullscreen) */}
              <Route path="/admin/pitch/:id" element={<ProtectedRoute><PitchDeckPresentation /></ProtectedRoute>} />

              {/* Admin - Materials */}
              <Route path="/admin/materials" element={<ProtectedRoute><AdminMaterials /></ProtectedRoute>} />
              <Route path="/admin/materials/new" element={<ProtectedRoute><AdminMaterialNew /></ProtectedRoute>} />
              <Route path="/admin/materials/edit/:id" element={<ProtectedRoute><AdminMaterialEdit /></ProtectedRoute>} />
              <Route path="/admin/fix-materials" element={<ProtectedRoute><FixMaterialsPage /></ProtectedRoute>} />

              {/* Admin - Cases */}
              <Route path="/admin/cases" element={<ProtectedRoute><AdminCases /></ProtectedRoute>} />
              <Route path="/admin/cases/new" element={<ProtectedRoute><AdminCaseNew /></ProtectedRoute>} />
              <Route path="/admin/cases/edit/:id" element={<ProtectedRoute><AdminCaseEdit /></ProtectedRoute>} />

              {/* Admin - REI Projects */}
              <Route path="/admin/rei/novo" element={<ProtectedRoute><REIProjectForm /></ProtectedRoute>} />
              <Route path="/admin/rei/:id" element={<ProtectedRoute><REIProjectForm /></ProtectedRoute>} />



              <Route path="/admin/cronograma" element={<ProtectedRoute><GrowthCronograma /></ProtectedRoute>} />
              <Route path="/admin/cronograma/:id" element={<ProtectedRoute><GrowthCronograma /></ProtectedRoute>} />
              {/* Projects Listing */}
              <Route path="/admin/blog" element={<ProtectedRoute><AdminBlog /></ProtectedRoute>} />
              <Route path="/admin/blog/novo" element={<ProtectedRoute><PostEditor /></ProtectedRoute>} />
              <Route path="/admin/posts" element={<ProtectedRoute><AdminBlog /></ProtectedRoute>} />
              <Route path="/admin/projects" element={<ProtectedRoute><AdminProjects /></ProtectedRoute>} />
              
              {/* Revenue Cockpit — Pipeline & Billing Analytics */}
              <Route path="/admin/cockpit" element={<ProtectedRoute><RevenueCockpit /></ProtectedRoute>} />
              <Route path="/admin/revenue-cockpit" element={<ProtectedRoute><RevenueCockpit /></ProtectedRoute>} />
              <Route path="/cockpit" element={<ProtectedRoute><RevenueCockpit /></ProtectedRoute>} />
              {/* Unified Project Workspace */}
              <Route path="/admin/projects/:id/*" element={<ProtectedRoute><PageErrorBoundary><ProjectDetails /></PageErrorBoundary></ProtectedRoute>} />
              
              {/* Project Wiki / Document Editor */}
              <Route path="/admin/knowledge/:libraryId/doc/new" element={<ProtectedRoute><KnowledgeDocument /></ProtectedRoute>} />
              <Route path="/admin/knowledge/:libraryId/doc/:docId" element={<ProtectedRoute><KnowledgeDocument /></ProtectedRoute>} />
              
              {/* Meeting Recording Notion-Style Viewer */}
              <Route path="/admin/recording/:id" element={<ProtectedRoute><MeetingRecordingDoc /></ProtectedRoute>} />
              
              {/* Legacy Redirects */}
              <Route path="/admin/jornada" element={<Navigate to="/admin/projects" replace />} />
              {/* /admin/jornada/:id - handled above with JornadaRedirect */}

              {/* Admin - Diagnostic View (The Voice) */}
              <Route path="/admin/diagnostico/:id" element={<ProtectedRoute><DiagnosticView /></ProtectedRoute>} />

              {/* Admin - Strategic Plan Generator */}
              <Route path="/admin/planejamento/:reiProjectId" element={<ProtectedRoute><StrategicPlanGenerator /></ProtectedRoute>} />

              {/* Admin - Lifecycle Timeline */}
              <Route path="/admin/lifecycle" element={<ProtectedRoute><LifecycleTimeline /></ProtectedRoute>} />
              <Route path="/admin/lifecycle/:contactId" element={<ProtectedRoute><LifecycleTimeline /></ProtectedRoute>} />

              {/* Client - Strategic Plan Presentation (Public with token) */}
              <Route path="/plan/:token" element={<StrategicPlanPresentation />} />
              <Route path="/success/:token" element={<SuccessPlanPresentation />} />

              {/* GrowthMap — Strategic Intelligence Layer (The RevHackers) */}
              <Route path="/growthmap/:projectId" element={<ProtectedRoute><GrowthMapPage /></ProtectedRoute>} />
              <Route path="/growthmap" element={<ProtectedRoute><GrowthMapPage /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><GrowthMapPage /></ProtectedRoute>} />
              {/* Rota PlanSignPage removida */}
              <Route path="/hub/:id" element={<ClientProjectHub />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
              </ErrorBoundary>
            </Suspense>
            <FounderVideoWidget />
          </>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
