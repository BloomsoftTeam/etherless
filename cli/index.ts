import yargs from 'yargs';
import dotenv from 'dotenv';
import { InfuraProvider } from 'ethers/providers';
import fs from 'fs';
import path from 'path';
import prompt from 'prompt';
import chalk from 'chalk';
import boxen from 'boxen';
import EthersHelper from './common/EthersHelper';
import TokenManager from './common/TokenManager';
import { ServerManager } from './ServerManager';
import { EthereumManager, ContractAddressesInterface } from './EthereumManager';
import KeyManager from './KeyManager';
import { EtherlessClient } from './EtherlessClient';


dotenv.config({ path: path.resolve(__dirname, '.env') });

const {
  SERVER_EDGE,
  API_EDGE,
  ETHERSCAN_API_KEY,
  STORAGE_CONTRACT_ADDRESS,
  DEPLOY_CONTRACT_ADDRESS,
  RUN_CONTRACT_ADDRESS,
  DELETE_CONTRACT_ADDRESS,
} = process.env;

interface ClientOption {
  smart?: boolean;
  server?: boolean;
  token?: boolean;
}

function buildClient(opts: ClientOption): EtherlessClient {
  let ethereumManager: EthereumManager;
  let serverManager: ServerManager;
  let tokenManager: TokenManager;
  const contracts: ContractAddressesInterface = {
    deploy: DEPLOY_CONTRACT_ADDRESS,
    run: RUN_CONTRACT_ADDRESS,
    remove: DELETE_CONTRACT_ADDRESS,
    storage: STORAGE_CONTRACT_ADDRESS,
  };
  if (opts.smart) {
    const infura = new InfuraProvider('ropsten', process.env.INFURA_PROJECT_ID);
    const ethersHelper = new EthersHelper(infura, ETHERSCAN_API_KEY);
    ethereumManager = new EthereumManager(ethersHelper, contracts);
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
    console.log(chalk.red.bold('Function not found'));
    return;
  }
  result.forEach((item) => {
    console.log(chalk.hex('#0000ff').bold(`Name:`) + chalk.hex('#00ffff').bold(`${item.funcName}`));
    console.log(chalk.hex('#0000ff').bold(`Desc:`) + `${item.description}`);
    console.log(chalk.hex('#0000ff').bold(`Price:`) + `${item.price}`);
    console.log(chalk.hex('#0000ff').bold(`Params:`) + `${item.params}`);
    console.log(chalk.hex('#0000ff').bold(`Usage:`) + `${item.usage}\n`);
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
    console.log('Insert a new password for your Etherless account, and confirm again your password.');
    prompt.start();
    prompt.get(passwordSchema, (err, result) => {
      if (result.password !== result.passwordRepeat) {
        console.log(chalk.red.bold('Mismatch between password and his repetition.'));
        reject();
        prompt.stop();
        return;
      }
      console.log(chalk.green.bold('Password created successfully.'));
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
    console.log('Enter the password for your Etherless account.');
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
  const boxenOptions = {
    padding: 1,
    margin: 1,
    borderColor: '#90ee90',
    // backgroundColor: '#555555',
  };
  const msgInit = chalk.hex('#ffb6c1').bold('Welcome to Etherless! Lets you associate an ETH wallet to Etherless!');
  const msgBoxInit = boxen(msgInit, boxenOptions);
  console.log(msgBoxInit);

  console.log('Do you want to link an existing ETH wallet or create a new one? [link/create] ');
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
                console.log(chalk.green.bold('A new ethereum wallet is now ready for you!'));
                console.log('Take notes of your newly generated mnemonic and private key so that you can recover your credentials in the future.');
                console.log(`Private key: ${wallet.privateKey}`);
                console.log(`Mnemonic: ${wallet.mnemonic}`);
                console.log(`Wallet address: ${wallet.address}`);
                prompt.stop();
              })
              .catch(() => {
                console.error(chalk.red.bold('Cannot save credentials.'));
              });
          })
          .catch(() => {
            console.error(chalk.red.bold('Password doesn\'t match required schema:\n-At least 8 characters and a maximum of 16.'));
          });
        break;
      case 'l':
      case 'link':
        console.log('Insert your eth wallet private key:');
        prompt.get((['key']), (err2, result2) => {
          wallet = client.linkWalletWithKey(result2.key);
          if (wallet) {
            insertPassword()
              .then((password) => {
                const keyManager = new KeyManager(password);
                keyManager.saveCredentials(wallet.privateKey, wallet.address)
                  .then(() => {
                    console.log(chalk.green.bold(`[cli] Wallet address: ${wallet.address}`));
                    console.log(chalk.green.bold('[cli] credentials associated with success.'));
                    prompt.stop();
                  }).catch((err3) => {
                    prompt.stop();
                    console.error(chalk.red.bold(err3));
                  });
              })
              .catch(() => {
                console.error(chalk.red.bold('Password doesn\'t match required schema:\n-At least 8 characters and a maximum of 16.'));
                prompt.stop();
              });
          } else {
            console.error(chalk.red.bold('Error in the association between your private key and the wallet (maybe you inserted a wrong private key?)'));
            prompt.stop();
          }
        });
        break;
      default:
        console.log(chalk.red.bold('Invalid answer.'));
        prompt.stop();
        break;
    }
  });
}

