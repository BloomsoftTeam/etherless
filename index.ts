// import { LambdaManager, LambdaManagerInterface } from './LambdaManager';


// import { ethers } from 'ethers';

import { InfuraProvider } from 'ethers/providers';

import dotenv from 'dotenv';


// import { ServerHandlerInterface, ServerHandlerInterface } from './ServerHandler';

// import { SmartHanler } from './SmartHandler';

import log from './server/common/Logger';
// import TokenManager from './common/TokenManager';
import SmartHandler from './server/SmartHandler';
import EthersHelper from './server/common/EthersHelper';

dotenv.config();

const {
  ETHERSCAN_API_KEY,
  ADMIN_WALLET_PRIVATE_KEY,
  INFURA_PROJECT_ID,
} = process.env;


const infuraProvider = new InfuraProvider('ropsten', INFURA_PROJECT_ID);
log.info(`[server] Infura API Key: ${INFURA_PROJECT_ID}`);
log.info(`[server] Etherscan API Key: ${ETHERSCAN_API_KEY}`);
const ethersHelper = new EthersHelper(infuraProvider, ETHERSCAN_API_KEY);
// const smartHandler = new SmartHandler(ethersHelper, ADMIN_WALLET_PRIVATE_KEY);
const wallet = ethersHelper.getWalletFromPrivate(ADMIN_WALLET_PRIVATE_KEY);
// const tokens: { [id: string]: boolean } = {};

/* ethersHelper.loadSmartContract(process.env.STORAGE_CONTRACT_ADDRESS, wallet)
  .then((contract) => {
    contract.closeOperation(
      '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209',
    )
      .then((u) => {
        log.info(u);
        log.info('ok');
      })
      .catch((err) => {
        log.error(`[contract] ${err}`);
      });
  })
  .catch((err) => {
    log.error(`[server] ${err}`);
  });
ethersHelper.loadSmartContract(process.env.STORAGE_CONTRACT_ADDRESS, wallet)
  .then((contract) => {
    contract.getOperationCost(
      '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209',
    )
      .then((u) => {
        log.info(u);
        log.info('ok');
      })
      .catch((err) => {
        log.error(`[contract] ${err}`);
      });
  })
  .catch((err) => {
    log.error(`[server] ${err}`);
  });
*/

ethersHelper.loadSmartContract(process.env.STORAGE_CONTRACT_ADDRESS, wallet)
  .then((contract) => {
    contract.setUserOperation(
      '0xe710597dE7cd68A8F9938dDfe7140f3fDf39AbB0',
      '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209',
      { value: 1000000000, gasLimit: 90000}
      )
      .then(() => {
        log.info('ok');
      })
      .catch((err) => {
        log.error(`[contract] ${err}`);
      });
  })
  .catch((err) => {
    log.error(`[server] ${err}`);
  });



/*
smartHandler.sendRunResult('asdf',
  10,
  10,
  '0xe710597dE7cd68A8F9938dDfe7140f3fDf39AbB0',
  '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209')
  .catch((err) => {
    log.error(`[server] failed sending results ${err}`);
  });
*/

log.info('[server] setted listeners');
