import { EtherlessClient } from '../cli/EtherlessClient';
import { expect, assert } from 'chai';
//import getToken from './hello';
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
import { describe, it } from 'mocha';
import path from 'path';
import { TokenManagerInterface } from '../cli/common/TokenManager';
import TokenManager from '../cli/common/TokenManager';
import { ServerManagerInterface, RequestOptions, ResponseDeployInterface, ServerManager } from '../cli/ServerManager';
import { EthereumManagerInterface, EthereumManager, ContractAddressesInterface } from '../cli/EthereumManager';
import EthersHelper from '../cli/common/EthersHelper';
import { Wallet } from 'ethers';
import { InfuraProvider } from 'ethers/providers';


const testingPath = path.resolve('../DeployDeleteTestingFiles/');
const infuraProvider = new InfuraProvider('ropsten', '048704ebedbd4239bc0d528e70e40ff9');
const apiKey = 'PC13EX7VI58TAV5CT2474YZVFF9XNI1XNJ';
const serverLink = 'http://ec2-3-8-120-14.eu-west-2.compute.amazonaws.com:3000';
const apiLink = 'https://w1hr7l3wui.execute-api.eu-west-2.amazonaws.com/dev/';
const serverManager = new ServerManager(serverLink, apiLink); //TO DO Aggiungere link server
const contracts = <ContractAddressesInterface> {
  storage: '0xe2D64EDc6063a4748007862a3A46Eea39D51184C',
  deploy: '0x916a5D3F9d63Ce72cF1e8c1E92235EE50F097De4',
  run: '0x933B4c43A682F63Ca81659179C042Fe7ebEB5D83',
  remove: '0x15304FC28C3281003b4eA7a8f996508dA9c84fd4'
};
const ethereumManager = new EthereumManager(new EthersHelper(infuraProvider, apiKey), contracts);
const tokenManager = new TokenManager();
const etherlessClient = new EtherlessClient({
  ethereumManager,
  serverManager,
  tokenManager  
});
// wallet address = 0xA23E02B08003AD253fa5f217efCBa8D1213c687b
const moneyWallet = new Wallet('0xc06d007178f5141e3ef38725c1f4be28507e3c10d85eba1eb519ccefbb3ad12a');

describe('linkWalletWithKey', () => {
  it('linkWalletWithKey is working', (done) => {
    const key = process.env.ADMIN_WALLET_KEY;
    new Promise((resolve, reject) => {
       expect((etherlessClient.linkWalletWithKey(key)).address).to.be.equal("0xe710597dE7cd68A8F9938dDfe7140f3fDf39AbB0");
       done();
       resolve();
    }).catch(assert.fail);
  });
});

describe('createNewWallet', () => {
  it('createNewWallet is working', (done) => {
    new Promise((resolve, reject) => {
      expect((etherlessClient.createNewWallet()).address).match(/^0x/, 'Regular expression match');
      done();
      resolve();
    }).catch(assert.fail);
  });
});

describe('searchFunction', () => {
  it('searchFunction is working', (done) => {
    const searchParam = 'TestingFunction';
    new Promise((resolve, reject) => {
      etherlessClient.searchFunction(searchParam)
      .then((response) =>{
        expect(JSON.stringify(response)).include('{"funcName":"TestingFunction","params":"integer, integer","unavailable":"false","usage":"function for testing","price":"1","description":"Function used by unit test","devAddress":"testAddress"}');
        done();
        resolve();
      }).catch(reject);
    }).catch(assert.fail);
  });
});

describe('searchFunction empty', () => {
  it('searchFunction without a DynamoDB match is working', (done) => {
    const searchParam = 'SomeImpossibleMatchWithDynamoDBEtherlessTable';
    new Promise((resolve, reject) => {
      etherlessClient.searchFunction(searchParam)
      .then((response) =>{
        expect(JSON.stringify(response)).to.be.equal('{"message":"Internal server error"}');
        done();
        resolve();
      }).catch(reject);
    }).catch(assert.fail);
  });
});

describe('listOwner', () => {
  it('listFunctionWith (owner list option) is working', (done) => {
    const ownerAddress = 'testAddress';
    const _opt = {
      own: ownerAddress,
    }
    new Promise((resolve, reject) => {
      etherlessClient.listFunctionWith(_opt)
      .then((response) =>{
        expect(JSON.stringify(response)).include('{"funcName":"TestingFunction","params":"integer, integer","unavailable":"false","usage":"function for testing","price":"1","description":"Function used by unit test","devAddress":"testAddress"}');
        done();
        resolve();
      }).catch(reject);
    }).catch(assert.fail);
  });
});

describe('listOwner empty', () => {
  it('listFunctionWith (owner list option) without a DynamoDB match is working', (done) => {
    const ownerAddress = 'ImpossibleToMatchAddress';
    const _opt = {
      own: ownerAddress,
    }
    new Promise((resolve, reject) => {
      etherlessClient.listFunctionWith(_opt)
      .then((response) =>{
        expect(JSON.stringify(response)).to.be.equal('{"message":"Internal server error"}');
        done();
        resolve();
      }).catch(reject);
    }).catch(assert.fail);
  });
});

