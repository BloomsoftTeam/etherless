import { expect, assert } from 'chai';
import { describe, it } from 'mocha';
import { EthereumManager, ContractAddressesInterface } from '../cli/EthereumManager';
import EthersHelper from '../cli/common/EthersHelper';
import { InfuraProvider } from 'ethers/providers';
const infuraProvider = new InfuraProvider('ropsten', '048704ebedbd4239bc0d528e70e40ff9');
const apiKey = 'PC13EX7VI58TAV5CT2474YZVFF9XNI1XNJ';
const pk = "***REMOVED***" // 0xe710597dE7cd68A8F9938dDfe7140f3fDf39AbB0
const ca = '0x252e09c98F73208a2D60dc1F977401E425c0B660'; // contratto run
const abi = '[{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"operationHash","type":"string"},{"indexed":false,"internalType":"string","name":"funcName","type":"string"},{"indexed":false,"internalType":"string","name":"funcParameters","type":"string"}],"name":"runRequest","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"operationHash","type":"string"},{"indexed":false,"internalType":"string","name":"funcResult","type":"string"}],"name":"runResult","type":"event"},{"constant":true,"inputs":[{"internalType":"string","name":"funcName","type":"string"}],"name":"getFuncPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"getStorage","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"string","name":"funcName","type":"string"},{"internalType":"string","name":"operationHash","type":"string"}],"name":"sendRunFailure","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"string","name":"funcName","type":"string"},{"internalType":"string","name":"funcParameters","type":"string"}],"name":"sendRunRequest","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":false,"inputs":[{"internalType":"string","name":"funcResult","type":"string"},{"internalType":"uint256","name":"executionPrice","type":"uint256"},{"internalType":"uint256","name":"devFee","type":"uint256"},{"internalType":"address payable","name":"devAddress","type":"address"},{"internalType":"string","name":"operationHash","type":"string"}],"name":"sendRunResult","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_storage","type":"address"}],"name":"setStorage","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}]';

const contracts = <ContractAddressesInterface> {
  storage: '0xe2D64EDc6063a4748007862a3A46Eea39D51184C',
  deploy: '0x916a5D3F9d63Ce72cF1e8c1E92235EE50F097De4',
  run: '0x933B4c43A682F63Ca81659179C042Fe7ebEB5D83',
  remove: '0x15304FC28C3281003b4eA7a8f996508dA9c84fd4'
};

describe('generateNewWallet', () => {
  it('generateNewWallet is working', (done) => {
    new Promise((resolve, reject) => {
      const eh = new EthersHelper(infuraProvider, apiKey);
      const em = new EthereumManager(eh, contracts);
      expect((em.generateNewWallet()).address).match(/^0x/, 'Regular expression match');
      resolve(done());
    }).catch(assert.fail);
  });
});

describe('getWalletFromPrivate', () => {
  it('getWalletFromPrivate is working', (done) => {
      const eh = new EthersHelper(infuraProvider, apiKey);
      const em = new EthereumManager(eh, contracts);
      expect((em.getWalletFromPrivate(pk)).address).to.be.equal("0xe710597dE7cd68A8F9938dDfe7140f3fDf39AbB0");
      done();
  });
});

describe('loadSmartContract', () => {
  it('loadSmartContract is working', (done) => {
  	const eh = new EthersHelper(infuraProvider, apiKey);
    const em = new EthereumManager(eh, contracts);
    new Promise((resolve, reject) => {
      em.loadSmartContract(ca)
      .then((contract) => {
        expect((contract.abi).toString()).to.be.equal(abi);
      })
      .catch(reject);
      done();
      resolve();
    }).catch(assert.fail);
  });
});
/*
describe('getContractInterfaceByAddress', () => {
  it('getContractInterfaceByAddress is working', (done) => {
    
  });
});
/*
describe('getDeployFee', () => {
  it('getDeployFee is working', (done) => {
    
  });
});

describe('deploy', () => {
  it('deploy is working', (done) => {
    
  });
});

describe('listenOperationTokenDeployEvents', () => {
  it('listenOperationTokenDeployEvents is working', (done) => {
    
  });
});

describe('listenRequestUploadEvents', () => {
  it('listenRequestUploadEvents is working', (done) => {
    
  });
});

describe('getFuncPrice', () => {
  it('getFuncPrice is working', (done) => {
    
  });
});

describe('sendRunRequest', () => {
  it('sendRunRequest is working', (done) => {
    
  });
});

describe('listenOperationTokenRunEvent', () => {
  it('listenOperationTokenRunEvent is working', (done) => {
    
  });
});

describe('listenRunEvents', () => {
  it('listenRunEvents is working', (done) => {
    
  });
});

describe('sendDeleteRequest', () => {
  it('sendDeleteRequest is working', (done) => {
    
  });
});

describe('listenOperationTokenDeleteEvent', () => {
  it('listenOperationTokenDeleteEvent is working', (done) => {
    
  });
});

describe('listenDeleteEvents', () => {
  it('listenDeleteEvents is working', (done) => {
    
  });
});

*/
