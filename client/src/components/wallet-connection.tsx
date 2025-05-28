import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWallet } from "@/hooks/use-wallet";
import { Wallet, X } from "lucide-react";

export default function WalletConnection() {
  const { isConnected, account, connectWallet, disconnectWallet, isConnecting } = useWallet();
  const [isOpen, setIsOpen] = useState(false);

  const handleConnect = async () => {
    await connectWallet();
    setIsOpen(false);
  };

  if (isConnected && account) {
    return (
      <Button
        variant="outline"
        onClick={disconnectWallet}
        className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 hover:border-emerald-700"
      >
        <Wallet className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">
          {account.substring(0, 6)}...{account.substring(account.length - 4)}
        </span>
        <span className="sm:hidden">Connected</span>
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0">
          <Wallet className="h-4 w-4 mr-2" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Connect Your Wallet</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors duration-200 bg-white text-slate-900 hover:text-primary-700"
            variant="outline"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <div className="text-left">
                <div className="font-medium">MetaMask</div>
                <div className="text-sm text-slate-500">Connect with MetaMask Wallet</div>
              </div>
            </div>
            {isConnecting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent" />
            ) : (
              <span className="text-slate-400">→</span>
            )}
          </Button>
          
          <div className="text-center text-sm text-slate-500 py-2">
            <p>
              Don't have a wallet?{" "}
              <a
                href="https://metamask.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700"
              >
                Learn more
              </a>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
