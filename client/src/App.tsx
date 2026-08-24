import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Notifications from "./pages/Notifications";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
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

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/challenges"} component={Challenges} />
      <Route path={"/challenges/:id"} component={ChallengeDetail} />
      <Route path={"/citizen/dashboard"} component={CitizenDashboard} />
      <Route path={"/citizen/settings"} component={CitizenSettings} />
      <Route path={"/citizen/challenges/:id"} component={CitizenChallengeRecord} />
      <Route path={"/citizen/challenges/:id/closeout"} component={CitizenCloseoutConfirm} />
      <Route path={"/citizen/following"} component={CitizenFollowing} />
      <Route path={"/institute/dashboard"} component={InstituteDashboard} />
      <Route path={"/institute/challenges"} component={InstituteChallenges} />
      <Route path={"/institute/challenges/:id"} component={InstituteChallengeReview} />
      <Route path={"/institute/projects/:id"} component={InstituteProjectWorkspace} />
      <Route path={"/institute/projects/:id/closeout"} component={ProjectCloseout} />
      <Route path={"/institute/projects"} component={InstituteProjects} />
      <Route path={"/institute/profile"} component={InstituteProfile} />
      <Route path={"/industry/dashboard"} component={IndustryDashboard} />
      <Route path={"/industry/projects/:id"} component={IndustryProjectInterest} />
      <Route path={"/industry/profile"} component={IndustryProfile} />
      <Route path={"/admin/dashboard"} component={AdminDashboard} />
      <Route path={"/admin/challenges"} component={AdminChallenges} />
      <Route path={"/admin/challenges/:id"} component={AdminChallengeDetail} />
      <Route path={"/admin/institutions"} component={AdminInstitutions} />
      <Route path={"/admin/reports"} component={AdminReports} />
      <Route path={"/admin/users"} component={AdminUsers} />
      <Route path={"/admin/users/:email"} component={AdminUserDetail} />
      <Route path={"/admin/settings"} component={AdminSettings} />
      <Route path={"/admin/projects"} component={AdminProjects} />
      <Route path={"/admin/projects/:id"} component={AdminProjectDetail} />
      <Route path={"/admin/projects/:id/closeout"} component={AdminCloseoutReview} />
      <Route path={"/citizen/submit"} component={SubmitChallenge} />
      <Route path={"/onboarding/:kind"} component={OrganizationOnboarding} />
      <Route path={"/admin/institutions/:id/verify"} component={AdminInstitutionVerify} />
      <Route path={"/signup"} component={SignUp} />
      <Route path={"/login"} component={Login} />
      <Route path={"/notifications"} component={Notifications} />
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
