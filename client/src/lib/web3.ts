import { ethers } from "ethers";

// Mock smart contract ABI for steganography detection
const STEGO_CONTRACT_ABI = [
  {
    "inputs": [
      {"name": "user", "type": "address"},
      {"name": "ipfsHash", "type": "string"},
      {"name": "imageHash", "type": "bytes32"}
    ],
    "name": "storeReport",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getReports",
    "outputs": [
      {
        "components": [
          {"name": "user", "type": "address"},
          {"name": "ipfsHash", "type": "string"},
          {"name": "timestamp", "type": "uint256"},
          {"name": "imageHash", "type": "bytes32"}
        ],
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Mock contract address (would be real on testnet/mainnet)
const CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890";

export class Web3Service {
  private provider: ethers.BrowserProvider | null = null;
  private contract: ethers.Contract | null = null;

  async initialize() {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask not found');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await this.provider.getSigner();
    
    this.contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      STEGO_CONTRACT_ABI,
      signer
    );
  }

  async storeReport(ipfsHash: string, imageHash: string): Promise<string> {
    if (!this.contract) {
      await this.initialize();
    }

    try {
      // For now, return a mock transaction hash
      // In production, this would interact with the real smart contract
      const mockTxHash = `0x${Math.random().toString(16).substring(2).padStart(64, '0')}`;
      
      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return mockTxHash;
    } catch (error) {
      console.error('Failed to store report on blockchain:', error);
      throw error;
    }
  }

  async getReports(userAddress: string): Promise<any[]> {
    if (!this.contract) {
      await this.initialize();
    }

    try {
      // Mock response for now
      return [];
    } catch (error) {
      console.error('Failed to get reports from blockchain:', error);
      throw error;
    }
  }

  formatAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  formatEther(wei: string): string {
    try {
      return ethers.formatEther(wei);
    } catch {
      return '0.0';
    }
  }
}

export const web3Service = new Web3Service();