// describe('DynamoDB empty', () => {
//   it('The Database is empty', (done) => {
//     let _opt = {
//       hidden: false,
//     }
//     new Promise((resolve, reject) => {
//       etherlessClient.listFunctionWith(_opt)
//       .then((response) =>{
//         expect(JSON.stringify(response)).to.be.equal('{"message":"Internal server error"}');
//         _opt.hidden = true;
//         etherlessClient.listFunctionWith(_opt)
//         .then((response2) =>{
//           expect(JSON.stringify(response2)).to.be.equal('{"message":"Internal server error"}');
//           done();
//           resolve();
//         }).catch(reject);
//       }).catch(reject);
//     }).catch(assert.fail);
//   });
// });

describe('list', () => {
  it('listFunctionWith (standard list option) is working', (done) => {
    const _opt = {
      hidden: false,
    }
    new Promise((resolve, reject) => {
      etherlessClient.listFunctionWith(_opt)
      .then((response) =>{
        expect(JSON.stringify(response)).include('{"funcName":"TestingFunction","params":"integer, integer","unavailable":"false","usage":"function for testing","price":"1","description":"Function used by unit test","devAddress":"testAddress"}');
        done();
        resolve();
      }).catch(reject);
    }).catch(assert.fail);
  });
});

// describe('list empty', () => {
//   it('listFunctionWith (standard list option) without a DynamoDB match is working', (done) => {
//     const _opt = {
//       hidden: false,
//     }
//     new Promise((resolve, reject) => {
//       etherlessClient.listFunctionWith(_opt)
//       .then((response) =>{
//         expect(JSON.stringify(response)).to.be.equal('{"message":"Internal server error"}');
//         done();
//         resolve();
//       }).catch(reject);
//     }).catch(assert.fail);
//   });
// });

describe('listHidden', () => {
  it('listFunctionWith (hidden list option) is working', (done) => {
    const _opt = {
      hidden: true,
    }
    new Promise((resolve, reject) => {
      etherlessClient.listFunctionWith(_opt)
      .then((response) =>{
        expect(JSON.stringify(response)).include('{"funcName":"TestingFunction2","params":"integer, integer","unavailable":"true","usage":"function for testing","price":"1","description":"Function used by unit test","devAddress":"testAddress2"}');
        done();
        resolve();
      }).catch(reject);
    }).catch(assert.fail);
  });
});

// describe('listHidden empty', () => {
//   it('listFunctionWith (hidden list option) without a DynamoDB match is working', (done) => {
//     const _opt = {
//       hidden: true,
//     }
//     new Promise((resolve, reject) => {
//       etherlessClient.listFunctionWith(_opt)
//       .then((response) =>{
//         expect(JSON.stringify(response)).to.be.equal('{"message":"Internal server error"}');
//         done();
//         resolve();
//       }).catch(reject);
//     }).catch(assert.fail);
//   });
// });

// TODO: capire come buttare dentro i settings dei contratti e del wallet per usare effettivamente questi test

// describe ('deployFunction', () => {
//  it('deployFunction is working', (done) =>{
//   new Promise((resolve, reject) => {
//     const zipFile = fs.readFileSync(testingPath, 'etherlessDeployTesting.zip');
//     const configFile = fs.readFileSync(testingPath, 'etherlessDeploy.json');
//     etherlessClient.deployFunction("etherlessDeployTesting", zipFile, configFile);
//     .then(() => {
//       etherlessClient.deleteFunction("etherlessDeployTesting")
//       .then(() =>{
//         done();
//       }).catch(assert.fail('Deploy succeded but can\'t remove deployed function, can\'t procede with delete test'))
//     }).catch(assert.fail);
//   });
//  });
// });

// describe('deleteFunction', () => {
//   it('deleteFunction is working', (done) => {
//     new Promise((resolve, reject) => {
//     const zipFile = fs.readFileSync(testingPath, 'etherlessTesting.zip');
//     const configFile = fs.readFileSync(testingPath, 'etherless.json');
//       etherlessClient.deployFunction("etherlessTesting", zipFile, configFile)
//       .then(() =>{
//         etherlessClient.deleteFunction("etherlessTesting")
//         .then(() => {
//           done();
//         })
//       }).catch(assert.fail("deploy of function to delete failed. Can't procede"))  
//     }).catch(assert.fail);
//   });
// });

// describe('runFunction', () => {
//   it('runFunction is working', (done) => {
//     new Promise((resolve, reject) => {
//       const funcName = 'sommaTesting';
//       const paramsJson = {
//         params: [3, 4],
//       };
//       const expectedResult = paramsJson.params[0] + paramsJson.params[1];
//       etherlessClient.runFunction(funcName, JSON.stringify(paramsJson))
//       .then((result) => {
//         expect(result).to.be.equal(expectedResult);
//         done();
//         resolve();
//       }).catch(reject);
//     }).catch(assert.fail);
//   });
// });
