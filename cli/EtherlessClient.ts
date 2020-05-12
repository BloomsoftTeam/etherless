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

  // TODO fare i controlli in tutte le funzioni perche'
  // ci siano gli elementi che utilizzano
  constructor(opts: EtherlessClientConfig) {
    this.tokenManager = opts.tokenManager;
    this.serverManager = opts.serverManager;
    this.ethereumManager = opts.ethereumManager;
  }

  linkWalletWithKey(privateKey: string): Wallet {
    return this.ethereumManager.getWalletFromPrivate(privateKey);
  }

  createNewWallet(): Wallet {
    return this.ethereumManager.generateNewWallet();
  }

  deployFunction(funcName: string, file: Buffer, config: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const spinner = ora('Starting deploy.').start();
      this.tokenManager.newToken().then((token) => {
        // log.info('[EtherlessClient]\tgenerated token');
        spinner.text = 'generated token';
        this.ethereumManager.deploy(token.proof, funcName)
          .then(() => {
            // log.info('[EtherlessClient]\twaiting operation token');
            spinner.text = 'waiting operation token';
            this.ethereumManager.listenOperationTokenDeployEvents(token.proof)
              .then((opToken) => {
                // log.info('[EtherlessClient]\treceived operation token, waiting server response');
                spinner.text = 'received operation token, waiting server response';
                this.ethereumManager.listenRequestUploadEvents(opToken)
                  .then(() => {
                    // log.info('[EtherlessClient]\tuploading function');
                    spinner.text = 'uploading function';
                    this.serverManager.deploy(file, config, funcName, token.token)
                      .then((result) => {
                        if (result.ok) {
                          spinner.succeed('deploy completed');
                          resolve();
                        } else {
                          spinner.fail('deploy failed');
                          reject(new Error(`[EtherlessClient]\tdeploy failed: ${result.error}`));
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
      this.serverManager.getFunctionsWith(_opt)
        .then(resolve)
        .catch(reject);
    });
  }

  runFunction(funcName: string, paramaters: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const spinner = ora('Starting run.').start();
      this.ethereumManager.sendRunRequest(funcName, paramaters)
        .then(() => {
          spinner.text = 'Run requeste sent.';
          // log.info('[EtherlessClient]\tRequest send.');
          this.ethereumManager.listenOperationTokenRunEvent(funcName)
            .then((opToken) => {
              // log.info('[EtherlessClient]\tReceived operation token.');
              spinner.text = 'Received operation token';
              this.ethereumManager.listenRunEvents(opToken)
                .then(() => {
                  spinner.succeed('Run completed');
                  resolve();
                })
                .catch(() => {
                  spinner.fail('Run failed');
                  reject();
                });
            })
            .catch(() => {
              spinner.fail('Run failed');
              reject();
            });
        })
        .catch(() => {
          spinner.fail('Run failed');
          reject();
        });
    });
  }

  deleteFunction(funcName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const spinner = ora('Starting delete.').start();
      this.ethereumManager.sendDeleteRequest(funcName)
        .then(() => {
          // log.info('[EtherlessClient]\trichiesta inviata');
        })
        .catch((err) => {
          spinner.fail('Failed delete.');
          this.ethereumManager.terminateListenDeleteToken()
            .then(() => {
              reject(err);
            })
            .catch(reject);
        });
      this.ethereumManager.listenOperationTokenDeleteEvent(funcName)
        .then((opToken) => {
          // log.info('[EtherlessClient]\tReceived token.');
          spinner.text = 'Received opeartion token.';
          this.ethereumManager.listenDeleteEvents(opToken)
            .then(() => {
              spinner.succeed('Delete succeed.');
              resolve();
            })
            .catch(() => {
              spinner.fail('Delete failed');
              reject();
            });
        })
        .catch(reject);
    });
  }

  searchFunction(query: string): Promise<string> {
    return this.serverManager.searchFunctionsWith(query);
  }
}

export { EtherlessClient };
