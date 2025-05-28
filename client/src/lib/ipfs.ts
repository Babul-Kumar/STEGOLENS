// IPFS service for storing analysis reports
export class IPFSService {
  private readonly API_BASE = '/api/ipfs';

  async uploadReport(reportData: any): Promise<string> {
    try {
      const response = await fetch(`${this.API_BASE}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportData }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload to IPFS');
      }

      const data = await response.json();
      return data.ipfsHash;
    } catch (error) {
      console.error('IPFS upload failed:', error);
      throw error;
    }
  }

  getIPFSUrl(hash: string): string {
    // Using a public IPFS gateway
    return `https://ipfs.io/ipfs/${hash}`;
  }

  formatHash(hash: string): string {
    if (!hash || hash.length < 10) return hash;
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  }
}

export const ipfsService = new IPFSService();
