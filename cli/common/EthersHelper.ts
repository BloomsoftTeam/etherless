import { ethers } from 'ethers';
import { Contract } from 'ethers/contract';
import { Wallet } from 'ethers/wallet';
import { InfuraProvider } from 'ethers/providers';
import bent from 'bent';

const etherscanUrl = 'https://api-ropsten.etherscan.io/api';

class EthersHelper {
  readonly provider: InfuraProvider;

  readonly apiKey: string;

  constructor(infuraProvider: InfuraProvider, apiKey: string) {
    this.provider = infuraProvider;
    this.apiKey = apiKey;
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

  loadSmartContract(contractAddress: string, wallet?: Wallet): Promise<Contract> {
    return new Promise((resolve, reject) => {
      this.getContractInterfaceByAddress(contractAddress)
        .then((contractInterface) => {
          const contract = new Contract(contractAddress, contractInterface, this.provider);
          if (wallet) {
            resolve(contract.connect(wallet));
          } else {
            resolve(contract);
          }
        })
        .catch(reject);
    });
  }

  getContractInterfaceByAddress(contractAddress: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const query = `?module=contract&action=getabi&address=${contractAddress}&apikey=${this.apiKey}`;
      const getJSON = bent('json');
      getJSON(etherscanUrl + query)
        .then((response) => {
          if (response.status === '0') {
            reject(response);
          } else {
            resolve(response.result);
          }
        })
        .catch(reject);
    });
  }
}

export { EthersHelper as default };
