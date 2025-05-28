import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useWallet } from "@/hooks/use-wallet";
import WalletConnection from "@/components/wallet-connection";
import { Menu, Shield } from "lucide-react";

export default function Navigation() {
  const [location] = useLocation();
  const { isConnected, account, balance } = useWallet();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Dashboard", active: location === "/" },
    { href: "/upload", label: "Upload", active: location === "/upload" },
    { href: "/history", label: "History", active: location === "/history" },
  ];

  const NavItems = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex ${mobile ? 'flex-col space-y-4' : 'items-baseline space-x-8'}`}>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
            item.active
              ? "text-primary-600 bg-primary-50"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          }`}
          onClick={() => mobile && setIsOpen(false)}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <Shield className="h-8 w-8 text-primary-600 mr-2" />
              <span className="text-xl font-bold text-slate-900">StegoGuard</span>
            </Link>
            <div className="hidden md:block">
              <div className="ml-10">
                <NavItems />
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {isConnected && account && (
              <div className="hidden sm:flex items-center space-x-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-emerald-700 font-mono">
                  {account.substring(0, 6)}...{account.substring(account.length - 4)}
                </span>
                {balance && (
                  <span className="text-xs text-emerald-600 font-mono">
                    {parseFloat(balance).toFixed(3)} ETH
                  </span>
                )}
              </div>
            )}
            
            <WalletConnection />
            
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col space-y-6 mt-6">
                  <NavItems mobile />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
