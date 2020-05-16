// import { ethers } from 'ethers';

import { JsonRpcProvider } from 'ethers/providers';

import dotenv from 'dotenv';

import SmartHandler from './server/SmartHandler';
import EthersHelper from './server/common/EthersHelper';

dotenv.config();

const {
  ETHERSCAN_API_KEY,
  ADMIN_WALLET_PRIVATE_KEY,
  INFURA_PROJECT_ID,
  CUSTOM_NET_URL,
  DELETE_CONTRACT_ADDRESS,
  RUN_CONTRACT_ADDRESS,
  DEPLOY_CONTRACT_ADDRESS,
  STORAGE_CONTRACT_ADDRESS
} = process.env;


//const infuraProvider = new InfuraProvider('ropsten', INFURA_PROJECT_ID);
const httpProvider = new JsonRpcProvider(CUSTOM_NET_URL);
const ethersHelper = new EthersHelper(httpProvider);
const wallet = ethersHelper.getWalletFromPrivate(ADMIN_WALLET_PRIVATE_KEY);

ethersHelper.loadSmartContract(DELETE_CONTRACT_ADDRESS, 'DeployContract', wallet)
  .then((contract) => {
    console.log('ok');
    contract.setStorage(STORAGE_CONTRACT_ADDRESS)
    .then((tx) => {
        console.log('ok');
         tx.wait()
          .then(console.log)
          .catch(console.error);
      })
    .catch(console.error);
  })
  .catch(console.error);