function initFunction() {
  const keyManager = new KeyManager();
  keyManager.checkCredentialsExistance()
    .then(() => {
      console.log('You already have an associated wallet. Do you want to procede anyway? [y/n]');
      prompt.start();
      prompt.get(['answer'], (err, result) => {
        console.log(result.answer);
        switch (result.answer.toLowerCase()) {
          case 'y':
            initOrCreateWallet();
            break;
          case 'n':
            console.log('Operation interrupted with success.');
            prompt.stop();
            break;
          default:
            console.log(chalk.red.bold('Error: invalid answer.'));
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

function deployFunction(argv) {
  let keyManager = new KeyManager();

  keyManager.checkCredentialsExistance()
    .then(() => {
      // check controllo se ha soldi
      askPassword()
        .then((password) => {
          const client = buildClient(<ClientOption> { smart: true, server: true, token: true });
          keyManager = new KeyManager(password);

          const funcName = argv._[1];
          keyManager.loadCredentials()
            .then((key) => {
              const wallet = client.linkWalletWithKey(key);
              console.log(`Getting wallet from credentials: ${wallet.address}`);
              const zipFile = fs.readFileSync(`${funcName}.zip`);
              const funcData = JSON.parse((fs.readFileSync(`${funcName}.json`)).toString());
              funcData.owner = wallet.address;
              client.deployFunction(funcName, zipFile, Buffer.from(JSON.stringify(funcData)))
                .then(() => {
                  console.log(chalk.green.bold('The function was successfully uploaded to the platform and is now available to be executed.'));
                })
                .catch(console.error);
            })
            .catch((err) => { console.error(`Cannot load your credentials. ${err}`); });
        })
        .catch(console.error);
    })
    .catch(() => {
      console.log(chalk.red.bold('To access the deploy service you need to associate a payment method.'));
    });
}

function logout() {
  const keyManager = new KeyManager();
  keyManager.removeCredentials()
    .then(() => {
      const boxenOptions = {
        padding: 1,
        margin: 1,
        borderColor: 'red',
        // backgroundColor: '#555555',
      };
      const msgLogout = chalk.hex('#ffd700').bold('You have successfully removed the previously associated payment method.');
      const msgBoxLogout = boxen(msgLogout, boxenOptions);
      console.log(msgBoxLogout);
    })
    .catch((err) => {
      console.log(chalk.red.bold(`Cannot remove credentials: ${err}`));
    });
}

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
              console.log(`Getting wallet from credentials: ${wallet.address}`);
              client.runFunction(funcName, JSON.stringify(paramsJson))
                .then((jsonresult: any) => {
                  try {
                    const result = JSON.parse(jsonresult);
                    console.log(chalk.green.bold(`Result: ${result.result}`));
                    console.log(`Execution time: ${result.duration} ms`);
                    console.log(`Price: ${result.price} Wei`);
                  } catch (err) {
                    console.log(chalk.red.bold('Function error. The function has been marked as hidden.'));
                  }
                })
                .catch((err) => {
                  console.log(chalk.red.bold(`Cannot run function. ${err}`));
                });
            })
            .catch(() => {
              console.log(chalk.red.bold('Could not load your payment method because you didn\'t associate one yet.'));
            });
        })
        .catch(() => {});
    })
    .catch(() => {
      console.log(chalk.red.bold('To access the run service you need to associate a payment method.'));
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
            console.error(chalk.red.bold('Can\'t retrieve data from database. Check your connection and try again (if problem doesn\'t solve, please contact us).'));
          });
      })
      .catch(() => {
        console.error(chalk.red.bold('Cannot find your functions cause you didn\'t associated a payment method into etherless.'));
      });
  } else {
    opt.hidden = (argv.hidden !== undefined);

    client.listFunctionWith(opt)
      .then((res: any) => {
        printResult(res);
      }).catch(() => {
        console.error(chalk.red.bold('Can\'t retrieve data from database. Check your connection and try again (if problem doesn\'t solve, please contact us).'));
      });
  }
}

