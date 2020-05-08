import { Wallet, Contract } from 'ethers';

import log from './common/Logger';
import EthersHelper from './common/EthersHelper';

const RequestUploadEvent = 'requestUpload';
const RunResultEvent = 'runResult';
const RunRequestEvent = 'runRequest';
const DeleteEventToken = 'deleteRequest';
const DeleteSuccessEvent = 'deleteSuccess';
const DeleteFailureEvent = 'deleteFailure';
const ReceiveDeployOperationToken = 'uploadToken';

export interface EthereumManagerInterface {
  generateNewWallet(): Wallet;
  getWalletFromPrivate(chiave: string): Wallet;
  loadSmartContract(address: string): Promise<Contract>;
  getContractInterfaceByAddress(contractAddress: string): Promise<string>;
  getDeployFee(): Promise<number>;
  deploy(proofToken: string, funcName: string): Promise<string>;
  getFuncPrice(funcName: string): Promise<number>;
  sendRunRequest(funcName: string, parameters: string): Promise<void>;
  sendDeleteRequest(funcName: string): Promise<void>;
  listenRunEvents(myOpToken: string): Promise<string>;
  listenOperationTokenRunEvent(funcName: string): Promise<string>; // todo cambiare con un token
  listenOperationTokenDeleteEvent(funcName: string): Promise<string>;
  listenRequestUploadEvents(onEvent: any);
  listenDeleteEvents(myOpToken: string): Promise<void>;
  listenOperationTokenDeployEvents(signedToken: string): Promise<string>;
  terminateListenDeleteToken(): Promise<void>;
}

export interface ContractAddressesInterface {
  storage: string;
  deploy: string;
  run: string;
  remove: string;
}

class EthereumManager implements EthereumManagerInterface {
  readonly ethersHelper: EthersHelper;

  readonly storageContractAddress: string;

  readonly deployContractAddress: string;

  readonly runContractAddress: string;

  readonly deleteContractAddress: string;

  wallet: Wallet;

  constructor(ethersHelper: EthersHelper, contracts: ContractAddressesInterface) {
    this.ethersHelper = ethersHelper;
    this.storageContractAddress = contracts.storage;
    this.deployContractAddress = contracts.deploy;
    this.runContractAddress = contracts.run;
    this.deleteContractAddress = contracts.remove;
  }

  generateNewWallet(): Wallet {
    this.wallet = this.ethersHelper.newWallet();
    return this.wallet;
  }

  getWalletFromPrivate(privateKey: string): Wallet {
    try {
      this.wallet = this.ethersHelper.getWalletFromPrivate(privateKey);
      return this.wallet;
    } catch (error) {
      return null;
    }
  }

  loadSmartContract(address: string): Promise<Contract> {
    return this.ethersHelper.loadSmartContract(address);
  }

  getContractInterfaceByAddress(contractAddress: string): Promise<string> {
    return this.ethersHelper.getContractInterfaceByAddress(contractAddress);
  }

