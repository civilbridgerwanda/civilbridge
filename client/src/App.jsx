import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import MainLayout from "./components/MainLayout";
import DashboardShell from "./components/DashboardShell";
import PageLoader from "./components/PageLoader";
import RequireAdmin from "./components/RequireAdmin";
import RequireAuth from "./components/RequireAuth";
import Home from "./pages/Home";
import { usePageTracking } from "./lib/usePageTracking";
import { useScrollToTop } from "./lib/useScrollToTop";

// Route-level code splitting (lazy loading): each page below is only
// downloaded by the browser the first time someone actually navigates to
// it, instead of all being bundled into the initial page load. Home stays
// eager since it's the landing page almost everyone hits first.
const Marketplace = lazy(() => import("./pages/Marketplace"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const Experts = lazy(() => import("./pages/Experts"));
const ExpertDetail = lazy(() => import("./pages/ExpertDetail"));
const Plans = lazy(() => import("./pages/Plans"));
const PlanDetail = lazy(() => import("./pages/PlanDetail"));
const Estimator = lazy(() => import("./pages/Estimator"));
const AIStudio = lazy(() => import("./pages/AIStudio"));
const ListProperty = lazy(() => import("./pages/ListProperty"));
const JoinAsExpert = lazy(() => import("./pages/JoinAsExpert"));
const ClientDashboard = lazy(() => import("./pages/dashboard/ClientDashboard"));
const ExpertDashboard = lazy(() => import("./pages/dashboard/ExpertDashboard"));
const PropertyOwnerDashboard = lazy(() => import("./pages/dashboard/PropertyOwnerDashboard"));
const Messages = lazy(() => import("./pages/Messages"));
const Payments = lazy(() => import("./pages/Payments"));
const Settings = lazy(() => import("./pages/Settings"));
const About = lazy(() => import("./pages/About"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Contact = lazy(() => import("./pages/Contact"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const StaticPage = lazy(() => import("./pages/StaticPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));

const staticPages = [
  { path: "/docs", title: "Documentation", description: "Guides for using the CivilBridge platform." },
  { path: "/help", title: "Help Center", description: "Answers to common CivilBridge questions." },
  { path: "/blog", title: "Blog", description: "News and insights from CivilBridge." },
];

export default function App() {
  usePageTracking();
  useScrollToTop();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Full-bleed auth pages - no site navbar/footer */}
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/get-started" element={<SignUp />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/oauth-callback" element={<OAuthCallback />} />

        {/* Dashboard shell: left sidebar + top bar (search, messages,
            notifications, profile) - its own layout, no marketing
            navbar/footer. DashboardShell itself enforces sign-in. */}
        <Route element={<DashboardShell />}>
          <Route path="/dashboard" element={<ClientDashboard />} />
          <Route path="/expert-dashboard" element={<ExpertDashboard />} />
          <Route path="/my-properties" element={<PropertyOwnerDashboard />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:id" element={<Messages />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/settings" element={<Settings />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            }
          />
        </Route>

        {/* Standard marketing site layout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/marketplace/:id" element={<PropertyDetail />} />
          <Route path="/experts" element={<Experts />} />
          <Route path="/experts/:id" element={<ExpertDetail />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/plans/:id" element={<PlanDetail />} />
          <Route path="/estimator" element={<Estimator />} />
          <Route path="/ai-studio" element={<AIStudio />} />
          <Route path="/about" element={<About />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route
            path="/list-property"
            element={
              <RequireAuth>
                <ListProperty />
              </RequireAuth>
            }
          />
          <Route
            path="/join-as-expert"
            element={
              <RequireAuth>
                <JoinAsExpert />
              </RequireAuth>
            }
          />
          {staticPages.map((p) => (
            <Route key={p.path} path={p.path} element={<StaticPage title={p.title} description={p.description} />} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
