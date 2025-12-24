import { Switch, Route, Redirect } from "wouter";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/theme-context";
import AppLayout from "@/components/AppLayout";
import Splash from "@/pages/splash";
import NewWelcome from "@/pages/new-welcome";
import CustomAuth from "@/pages/custom-auth";
import NewDashboard from "@/pages/new-dashboard";
import History from "@/pages/history";
import Scanner from "@/pages/scanner";
import NewChat from "@/pages/new-chat";
import SymptomChecker from "@/pages/symptom-checker";
import Profile from "@/pages/profile";
import ProfileDetails from "@/pages/profile-details";
import HelpCenter from "@/pages/help-center";
import TermsAndConditions from "@/pages/terms-conditions";
import PrivacyPolicy from "@/pages/privacy-policy";
import Settings from "@/pages/settings";
import MedicineReminder from "@/pages/medicine-reminder";
import AddMedicine from "@/pages/add-medicine";
import AIDoctorChat from "@/pages/ai-doctor-chat";
import HealthMonitoring from "@/pages/health-monitoring";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminUserManagement from "@/pages/admin-user-management";
import AdminReports from "@/pages/admin-reports";
import AdminPayments from "@/pages/admin-payments";
import AdminSupport from "@/pages/admin-support";
import AdminNotifications from "@/pages/admin-notifications";
import AdminMessageReports from "@/pages/admin-message-reports";
import Messaging from "@/pages/messaging";
import HealthRecords from "@/pages/health-records";
import Billing from "@/pages/billing";
import Subscription from "@/pages/subscription";
import SupportTickets from "@/pages/support-tickets";
import Prescriptions from "@/pages/prescriptions";
import MedicalProfile from "@/pages/medical-profile";
import PayoutManagement from "@/pages/admin/payout-management";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import VerifyEmail from "@/pages/verify-email";
import PrescriptionScanner from "@/pages/prescription-scanner";
import PillIdentifier from "@/pages/pill-identifier";
import SkinAnalyzer from "@/pages/skin-analyzer";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isSignedIn, isLoaded } = useAuth();
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }
  
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function ProtectedRouteNoLayout({ component: Component }: { component: React.ComponentType }) {
  const { isSignedIn, isLoaded } = useAuth();
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }
  
  return <Component />;
}

function RootRedirect() {
  const { isSignedIn, isLoaded, user } = useAuth();
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isSignedIn) {
    return <Redirect to="/splash" />;
  }

  if (user?.roles?.includes("admin")) {
    return <Redirect to="/admin" />;
  } else if (user?.roles?.includes("user")) {
    return <Redirect to="/dashboard" />;
  }

  return <Redirect to="/splash" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/splash" component={Splash} />
      <Route path="/welcome" component={NewWelcome} />
      
      <Route path="/sign-in" component={CustomAuth} />
      <Route path="/sign-up" component={CustomAuth} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      
      <Route path="/dashboard">
        <ProtectedRoute component={NewDashboard} />
      </Route>
      <Route path="/chat">
        <ProtectedRoute component={NewChat} />
      </Route>
      <Route path="/symptom-checker">
        <ProtectedRoute component={SymptomChecker} />
      </Route>
      <Route path="/history">
        <ProtectedRoute component={History} />
      </Route>
      <Route path="/scanner">
        <ProtectedRoute component={Scanner} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={Profile} />
      </Route>
      <Route path="/profile-details">
        <ProtectedRoute component={ProfileDetails} />
      </Route>
      <Route path="/help-center">
        <ProtectedRoute component={HelpCenter} />
      </Route>
      <Route path="/terms-conditions">
        <ProtectedRoute component={TermsAndConditions} />
      </Route>
      <Route path="/privacy-policy">
        <ProtectedRoute component={PrivacyPolicy} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>
      <Route path="/medicine-reminder">
        <ProtectedRoute component={MedicineReminder} />
      </Route>
      <Route path="/add-medicine">
        <ProtectedRouteNoLayout component={AddMedicine} />
      </Route>
      <Route path="/ai-doctor-chat">
        <ProtectedRouteNoLayout component={AIDoctorChat} />
      </Route>
      <Route path="/health-monitoring">
        <ProtectedRoute component={HealthMonitoring} />
      </Route>
      <Route path="/messaging">
        <ProtectedRoute component={Messaging} />
      </Route>
      <Route path="/health-records">
        <ProtectedRoute component={HealthRecords} />
      </Route>
      <Route path="/billing">
        <ProtectedRoute component={Billing} />
      </Route>
      <Route path="/subscription">
        <ProtectedRoute component={Subscription} />
      </Route>
      <Route path="/support">
        <ProtectedRoute component={SupportTickets} />
      </Route>
      <Route path="/prescriptions">
        <ProtectedRoute component={Prescriptions} />
      </Route>
      <Route path="/medical-profile">
        <ProtectedRoute component={MedicalProfile} />
      </Route>
      <Route path="/prescription-scanner">
        <ProtectedRouteNoLayout component={PrescriptionScanner} />
      </Route>
      <Route path="/pill-identifier">
        <ProtectedRouteNoLayout component={PillIdentifier} />
      </Route>
      <Route path="/skin-analyzer">
        <ProtectedRouteNoLayout component={SkinAnalyzer} />
      </Route>

      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} />
      </Route>
      <Route path="/admin/user-management">
        <ProtectedRoute component={AdminUserManagement} />
      </Route>
      <Route path="/admin/reports">
        <ProtectedRoute component={AdminReports} />
      </Route>
      <Route path="/admin/payments">
        <ProtectedRoute component={AdminPayments} />
      </Route>
      <Route path="/admin/support">
        <ProtectedRoute component={AdminSupport} />
      </Route>
      <Route path="/admin/notifications">
        <ProtectedRoute component={AdminNotifications} />
      </Route>
      <Route path="/admin/message-reports">
        <ProtectedRoute component={AdminMessageReports} />
      </Route>
      <Route path="/admin/payouts">
        <ProtectedRoute component={PayoutManagement} />
      </Route>

      <Route path="/">
        <RootRedirect />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AuthProvider>
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
