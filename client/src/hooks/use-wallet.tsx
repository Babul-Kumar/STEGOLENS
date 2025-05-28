import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ethers } from "ethers";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WalletContextType {
  isConnected: boolean;
  account: string | null;
  balance: string | null;
  user: any | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isConnecting: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          const account = accounts[0];
          const balance = await provider.getBalance(account.address);
          
          setAccount(account.address);
          setBalance(ethers.formatEther(balance));
          setIsConnected(true);
          
          // Get user data
          await fetchUserData(account.address);
        }
      }
    } catch (error) {
      console.error('Failed to check wallet connection:', error);
    }
  };

  const fetchUserData = async (walletAddress: string) => {
    try {
      const response = await apiRequest('GET', `/api/auth/user/${walletAddress}`);
      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      // User doesn't exist yet, that's ok
      console.log('User not found, will create on first login');
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      toast({
        title: "MetaMask Required",
        description: "Please install MetaMask to connect your wallet",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const accounts = await provider.listAccounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const account = accounts[0];
      const balance = await provider.getBalance(account.address);
      
      setAccount(account.address);
      setBalance(ethers.formatEther(balance));
      setIsConnected(true);

      // Create or get user
      try {
        const response = await apiRequest('POST', '/api/auth/connect', {
          walletAddress: account.address,
          nickname: null
        });
        const data = await response.json();
        setUser(data.user);
      } catch (error) {
        console.error('Failed to create/get user:', error);
      }

      toast({
        title: "Wallet Connected",
        description: "Successfully connected to MetaMask",
      });

    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setAccount(null);
    setBalance(null);
    setUser(null);
    
    toast({
      title: "Wallet Disconnected",
      description: "Wallet has been disconnected",
    });
  };

  return (
    <WalletContext.Provider value={{
      isConnected,
      account,
      balance,
      user,
      connectWallet,
      disconnectWallet,
      isConnecting,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

// Add window.ethereum type declaration
declare global {
  interface Window {
    ethereum?: any;
  }
}
