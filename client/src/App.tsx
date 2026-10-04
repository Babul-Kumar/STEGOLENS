import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Navigation from "@/components/navigation";
import { Footer } from "@/components/footer";

import LandingPage from "@/pages/landing";
import AnalyzePage from "@/pages/analyze";
import AboutPage from "@/pages/about";
import HowItWorksPage from "@/pages/how-it-works";
import Dashboard from "@/pages/dashboard";
import History from "@/pages/history";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors selection:bg-primary/20 selection:text-primary">
      <Navigation />
      <main className="flex-1 flex flex-col">
        <Switch>
          <Route path="/" component={LandingPage} />
          <Route path="/analyze" component={AnalyzePage} />
          <Route path="/analysis/:id">
            {(params) => <Redirect to={`/analyze?id=${params.id}`} />}
          </Route>
          <Route path="/about" component={AboutPage} />
          <Route path="/how-it-works" component={HowItWorksPage} />
          
          {/* Legacy route redirects & aliases */}
          <Route path="/upload">
            {() => <Redirect to="/analyze" />}
          </Route>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/history" component={History} />
          
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