  getDeployFee(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(this.deployContractAddress, this.wallet)
        .then((deployContract) => {
          deployContract.getDeployFee()
            .then(resolve)
            .catch(reject);
        }).catch(reject);
    });
  }

  deploy(proofToken: string, funcName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.wallet === undefined) {
        reject(new Error('[EthereumManager]\twallet is not set'));
        return;
      }
      this.ethersHelper.loadSmartContract(this.deployContractAddress, this.wallet)
        .then((deployContract) => {
          deployContract.getDeployFee()
            .then((fee) => { // watisthis da controllare
              log.info('[EthereumManager]\treceived deploy fee');
              const feeNumber = Number(fee);
              deployContract.deploy(
                proofToken,
                funcName,
                { value: feeNumber, gasLimit: 900000 },
              )
                .then()
                .catch(reject);
              resolve();
            })
            .catch(reject);
        })
        .catch(reject);
    });
  }

  // on: ((string, number, number, string, string) => void
  listenOperationTokenDeployEvents(signedToken: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(this.deployContractAddress, this.wallet)
        .then((deployContract) => {
          deployContract.on(ReceiveDeployOperationToken,
            (aSignedToken: string, opToken: string) => {
              if (signedToken === aSignedToken) {
                resolve(opToken);
                deployContract.removeAllListeners(ReceiveDeployOperationToken);
              }
            });
        }).catch(reject);
    });
  }

  // on: ((string, number, number, string, string) => void
  listenRequestUploadEvents(myOpToken: string) {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(this.deployContractAddress, this.wallet)
        .then((deployContract) => {
          deployContract.on(RequestUploadEvent, (opToken: string) => {
            if (myOpToken === opToken) {
              resolve();
              deployContract.removeAllListeners(RequestUploadEvent);
            }
          });
        }).catch(reject);
    });
  }

  getFuncPrice(funcName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(this.runContractAddress, this.wallet)
        .then((runContract) => {
          runContract.getFuncPrice(funcName).then(resolve).catch(reject);
        }).catch(reject);
    });
  }

  sendRunRequest(funcName: string, parameters: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(this.runContractAddress, this.wallet)
        .then((runContract) => {
          runContract.checkFuncPrice(funcName)
            .then((price) => {
              runContract.sendRunRequest(
                funcName,
                parameters,
                { value: price, gasLimit: 900000 },
              )
                .then(() => {
                  resolve();
                })
                .catch(log.error);
            }).catch(reject);
        })
        .catch(log.error);
    });
  }

  listenOperationTokenRunEvent(funcName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(this.runContractAddress, this.wallet)
        .then((runContract) => {
          runContract.on(RunRequestEvent, (opToken: string, aFuncName: string) => {
            if (funcName === aFuncName) {
              resolve(opToken);
              runContract.removeAllListeners(RunRequestEvent);
            }
          });
        })
        .catch(reject);
    });
  }

  listenRunEvents(myOpToken: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(this.runContractAddress, this.wallet)
        .then((runContract) => {
          runContract.on(RunResultEvent, (opToken: string, funcResult: string) => {
            if (myOpToken === opToken) {
              resolve(funcResult);
              runContract.removeAllListeners(RunResultEvent);
            }
          });
        }).catch(reject);
    });
  }

  sendDeleteRequest(funcName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(this.deleteContractAddress, this.wallet)
        .then((deleteContract) => {
          deleteContract.sendDeleteRequest(funcName, { gasLimit: 900000 })
            .then((event) => {
              event.wait()
                .then(resolve)
                .catch(reject);
            })
            .catch(reject);
        }).catch(reject);
    });
  }

  listenOperationTokenDeleteEvent(myFunc: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(this.deleteContractAddress, this.wallet)
        .then((deleteContract) => {
          deleteContract.on(DeleteEventToken, (opToken: string, funcName: string) => {
            if (myFunc === funcName) {
              resolve(opToken);
              deleteContract.removeAllListeners(DeleteEventToken);
            }
          });
        }).catch(reject);
    });
  }

  listenDeleteEvents(myOpToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(this.deleteContractAddress, this.wallet)
        .then((deleteContract) => {
          const removeListeners = () => {
            deleteContract.removeAllListeners(DeleteSuccessEvent);
            deleteContract.removeAllListeners(DeleteFailureEvent);
          };
          deleteContract.on(DeleteSuccessEvent, (opToken) => {
            if (myOpToken === opToken) {
              resolve();
              removeListeners();
            }
          });
          deleteContract.on(DeleteFailureEvent, (opToken) => {
            if (myOpToken === opToken) {
              reject();
              removeListeners();
            }
          });
        });
    });
  }

  terminateListenDeleteToken(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(this.deleteContractAddress, this.wallet)
        .then((deleteContract) => {
          deleteContract.removeAllListeners(DeleteEventToken);
          resolve();
        })
        .catch(reject);
    });
  }
}

export { EthereumManager };