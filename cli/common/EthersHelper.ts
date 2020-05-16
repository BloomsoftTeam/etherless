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

  loadSmartContract(contractAddress: string, contractName: string, wallet?: Wallet):
  Promise<Contract> {
    return new Promise((resolve, reject) => {
      const contractArtifact = this.loader.fromArtifact(contractName, contractAddress);
      const contractABI = contractArtifact.abi;
      const contract = new Contract(contractAddress, contractABI, this.provider);
      if (contract) {
        if (wallet) {
          resolve(contract.connect(wallet));
          // resolve(contract);
        } else {
          resolve(contract);
        }
      } else {
        reject(contract);
      }
    });
  }
}

export { EthersHelper as default };