function searchFunction(argv) {
  const client = buildClient(<ClientOption> { smart: true, server: true });

  const keywords = argv._[1];

  client.searchFunction(keywords)
    .then((res: any) => {
      printResult(res);
    }).catch(() => {
      console.error(chalk.red.bold('Can\'t retrieve data from database. Check your connection and try again (if problem doesn\'t solve, please contact us).'));
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
              console.log(`Getting wallet from credentials: ${wallet.address}`);
              client.deleteFunction(funcName)
                .then(() => {
                  // viene restituito null sia che venga eliminata che non
                  console.log(chalk.green.bold(`You have successfully removed the function ${funcName} from the platform.`));
                })
                .catch(() => {
                  console.log(chalk.red.bold('This function may not exist or you are not allowed delete this function.'));
                  process.exit(0);
                });
            })
            .catch((err) => {
              // errore della chiave
              console.error(err);
            });
        })
        .catch(console.error);
    })
    .catch(() => {
      console.log(chalk.red.bold('To access the delete service you need to associate a payment method.'));
    });
}

function helpFunction(argv) {
  if (argv.command) {
    switch (argv.command) {
      case 'init': {
        console.log('usage: etherless init');
        console.log('Allows the user to associate a payment method to the platform by eithercreating a new ETH wallet or associating an existing one. The wallet will let the user access all paid services.');
        break;
      }
      case 'list': {
        console.log('usage: etherless list [--own | -o] [--hidden | -h]');
        console.log('Lists all available functions available in the platform with their respective description, usage and price.\n --own, -o list all functions owned by the user\n --hidden, -h list all unavailable functions on the platform.');
        break;
      }
      case 'deploy': {
        console.log('usage: etherless deploy <funcName');
        console.log('Allows the developer to deploy a function to the platform with its source code and a configuration file for the meta data.\nYou need a <funcName.zip> and a <funcName.json> in the same directory you are invoking the command to make it work correctly.');
        break;
      }
      case 'run': {
        console.log('usage: etherless run <funcName> <args>');
        console.log('Allows the user to execute a function available on the platform specifying all needed parameters.');
        break;
      }
      case 'search': {
        console.log('usage: etherless search <keyword>');
        console.log('Lists all available functions on the platform matching the keyword specified with the description of the functions.');
        break;
      }
      case 'delete': {
        console.log('usage: etherless delete <funcName>');
        console.log('Allows the developer to delete a function available on the platform.');
        break;
      }
      case 'logout': {
        console.log('usage: etherless logout');
        console.log('Allows the user to remove the previously associated payment method.');
        break;
      }
      case 'createConfig': {
        console.log('usage: etherless createConfig');
        console.log('Creates a JSON file in Download folder with empty parameters to configure the deploy of a function:\n funcName: the name of the function\n description: the description of the function\n timeout: the maximum execution time of the function\n owner: the address of the developer\n fee: the amount of money earned for every successful execution\n path: the relative path in which the function will be run.');
        break;
      }
      default: {
        console.log(chalk.red.bold('Command not found.'));
        break;
      }
    }
  } else if (argv.faq) {
    console.log('These are the Frequently Asked Questions fromt the community of the platform: \n - Question 1? \n - Answer 1. \n - Question 2? \n - Answer 2. \n If you still have some concerns, please get in touch with us at bloomsoft@gmail.com');
  } else if (argv.about_us) {
    console.log('We are Bloomsoft, a team of young students from Italy. We started working on Ertherless in 2019 as an academic project and then we sold it for a millionaire exit, so if you need some support sorry, but we’re on holiday on the Caribbean for the rest of our life!');
  } else {
    console.log('Usage: etherless <command> [--option | -op] [<args>]');
    console.log('\n');
    console.log('Commands:');
    console.log('init allows the user associate a payment method by either creating a new ETH wallet or associating an existing one.');
    console.log('list lists all available functions on the platform that can be executed from the user.');
    console.log('deploy allows the developer deploy a function to the platform.');
    console.log('run allows the user execute a function available in the platform.');
    console.log('search allows the user search for a specific function based on a specified keyword.');
    console.log('delete allows the developer delete one of its function available in the platform.');
    console.log('logout allows the user delete the previously associated payment method.');
    console.log('createConfig create a configuration file needed to deploy a function to the platform.');
    console.log('’etherless get_help --command’ and ’etherless get_help -c’ show an accurate description for the selected command.');
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
    console.error(chalk.red.bold(err));
    return;
  }
  console.log(chalk.green.bold('File created!'));
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
      if (argv._.length !== 1) throw (new Error(chalk.red.bold('Argument check failed: too much arguments for command init.')));
      break;
    case 'logout':
      if (argv._.length !== 1) throw (new Error(chalk.red.bold('Argument check failed: too much arguments for command logout.')));
      break;
    case 'run':
      if (argv._.length < 2) throw (new Error(chalk.red.bold('Argument check failed: too few arguments for command run.')));
      break;
    case 'list': {
      if (argv._.length !== 1) throw (new Error(chalk.red.bold('Argument check failed: too much arguments for command list.')));
      if (argv.r && (argv.o || argv.h)) throw (new Error(chalk.red.bold('Argument check failed: no more than one parameter can be specified for the list command.')));
      if (argv.o && (argv.r || argv.h)) throw (new Error(chalk.red.bold('Argument check failed: no more than one parameter can be specified for the list command.')));
      if (argv.h && (argv.o || argv.r)) throw (new Error(chalk.red.bold('Argument check failed: no more than one parameter can be specified for the list command.')));
      break;
    }
    case 'deploy':
      if (argv._.length !== 2) throw (new Error(chalk.red.bold('Argument check failed: wrong number of arguments for command deploy (only funcName is required).')));
      break;
    case 'delete':
      if (argv._.length !== 2) throw (new Error(chalk.red.bold('Argument check failed: wrong number of arguments for command delete.')));
      break;
    case 'search':
      if (argv._.length !== 2) throw (new Error(chalk.red.bold('Argument check failed: wrong number of arguments for command search.')));
      break;
    case 'get_help': {
      if (argv._.length !== 1) throw (new Error(chalk.red.bold('Argument check failed: too much arguments for command get_help.')));
      if (argv.f && (argv.c || argv.a)) throw (new Error(chalk.red.bold('Argument check failed: no more than one parameter can be specified for the get_help command.')));
      if (argv.c && (argv.f || argv.a)) throw (new Error(chalk.red.bold('Argument check failed: no more than one parameter can be specified for the get_help command.')));
      if (argv.a && (argv.c || argv.f)) throw (new Error(chalk.red.bold('Argument check failed: no more than one parameter can be specified for the get_help command.')));
      break;
    }
    case 'createConfig':
      if (argv._.length !== 1) throw (new Error(chalk.red.bold('Argument check failed: too much arguments for command createConfig.')));
      break;
    default:
      throw new Error(chalk.red.bold('Argument check failed: command not found.'));
  }
  return true;
};

yargs
  .command('init', 'Allows the user to associate a payment method to the platform by eithercreating a new ETH wallet or associating an existing one. The wallet will let the user access all paid services.', () => {}, initFunction)
  .command('logout', 'Allows the user to remove the previously associated payment method.', () => {}, logout)
  .command('run', 'Allows the user to execute a function available on the platform specifying all needed parameters.', () => {}, runFunction)
  .command('list', 'Lists all available functions available in the platform with their respective description, usage and price.', listOptions, listFunction)
  .command('deploy', 'Allows the developer to deploy a function to the platform with its source code and a configuration file for the meta data.', () => {}, deployFunction)
  .command('delete', 'Allows the developer to delete a function available on the platform.', () => {}, deleteFunction)
  .command('search', 'Lists all available functions on the platform matching the keyword specified with the description of the functions.', () => {}, searchFunction)
  .command('get_help', 'View the guide to Etherless', helpOptions, helpFunction)
  .command('createConfig', 'Creates a JSON file in Download folder with empty parameters to configure the deploy of a function', () => {}, createConfigFunction)
  .help('why')
  .check(verifyArguments)
  .parse();
