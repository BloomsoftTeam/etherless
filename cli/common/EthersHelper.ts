import { ethers } from 'ethers';
import { Contract } from 'ethers/contract';
import { Wallet } from 'ethers/wallet';
import { JsonRpcProvider } from 'ethers/providers';
import { setupLoader, TruffleLoader } from '@openzeppelin/contract-loader';

class EthersHelper {
  readonly provider: JsonRpcProvider;
  readonly loader: TruffleLoader;

  constructor(rpcProvider: JsonRpcProvider) {
    this.provider = rpcProvider;
    this.loader = setupLoader({ provider: rpcProvider }).truffle;
  }

  newWallet(): Wallet {
    const bytes = ethers.utils.randomBytes(16);
    const randomMnemonic = ethers.utils.HDNode.entropyToMnemonic(bytes, ethers.wordlists.en);
    const myWallet = Wallet.fromMnemonic(randomMnemonic);
    return myWallet.connect(this.provider);
  }

  getWalletFromPrivate(privateKey: string): Wallet | null {
    return new Wallet(privateKey, this.provider);
  }

  loadSmartContract(contractAddress: string, contractName: string, wallet?: Wallet): Promise<Contract> {
    return new Promise((resolve, reject) => {
      const contract = this.loader.fromArtifact(contractName, contractAddress);
      if (contract) resolve(contract);
      else reject(contract);
    });
  }
}

export { EthersHelper as default };
