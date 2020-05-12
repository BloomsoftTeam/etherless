import yargs from 'yargs';
import dotenv from 'dotenv';
import { InfuraProvider } from 'ethers/providers';
import fs from 'fs';
import path from 'path';
import prompt from 'prompt';
import log from './common/Logger';
import EthersHelper from './common/EthersHelper';
import TokenManager from './common/TokenManager';
import { ServerManager } from './ServerManager';
import { EthereumManager } from './EthereumManager';
import KeyManager from './KeyManager';
import { EtherlessClient } from './EtherlessClient';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const {
  SERVER_EDGE,
  API_EDGE,
  ETHERSCAN_API_KEY,
} = process.env;

interface ClientOption {
  smart?: boolean;
  server?: boolean;
  token?: boolean;
}

// non dite a Cardin che questa e' un'abstractFactory
function buildClient(opts: ClientOption): EtherlessClient {
  let ethereumManager: EthereumManager;
  let serverManager: ServerManager;
  let tokenManager: TokenManager;
  if (opts.smart) {
    const infura = new InfuraProvider('ropsten', process.env.INFURA_PROJECT_ID);
    const ethersHelper = new EthersHelper(infura, ETHERSCAN_API_KEY);
    ethereumManager = new EthereumManager(ethersHelper);
  }
  if (opts.server) {
    serverManager = new ServerManager(SERVER_EDGE, API_EDGE);
  }

  if (opts.token) {
    tokenManager = new TokenManager();
  }

  return new EtherlessClient({
    ethereumManager,
    serverManager,
    tokenManager,
  });
}

function printResult(result: any) {
  if (result.message === 'Internal server error') {
    log.info('Function not found');
    return;
  }
  result.forEach((item) => {
    log.info(`Name: ${item.funcName}`);
    log.info(`Desc: ${item.description}`);
    log.info(`Price: ${item.price}`);
    log.info(`Params: ${item.params}`);
    log.info(`Usage: ${item.usage}\n`);
  });
}

function insertPassword(): Promise<string> {
  return new Promise((resolve, reject) => {
    const passwordSchema = {
      properties: {
        password: {
          hidden: true,
          message: 'Password must contain at least 8 characters, only letters and numbers, for a maximum of 16 characters',
          pattern: '^.{8,16}$',
        },
        passwordRepeat: {
          hidden: true,
          pattern: '^.{8,16}$',
        },
      },
    };
    log.info('Insert a new password for your Etherless account, and confirm again your password.');
    prompt.start();
    prompt.get(passwordSchema, (err, result) => {
      if (result.password !== result.passwordRepeat) {
        log.info('Mismatch between password and his repetition.');
        reject();
        prompt.stop();
        return;
      }
      log.info('Password created successfully.');
      prompt.stop();
      resolve(result.password);
    });
  });
}

function askPassword(): Promise<string> {
  return new Promise((resolve, reject) => {
    const passwordSchema = {
      properties: {
        password: {
          hidden: true,
          message: 'Password must contain at least 8 characters, only letters and numbers, for a maximum of 16 characters.',
          pattern: '^.{8,16}$',
        },
      },
    };
    log.info('Enter the password for your Etherless account.');
    prompt.start();
    prompt.get(passwordSchema, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result.password);
    });
  });
}

