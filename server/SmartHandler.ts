import { Wallet } from 'ethers';
import log from './common/Logger';
import EthersHelper from './common/EthersHelper';

const DEPLOY_EVENT = 'uploadToken';
const RUN_EVENT = 'runRequest';
const DELETE_EVENT = 'deleteRequest';

class SmartHandler {
  private readonly ethersHelper: EthersHelper;

  private readonly wallet: Wallet;

  constructor(
    ethersHelper: EthersHelper,
    privateKey: string,
  ) {
    this.ethersHelper = ethersHelper;
    this.wallet = this.ethersHelper.getWalletFromPrivate(privateKey);
  }

  listenTokenRequests(callback:
  (proof: string, opToken: string, devAddress: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(process.env.DEPLOY_CONTRACT_ADDRESS, this.wallet)
        .then((deployContract) => {
          deployContract
            .on(DEPLOY_EVENT, (proof: string, operationToken: string, event) => {
              event.getTransaction()
                .then((tx) => {
                  callback(proof, operationToken, tx.from);
                })
                .catch(reject);
            });
          resolve();
        })
        .catch(reject);
    });
  }


  sendRequestUpload(operationToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(process.env.DEPLOY_CONTRACT_ADDRESS, this.wallet)
        .then((deployContract) => {
          log.info('[SmartHandler]\tinviata request upload');
          deployContract.sendRequestUpload(operationToken)
            .then(resolve)
            .catch(reject);
        })
        .catch(reject);
    });
  }

  terminateDeploy(funcName: string, devAddress: string, funcPrice: number, opToken: string) {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(process.env.DEPLOY_CONTRACT_ADDRESS, this.wallet)
        .then((deployContract) => {
          deployContract
            .terminateDeploy(funcName, devAddress, funcPrice, opToken)
            .then(resolve)
            .catch(reject);
        })
        .catch(reject);
    });
  }

  refundDeploy(funcName: string, opToken: string) {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(process.env.DEPLOY_CONTRACT_ADDRESS, this.wallet)
        .then((deployContract) => {
          deployContract
            .refundDeploy(funcName, opToken)
            .then(resolve)
            .catch(reject);
        })
        .catch(reject);
    });
  }

  listenRunRequest(callback: (opToken: string,
    funcName: string,
    params: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(process.env.RUN_CONTRACT_ADDRESS, this.wallet)
        .then((runContract) => {
          runContract
            .on(RUN_EVENT, callback);
          resolve();
        })
        .catch(reject);
    });
  }

  sendRunResult(funcResult: string,
    funcPrice: number,
    funcCommission: number,
    funcOwner: string,
    opToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(process.env.RUN_CONTRACT_ADDRESS, this.wallet)
        .then((runContract) => {
          log.info('[SmartHandler]\tsending results');
          runContract.sendRunResult(
            funcResult,
            funcPrice,
            funcCommission,
            funcOwner,
            opToken,
            { gasLimit: 900000 },
          ).then((transaction) => {
            transaction.wait()
              .then(() => {
                resolve();
              })
              .catch((err) => {
                reject(err);
              });
          })
            .catch(reject);
        })
        .catch(reject);
    });
  }

  sendRunFailure(funcName: string, opToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(process.env.RUN_CONTRACT_ADDRESS, this.wallet)
        .then((runContract) => {
          log.info('[SmartHandler]\tinviata run failed');
          runContract.sendRunFailure(funcName, opToken);
          resolve();
        })
        .catch(reject);
    });
  }

  listenDeleteRequest(callback: (opToken: string,
    funcName: string,
    devAddress: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(process.env.DELETE_CONTRACT_ADDRESS, this.wallet)
        .then((deleteContract) => {
          deleteContract
            .on(DELETE_EVENT, (a, b, event) => {
              event.getTransaction()
                .then((t) => {
                  callback(a, b, t.from);
                })
                .catch(log.error);
            });
          resolve();
        })
        .catch(reject);
    });
  }

  sendDeleteSuccess(operationToken: string, funcName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(process.env.DELETE_CONTRACT_ADDRESS, this.wallet)
        .then((deleteContract) => {
          log.info('[SmartHandler]\tinviata delete success');
          deleteContract.sendDeleteSuccess(operationToken, funcName);
          resolve();
        })
        .catch(reject);
    });
  }

  sendDeleteFailed(operationToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ethersHelper.loadSmartContract(process.env.DELETE_CONTRACT_ADDRESS, this.wallet)
        .then((deleteContract) => {
          log.info('[SmartHandler]\tinviata delete failed');
          deleteContract.sendDeleteFailure(operationToken);
          resolve();
        })
        .catch(reject);
    });
  }
}

export { SmartHandler as default };
