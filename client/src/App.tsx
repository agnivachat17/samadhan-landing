import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Notifications from "./pages/Notifications";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Challenges from "./pages/Challenges";
import ChallengeDetail from "./pages/ChallengeDetail";
import CitizenDashboard from "./pages/CitizenDashboard";
import CitizenSettings from "./pages/CitizenSettings";
import CitizenChallengeRecord from "./pages/CitizenChallengeRecord";
import CitizenCloseoutConfirm from "./pages/CitizenCloseoutConfirm";
import CitizenFollowing from "./pages/CitizenFollowing";
import InstituteChallengeReview from "./pages/InstituteChallengeReview";
import InstituteChallenges from "./pages/InstituteChallenges";
import InstituteDashboard from "./pages/InstituteDashboard";
import InstituteProfile from "./pages/InstituteProfile";
import InstituteProjects from "./pages/InstituteProjects";
import InstituteProjectWorkspace from "./pages/InstituteProjectWorkspace";
import ProjectCloseout from "./pages/ProjectCloseout";
import IndustryDashboard from "./pages/IndustryDashboard";
import IndustryProjectInterest from "./pages/IndustryProjectInterest";
import IndustryProfile from "./pages/IndustryProfile";
import AdminDashboard from "./pages/AdminDashboard";
import AdminChallenges from "./pages/AdminChallenges";
import AdminChallengeDetail from "./pages/AdminChallengeDetail";
import AdminInstitutions from "./pages/AdminInstitutions";
import AdminReports from "./pages/AdminReports";
import AdminUsers from "./pages/AdminUsers";
import AdminProjects from "./pages/AdminProjects";
import AdminProjectDetail from "./pages/AdminProjectDetail";
import AdminCloseoutReview from "./pages/AdminCloseoutReview";
import AdminSettings from "./pages/AdminSettings";
import AdminUserDetail from "./pages/AdminUserDetail";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import SubmitChallenge from "./pages/SubmitChallenge";
import OrganizationOnboarding from "./pages/OrganizationOnboarding";
import AdminInstitutionVerify from "./pages/AdminInstitutionVerify";

function guarded(Component: React.ComponentType) {
  return () => (
    <ProtectedRoute>
      <Component />
    </ProtectedRoute>
  );
}

function citizenGuarded(Component: React.ComponentType) {
  return () => (
    <ProtectedRoute roles={["citizen", "admin"]}>
      <Component />
    </ProtectedRoute>
  );
}

function instituteGuarded(
  Component: React.ComponentType,
  options?: { requireVerified?: boolean }
) {
  return () => (
    <ProtectedRoute
      roles={["institution", "admin"]}
      requireVerifiedOrganization={options?.requireVerified}
    >
      <Component />
    </ProtectedRoute>
  );
}

function industryGuarded(
  Component: React.ComponentType,
  options?: { requireVerified?: boolean }
) {
  return () => (
    <ProtectedRoute
      roles={["industry", "admin"]}
      requireVerifiedOrganization={options?.requireVerified}
    >
      <Component />
    </ProtectedRoute>
  );
}

function adminGuarded(Component: React.ComponentType) {
  return () => (
    <ProtectedRoute roles={["admin"]}>
      <Component />
    </ProtectedRoute>
  );
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/challenges"} component={Challenges} />
      <Route path={"/challenges/:id"} component={ChallengeDetail} />
      <Route
        path={"/citizen/dashboard"}
        component={citizenGuarded(CitizenDashboard)}
      />
      <Route
        path={"/citizen/settings"}
        component={citizenGuarded(CitizenSettings)}
      />
      <Route
        path={"/citizen/challenges/:id"}
        component={citizenGuarded(CitizenChallengeRecord)}
      />
      <Route
        path={"/citizen/challenges/:id/closeout"}
        component={citizenGuarded(CitizenCloseoutConfirm)}
      />
      <Route
        path={"/citizen/following"}
        component={citizenGuarded(CitizenFollowing)}
      />
      <Route
        path={"/institute/dashboard"}
        component={instituteGuarded(InstituteDashboard, {
          requireVerified: true,
        })}
      />
      <Route
        path={"/institute/challenges"}
        component={instituteGuarded(InstituteChallenges, {
          requireVerified: true,
        })}
      />
      <Route
        path={"/institute/challenges/:id"}
        component={instituteGuarded(InstituteChallengeReview, {
          requireVerified: true,
        })}
      />
      <Route
        path={"/institute/projects/:id"}
        component={instituteGuarded(InstituteProjectWorkspace, {
          requireVerified: true,
        })}
      />
      <Route
        path={"/institute/projects/:id/closeout"}
        component={instituteGuarded(ProjectCloseout, { requireVerified: true })}
      />
      <Route
        path={"/institute/projects"}
        component={instituteGuarded(InstituteProjects, {
          requireVerified: true,
        })}
      />
      <Route
        path={"/institute/profile"}
        component={instituteGuarded(InstituteProfile)}
      />
      <Route
        path={"/industry/dashboard"}
        component={industryGuarded(IndustryDashboard, {
          requireVerified: true,
        })}
      />
      <Route
        path={"/industry/projects/:id"}
        component={industryGuarded(IndustryProjectInterest, {
          requireVerified: true,
        })}
      />
      <Route
        path={"/industry/profile"}
        component={industryGuarded(IndustryProfile)}
      />
      <Route
        path={"/admin/dashboard"}
        component={adminGuarded(AdminDashboard)}
      />
      <Route
        path={"/admin/challenges"}
        component={adminGuarded(AdminChallenges)}
      />
      <Route
        path={"/admin/challenges/:id"}
        component={adminGuarded(AdminChallengeDetail)}
      />
      <Route
        path={"/admin/institutions"}
        component={adminGuarded(AdminInstitutions)}
      />
      <Route path={"/admin/reports"} component={adminGuarded(AdminReports)} />
      <Route path={"/admin/users"} component={adminGuarded(AdminUsers)} />
      <Route
        path={"/admin/users/:email"}
        component={adminGuarded(AdminUserDetail)}
      />
      <Route path={"/admin/settings"} component={adminGuarded(AdminSettings)} />
      <Route path={"/admin/projects"} component={adminGuarded(AdminProjects)} />
      <Route
        path={"/admin/projects/:id"}
        component={adminGuarded(AdminProjectDetail)}
      />
      <Route
        path={"/admin/projects/:id/closeout"}
        component={adminGuarded(AdminCloseoutReview)}
      />
      <Route
        path={"/admin/institutions/:id/verify"}
        component={adminGuarded(AdminInstitutionVerify)}
      />
      <Route path={"/citizen/submit"} component={SubmitChallenge} />
      <Route
        path={"/onboarding/:kind"}
        component={() => (
          <ProtectedRoute roles={["institution", "industry"]}>
            <OrganizationOnboarding />
          </ProtectedRoute>
        )}
      />
      <Route path={"/signup"} component={SignUp} />
      <Route path={"/login"} component={Login} />
      <Route path={"/notifications"} component={guarded(Notifications)} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