function initOrCreateWallet() {
  log.info('Do you want to link an existing ETH wallet or create a new one? [link/create] ');
  prompt.get((['answer']), (err1, result1) => {
    const client = buildClient(<ClientOption> { smart: true });
    let wallet = null;
    switch (result1.answer.toLowerCase()) {
      case 'c':
      case 'create':
        wallet = client.createNewWallet();
        insertPassword()
          .then((password) => {
            const keyManager = new KeyManager(password);
            keyManager.saveCredentials(wallet.privateKey, wallet.address)
              .then(() => {
                log.info('A new ethereum wallet is now ready for you!');
                log.info('Take notes of your newly generated mnemonic and private key so that you can recover your credentials in the future.');
                log.info(`Private key: ${wallet.privateKey}`);
                log.info(`Mnemonic: ${wallet.mnemonic}`);
                log.info(`Wallet address: ${wallet.address}`);
                prompt.stop();
              })
              .catch(() => {
                log.error('Cannot save credentials.');
              });
          })
          .catch(() => {
            log.error('Password doesn\'t match required schema:\n-At least 8 characters and a maximum of 16.');
          });
        break;
      case 'l':
      case 'link':
        log.info('Insert your eth wallet private key:');
        prompt.get((['key']), (err2, result2) => {
          wallet = client.linkWalletWithKey(result2.key);
          if (wallet) {
            insertPassword()
              .then((password) => {
                const keyManager = new KeyManager(password);
                keyManager.saveCredentials(wallet.privateKey, wallet.address)
                  .then(() => {
                    log.info(`[cli] Wallet address: ${wallet.address}`);
                    log.info('[cli] credentials associated with success.');
                    prompt.stop();
                  }).catch((err3) => {
                    prompt.stop();
                    log.error(err3);
                  });
              })
              .catch(() => {
                log.error('Password doesn\'t match required schema:\n-At least 8 characters and a maximum of 16.');
                prompt.stop();
              });
          } else {
            log.error('Error in the association between your private key and the wallet (maybe you inserted a wrong private key?)');
            prompt.stop();
          }
        });
        break;
      default:
        log.info('Invalid answer.');
        prompt.stop();
        break;
    }
  });
}

// dipende solo da Key e Ethereum (e ethers)
function initFunction() {
  const keyManager = new KeyManager();
  keyManager.checkCredentialsExistance()
    .then(() => {
      log.info('You already have an associated wallet. Do you want to procede anyway? [y/n]');
      prompt.start();
      prompt.get(['answer'], (err, result) => {
        log.info(result.answer);
        switch (result.answer.toLowerCase()) {
          case 'y':
            initOrCreateWallet();
            break;
          case 'n':
            log.info('Operation interrupted with success.');
            prompt.stop();
            break;
          default:
            log.info('Error: invalid answer.');
            prompt.stop();
            break;
        }
      });
    })
    .catch((err) => {
      if (!err) {
        initOrCreateWallet();
      }
    });
}

// dipende solo da Key e Ethereum (e ethers), Server e Token
function deployFunction(argv) {
  let keyManager = new KeyManager();

  keyManager.checkCredentialsExistance()
    .then(() => {
      askPassword()
        .then((password) => {
          const client = buildClient(<ClientOption> { smart: true, server: true, token: true });
          keyManager = new KeyManager(password);

          const funcName = argv._[1];
          keyManager.loadCredentials()
            .then((key) => {
              const wallet = client.linkWalletWithKey(key);
              log.info(`Getting wallet from credentials: ${wallet.address}`);
              const zipFile = fs.readFileSync(`${funcName}.zip`);
              const funcData = JSON.parse((fs.readFileSync(`${funcName}.json`)).toString());
              funcData.owner = wallet.address;
              client.deployFunction(funcName, zipFile, Buffer.from(JSON.stringify(funcData)))
                .then(() => {
                  log.info('The function was successfully uploaded to the platform and is now available to be executed.');
                })
                .catch(log.error);
            })
            .catch(log.error);
        })
        .catch(log.error);
    })
    .catch(() => {
      log.info('To access the deploy service you need to associate a payment method.');
    });
}

function logout() {
  const keyManager = new KeyManager();
  keyManager.removeCredentials()
    .then(() => {
      log.info('You have successfully removed the previously associated payment method.');
    })
    .catch((err) => {
      log.info(`Cannot remove credentials: ${err}`);
    });
}

