import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu, Binary, ArrowRight, Activity, Clock, HelpCircle, Info, ShieldCheck } from "lucide-react";

export default function Navigation() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { href: "/analyze", label: "Analyze", icon: Activity, active: location === "/analyze" },
    { href: "/history", label: "History", icon: Clock, active: location === "/history" },
    { href: "/how-it-works", label: "How It Works", icon: HelpCircle, active: location === "/how-it-works" },
    { href: "/about", label: "About", icon: Info, active: location === "/about" },
  ];

  return (
    <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-50 transition-colors">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-15">
          {/* Logo & Brand Identity */}
          <div className="flex items-center space-x-7">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md py-1 pr-2"
            >
              <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/25 flex items-center justify-center text-primary group-hover:bg-primary/20 group-hover:border-primary/40 transition-all">
                <Binary className="h-4.5 w-4.5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-extrabold tracking-tight text-foreground text-base">
                    STEGO<span className="text-primary">LENS</span>
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground font-semibold border border-border">
                    v1.0
                  </span>
                </div>
                <span className="text-[9px] text-muted-foreground font-mono tracking-wider uppercase mt-1">
                  Digital Forensics
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                      item.active
                        ? "text-primary bg-primary/10 font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 opacity-70" />
                    <span>{item.label}</span>
                    {item.active && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="flex items-center gap-2 pr-2 border-r border-border text-[11px] font-mono text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>FORENSICS READY</span>
            </div>
            <ThemeToggle />
            <Link href="/analyze">
              <Button size="sm" className="h-8 px-3.5 text-xs font-semibold gap-1.5 shadow-sm interactive-btn">
                <span>Analyze Image</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {/* Mobile Actions & Drawer */}
          <div className="flex md:hidden items-center space-x-2">
            <ThemeToggle />
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Open menu">
                  <Menu className="h-4.5 w-4.5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px] p-5">
                <SheetHeader className="text-left pb-4 border-b border-border">
                  <SheetTitle className="flex items-center gap-2 text-base font-bold">
                    <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
                      <Binary className="h-4 w-4" />
                    </div>
                    <span>STEGOLENS</span>
                  </SheetTitle>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    DIGITAL IMAGE FORENSICS CONSOLE
                  </p>
                </SheetHeader>
                <div className="flex flex-col space-y-1.5 mt-5">
                  <Link
                    href="/"
                    onClick={() => setIsOpen(false)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location === "/"
                        ? "text-primary bg-primary/10 font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    Home
                  </Link>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2.5 ${
                          item.active
                            ? "text-primary bg-primary/10 font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-4 w-4 opacity-75" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                  <div className="pt-4 mt-4 border-t border-border space-y-3">
                    <Link href="/analyze" onClick={() => setIsOpen(false)}>
                      <Button className="w-full gap-2 justify-center text-xs font-semibold h-9">
                        <span>Launch Analysis</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <div className="p-3 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground font-mono flex items-center justify-between">
                      <span>ENGINE STATUS</span>
                      <span className="text-emerald-500 font-semibold">● ONLINE</span>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
