import { Wallet } from 'ethers';
import ora from 'ora';
import { EthereumManagerInterface } from './EthereumManager';
import { TokenManagerInterface } from './common/TokenManager';
import { ServerManagerInterface, RequestOptions } from './ServerManager';

export interface EtherlessClientInterface {
  linkWalletWithKey(privateKey: string): Wallet;
  createNewWallet(): Wallet;
  deployFunction(funcName: string, file: Buffer, config: Buffer): Promise<void>;
  listFunctionWith(_opt: RequestOptions): Promise<string>;
  runFunction(funcName: string, paramaters: string): Promise<string>;
  deleteFunction(funcName: string): Promise<void>;
  searchFunction(query: string): Promise<string>;
  checkEthereumManager(): boolean;
  checkTokenManager(): boolean;
  checkServerManager(): boolean;
}

export interface EtherlessClientConfig {
  serverManager?: ServerManagerInterface;
  tokenManager?: TokenManagerInterface;
  ethereumManager?: EthereumManagerInterface;
}

class EtherlessClient implements EtherlessClientInterface {
  private ethereumManager?: EthereumManagerInterface;

  private tokenManager?: TokenManagerInterface;

  private serverManager?: ServerManagerInterface;

  constructor(opts: EtherlessClientConfig) {
    this.tokenManager = opts.tokenManager;
    this.serverManager = opts.serverManager;
    this.ethereumManager = opts.ethereumManager;
  }

  checkEthereumManager(): boolean {
    return (this.ethereumManager !== undefined);
  }

  checkTokenManager(): boolean {
    return (this.tokenManager !== undefined);
  }

  checkServerManager(): boolean {
    return (this.serverManager !== undefined);
  }

  linkWalletWithKey(privateKey: string): Wallet {
    return this.ethereumManager.getWalletFromPrivate(privateKey);
  }

  createNewWallet(): Wallet {
    return this.ethereumManager.generateNewWallet();
  }

  deployFunction(funcName: string, file: Buffer, config: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!(this.checkTokenManager() && this.checkEthereumManager())) {
        reject(new Error('Missing EtherlessClient configuration'));
      }
      const spinner = ora('Starting deploy.').start();
      this.tokenManager.newToken().then((token) => {
        spinner.text = 'generated token';
        this.ethereumManager.listenOperationTokenDeployEvents(token.proof)
          .then((deployPromise) => {
            this.ethereumManager.deploy(token.proof, funcName)
              .then(() => {
                // non fa nulla
              })
              .catch(() => {
                deployPromise.terminate();
                spinner.fail('deploy failed');
                console.error('Unable to deploy function. You may not have enough ETH for this operation.');
                reject();
              });
            spinner.text = 'waiting operation token';
            deployPromise.promise
              .then((opToken) => {
                spinner.text = 'received operation token, waiting server response';
                this.ethereumManager.listenRequestUploadEvents(opToken)
                  .then(() => {
                    spinner.text = 'uploading function';
                    this.serverManager.deploy(file, config, funcName, token.token)
                      .then((result) => {
                        if (result.ok) {
                          spinner.succeed('deploy completed');
                          resolve();
                        } else {
                          spinner.fail('deploy failed');
                          console.error(`deploy failed: ${result.error}`);
                          reject();
                        }
                      }).catch(reject);
                  }).catch(reject);
              }).catch(reject);
          }).catch(reject);
      }).catch(reject);
    });
  }

  listFunctionWith(_opt: RequestOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!(this.checkServerManager())) {
        reject(new Error('Missing EtherlessClient configuration'));
      }
      this.serverManager.getFunctionsWith(_opt)
        .then(resolve)
        .catch(reject);
    });
  }

  runFunction(funcName: string, paramaters: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!(this.checkEthereumManager())) {
        reject(new Error('Missing EtherlessClient configuration'));
      }
      const spinner = ora('Starting run.').start();
      this.ethereumManager.listenOperationTokenRunEvent(funcName)
        .then((runPromise) => {
          this.ethereumManager.sendRunRequest(funcName, paramaters)
            .then(() => {
              // non fa nulla qui
            })
            .catch((err) => {
              runPromise.terminate();
              spinner.fail('Run failed');
              reject(new Error(`It may not exist or may not be available. ${err}`));
            });
          spinner.text = 'Run request sent.';
          runPromise.promise
            .then((opToken) => {
              spinner.text = 'Received operation token';
              this.ethereumManager.listenRunEvents(opToken)
                .then((res) => {
                  spinner.succeed('Run completed');
                  resolve(res);
                })
                .catch((err) => {
                  spinner.fail('Run failed');
                  reject(err);
                });
            })
            .catch((err) => {
              spinner.fail('Run failed');
              reject(err);
            });
        })
        .catch((err) => {
          spinner.fail(`${err}`);
          reject(new Error('Your wallet doesn\'t have sufficient founds for executing this command.'));
        });
    });
  }

  deleteFunction(funcName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!(this.checkEthereumManager())) {
        reject(new Error('Missing EtherlessClient configuration'));
      }
      const spinner = ora('Starting delete.').start();
      this.ethereumManager.listenOperationTokenDeleteEvent(funcName)
        .then((deletePromise) => {
          this.ethereumManager.sendDeleteRequest(funcName)
            .then(() => {
              // log.info('[EtherlessClient]\trichiesta inviata');
            })
            .catch((err) => {
              spinner.fail('Failed delete.');
              deletePromise.terminate();
              reject(err);
            });
          deletePromise.promise
            .then((opToken) => {
              // log.info('[EtherlessClient]\tReceived token.');
              spinner.text = 'Received opeartion token.';
              this.ethereumManager.listenDeleteEvents(opToken)
                .then(() => {
                  spinner.succeed('Delete succeed.');
                  resolve();
                })
                .catch((err) => {
                  spinner.fail('Delete failed');
                  reject(err);
                });
            })
            .catch(reject);
        })
        .catch(reject);
    });
  }

  searchFunction(query: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!(this.checkServerManager())) {
        reject(new Error('Missing EtherlessClient configuration'));
      }
      this.serverManager.searchFunctionsWith(query)
        .then((result) => {
          resolve(result);
        })
        .catch(reject);
    });
  }
}

export { EtherlessClient };