// dipende solo da Key e Ethereum (e ethers), Server e Token
function runFunction(argv) {
  let keyManager = new KeyManager();

  keyManager.checkCredentialsExistance()
    .then(() => {
      askPassword()
        .then((password) => {
          const client = buildClient(<ClientOption> { smart: true, server: true, token: true });
          keyManager = new KeyManager(password);

          const paramsArr = argv._.filter((value, index) => index > 1);

          const paramsJson = {
            params: [],
          };

          paramsArr.forEach((element) => {
            paramsJson.params.push(element);
          });

          const funcName = argv._[1];

          keyManager.loadCredentials()
            .then((key) => {
              const wallet = client.linkWalletWithKey(key);
              log.info(`Getting wallet from credentials: ${wallet.address}`);
              client.runFunction(funcName, JSON.stringify(paramsJson)) // TODO: wallet vuoto
                .then((jsonresult: any) => {
                  const result = JSON.parse(jsonresult);
                  log.info(`Result: ${result.result}`);
                  log.info(`Execution time: ${result.duration} s`);
                  log.info(`Price: ${result.price} Wei`);
                })
                .catch(() => {
                  log.info('Cannot run function. It may not exist or may not be available.');
                });
            })
            .catch(() => {
              log.info('Could not load your payment method because you didn\'t associate one yet.');
            });
        })
        .catch(() => {});
    })
    .catch(() => {
      log.info('To access the run service you need to associate a payment method.');
    });
}

function listFunction(argv) {
  const client = buildClient(<ClientOption> { smart: true, server: true });

  const opt = { hidden: false, own: null };

  if (argv.own) {
    const keyManager = new KeyManager('password');
    keyManager.loadPublicKey()
      .then((key) => {
        opt.own = key;
        client.listFunctionWith(opt)
          .then((res: any) => {
            printResult(res);
          }).catch(() => {
            log.error('Can\'t retrieve data from database. Check your connection and try again (if problem doesn\'t solve, please contact us).');
          });
      })
      .catch(() => {
        log.error('Cannot find your functions cause you didn\'t associated a payment method into etherless.');
      });
  } else {
    opt.hidden = (argv.hidden !== undefined);

    client.listFunctionWith(opt)
      .then((res: any) => {
        printResult(res);
      }).catch((err) => {
        log.error(err);
      });
  }
}

function searchFunction(argv) {
  const client = buildClient(<ClientOption> { smart: true, server: true });

  const keywords = argv._[1];

  client.searchFunction(keywords) // devo utilizzare unavailable = true (list)
    .then((res: any) => {
      printResult(res);
    }).catch((err) => {
      log.error(err);
    });
}

function deleteFunction(argv) {
  let keyManager = new KeyManager();

  keyManager.checkCredentialsExistance()
    .then(() => {
      askPassword()
        .then((password) => {
          const client = buildClient(<ClientOption> { smart: true, server: true });

          const funcName = argv._[1];
          keyManager = new KeyManager(password);
          keyManager.loadCredentials()
            .then((key) => {
              const wallet = client.linkWalletWithKey(key);
              log.info(`Getting wallet from credentials: ${wallet.address}`);
              client.deleteFunction(funcName)
                .then(() => {
                  // viene restituito null sia che venga eliminata che non
                  log.info(`You have successfully removed the function ${funcName} from the platform.`);
                })
                .catch(() => {
                  log.info('This function may not exist or you are not allowed delete this function.');
                  process.exit(0);
                });
            })
            .catch((err) => {
              // errore della chiave
              log.error(err);
            });
        })
        .catch(log.error);
    })
    .catch(() => {
      log.info('To access the delete service you need to associate a payment method.');
    });
}

