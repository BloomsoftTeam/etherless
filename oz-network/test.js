const ethers = require('ethers');
const fetch = require('node-fetch');

require('dotenv').config();

const infuraProvider = new ethers.providers.InfuraProvider('ropsten', process.env.INFURA_PROJECT_ID);
const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, infuraProvider);

const admin = '0x1dF62f291b2E969fB0849d99D9Ce41e2F137006e';
const storageAddress = process.env.STORAGE_CONTRACT_ADDRESS;
const deployAddress = process.env.DEPLOY_CONTRACT_ADDRESS;
const runAddress = process.env.RUN_CONTRACT_ADDRESS;
const deleteAddress = process.env.DELETE_CONTRACT_ADDRESS;


const contractAddress = storageAddress;


(async () => {
  try {
    const etherscanUrl = 'https://api-ropsten.etherscan.io/api';
    const query = `?module=contract&action=getabi&address=${contractAddress}&apikey=${process.env.ETHERSCAN_API_KEY}`;
    const response = await fetch(etherscanUrl + query); 
    const respJSON = await response.json();
    const contractInterface = respJSON.result;
    const contract = new ethers.Contract(contractAddress, contractInterface, infuraProvider);
    const signedContract = contract.connect(adminWallet);

    let overrides = {
      gasLimit: 750000,
      // The amount to send with the transaction (i.e. msg.value)
      // value: 10*10**15
    };

    signedContract.checkFuncExistance('somma')
    .then(console.log)
    .catch(console.log);

  } catch (e) {
    console.log(e);
    return e;
  }
})();


                                                    
                                                    