function helpFunction(argv) {
  if (argv.command) {
    switch (argv.command) {
      case 'init': {
        log.info('usage: etherless init');
        log.info('Allows the user to associate a payment method to the platform by eithercreating a new ETH wallet or associating an existing one. The wallet will let the user access all paid services.');
        break;
      }
      case 'list': {
        log.info('usage: etherless list [--own | -o] [--hidden | -h]');
        log.info('Lists all available functions available in the platform with their respective description, usage and price.\n --own, -o list all functions owned by the user\n --hidden, -h list all unavailable functions on the platform.');
        break;
      }
      case 'deploy': {
        log.info('usage: etherless deploy <funcName');
        log.info('Allows the developer to deploy a function to the platform with its source code and a configuration file for the meta data.\nYou need a <funcName.zip> and a <funcName.json> in the same directory you are invoking the command to make it work correctly.');
        break;
      }
      case 'run': {
        log.info('usage: etherless run <funcName> <args>');
        log.info('Allows the user to execute a function available on the platform specifying all needed parameters.');
        break;
      }
      case 'search': {
        log.info('usage: etherless search <keyword>');
        log.info('Lists all available functions on the platform matching the keyword specified with the description of the functions.');
        break;
      }
      case 'delete': {
        log.info('usage: etherless delete <funcName>');
        log.info('Allows the developer to delete a function available on the platform.');
        break;
      }
      case 'logout': {
        log.info('usage: etherless logout');
        log.info('Allows the user to remove the previously associated payment method.');
        break;
      }
      case 'createConfig': {
        log.info('usage: etherless createConfig');
        log.info('Creates a JSON file in Download folder with empty parameters to configure the deploy of a function:\n funcName: the name of the function\n description: the description of the function\n timeout: the maximum execution time of the function\n owner: the address of the developer\n fee: the amount of money earned for every successful execution\n path: the relative path in which the function will be run.');
        break;
      }
      default: {
        log.info('Command not found.');
        break;
      }
    }
  } else if (argv.faq) {
    log.info('These are the Frequently Asked Questions fromt the community of the platform: \n - Question 1? \n - Answer 1. \n - Question 2? \n - Answer 2. \n If you still have some concerns, please get in touch with us at bloomsoft@gmail.com');
  } else if (argv.about_us) {
    log.info('We are Bloomsoft, a team of young students from Italy. We started working on Ertherless in 2019 as an academic project and then we sold it for a millionaire exit, so if you need some support sorry, but we’re on holiday on the Caribbean for the rest of our life!');
  } else {
    log.info('Usage: etherless <command> [--option | -op] [<args>]');
    log.info('\n');
    log.info('Commands:');
    log.info('init allows the user associate a payment method by either creating a new ETH wallet or associating an existing one.');
    log.info('list lists all available functions on the platform that can be executed from the user.');
    log.info('deploy allows the developer deploy a function to the platform.');
    log.info('run allows the user execute a function available in the platform.');
    log.info('search allows the user search for a specific function based on a specified keyword.');
    log.info('delete allows the developer delete one of its function available in the platform.');
    log.info('logout allows the user delete the previously associated payment method.');
    log.info('createConfig create a configuration file needed to deploy a function to the platform.');
    log.info('’etherless get_help --command’ and ’etherless get_help -c’ show an accurate description for the selected command.');
  }
}


function createConfigFunction() {
  const obj: any = {};
  obj.funcName = 'Function Name';
  obj.description = 'Describe what your function does';
  obj.timeout = 'Specify a maximum time period (in seconds) for your function to run (lower timeouts result in a cheaper pre-addebit for the user)';
  obj.owner = 'Ethereum wallet address of the developer of the function (0x123456789)';
  obj.fee = 'specifiy the fee you want to execute your function in wei (1 ETH = 1_000_000_000_000_000_000 wei)';
  obj.indexPath = 'specifiy the path of your index.js starting from the folder path (i.e. folderName/index.js)';
  obj.usage = 'specify an example for calling this function';
  obj.params = "specify number and type (in the right order) of your function's params";

  try {
    fs.writeFileSync('funcData.json', JSON.stringify(obj));
  } catch (err) {
    log.error(err);
    return;
  }
  log.info('File created!');
}

const listOptions = (ya) => ya
  .option('o', {
    alias: 'own',
    describe: 'list all functions uploaded by the user.',
    nargs: 0,
  })
  .option('h', {
    alias: 'hidden',
    describe: 'list all functions currently unavailable.',
    nargs: 0,
  });

const helpOptions = (ya) => ya
  .option('FAQ', {
    alias: 'f',
    describe: 'display Frequently Asked Questions about Etherless.',
    nargs: 0,
  })
  .option('c', {
    alias: 'command',
    describe: 'display help about a specific Etherless command.',
    type: 'string',
    nargs: 1,
  })
  .option('a', {
    alias: 'about_us',
    describe: 'display administrators email for requesting information/help.',
    nargs: 0,
  });

const verifyArguments = (argv) => {
  const commandName = argv._[0];

  switch (commandName) {
    case 'init':
      if (argv._.length !== 1) throw (new Error('Argument check failed: too much arguments for command init.'));
      break;
    case 'logout':
      if (argv._.length !== 1) throw (new Error('Argument check failed: too much arguments for command logout.'));
      break;
    case 'run':
      if (argv._.length < 2) throw (new Error('Argument check failed: too few arguments for command run.'));
      break;
    case 'list': {
      if (argv._.length !== 1) throw (new Error('Argument check failed: too much arguments for command list.'));
      if (argv.r && (argv.o || argv.h)) throw (new Error('Argument check failed: no more than one parameter can be specified for the list command.'));
      if (argv.o && (argv.r || argv.h)) throw (new Error('Argument check failed: no more than one parameter can be specified for the list command.'));
      if (argv.h && (argv.o || argv.r)) throw (new Error('Argument check failed: no more than one parameter can be specified for the list command.'));
      break;
    }
    case 'deploy':
      if (argv._.length !== 2) throw (new Error('Argument check failed: wrong number of arguments for command deploy (only funcName is required).'));
      break;
    case 'delete':
      if (argv._.length !== 2) throw (new Error('Argument check failed: wrong number of arguments for command delete.'));
      break;
    case 'search':
      if (argv._.length !== 2) throw (new Error('Argument check failed: wrong number of arguments for command search.'));
      break;
    case 'get_help': {
      if (argv._.length !== 1) throw (new Error('Argument check failed: too much arguments for command get_help.'));
      if (argv.f && (argv.c || argv.a)) throw (new Error('Argument check failed: no more than one parameter can be specified for the get_help command.'));
      if (argv.c && (argv.f || argv.a)) throw (new Error('Argument check failed: no more than one parameter can be specified for the get_help command.'));
      if (argv.a && (argv.c || argv.f)) throw (new Error('Argument check failed: no more than one parameter can be specified for the get_help command.'));
      break;
    }
    case 'createConfig':
      if (argv._.length !== 1) throw (new Error('Argument check failed: too much arguments for command createConfig.'));
      break;
    default:
      throw new Error('Argument check failed: command not found.');
  }
  return true;
};

yargs
  .command('init', 'init?!', () => {}, initFunction)
  .command('logout', 'init?!', () => {}, logout)
  .command('run', 'init?!', () => {}, runFunction)
  .command('list', 'init?!', listOptions, listFunction)
  .command('deploy', 'init?!', () => {}, deployFunction)
  .command('delete', 'init?!', () => {}, deleteFunction)
  .command('search', 'init?!', () => {}, searchFunction)
  .command('get_help', 'init?!', helpOptions, helpFunction)
  .command('createConfig', 'init?!', () => {}, createConfigFunction)
  .help('why')
  .check(verifyArguments)
  .parse();

/* idea
 *
  .command('getWallet', 'init?!', () => {}, () => {
    const keyManager = new KeyManager('password');
    const client = buildClient(
      ClientOption.Smart
    );
    keyManager.loadCredentials()
      .then((key) => {
        const wallet = client.linkWalletWithKey(key);
        log.info(`Getting wallet from credentials: ${wallet.address}`);
      })
      .catch(log.info);
  })

 */
