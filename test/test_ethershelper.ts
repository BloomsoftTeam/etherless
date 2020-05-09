import { expect, assert } from 'chai';
import { describe, it } from 'mocha';
import { Wallet } from 'ethers/wallet';
import * as ethers from 'ethers';
import { Contract } from 'ethers/contract';
import EthersHelper from '../cli/common/EthersHelper';
// import getToken from './hello';
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
const provider = new ethers.providers.InfuraProvider('ropsten', '048704ebedbd4239bc0d528e70e40ff9');
const { ETHERSCAN_API_KEY } = process.env;

// const credentialsPath = path.resolve(__dirname, '.credentials');
// const pK = path.resolve(credentialsPath, 'private.key');
const pk = '0x9328A58A386896F4C2C23196870BEEB57D7A70D81E90B87C1322A71BF12CAA3E';
const ca = '0x252e09c98F73208a2D60dc1F977401E425c0B660'; // contratto run
const abi = '[{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"operationHash","type":"string"},{"indexed":false,"internalType":"string","name":"funcName","type":"string"},{"indexed":false,"internalType":"string","name":"funcParameters","type":"string"}],"name":"runRequest","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"operationHash","type":"string"},{"indexed":false,"internalType":"string","name":"funcResult","type":"string"}],"name":"runResult","type":"event"},{"constant":true,"inputs":[{"internalType":"string","name":"funcName","type":"string"}],"name":"getFuncPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"getStorage","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"string","name":"funcName","type":"string"},{"internalType":"string","name":"operationHash","type":"string"}],"name":"sendRunFailure","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"string","name":"funcName","type":"string"},{"internalType":"string","name":"funcParameters","type":"string"}],"name":"sendRunRequest","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":false,"inputs":[{"internalType":"string","name":"funcResult","type":"string"},{"internalType":"uint256","name":"executionPrice","type":"uint256"},{"internalType":"uint256","name":"devFee","type":"uint256"},{"internalType":"address payable","name":"devAddress","type":"address"},{"internalType":"string","name":"operationHash","type":"string"}],"name":"sendRunResult","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_storage","type":"address"}],"name":"setStorage","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}]';

function wait(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(ms);
    }, ms);
  });
}

// class p implements ProofToken {
// token: string = "JfZq1c6_DKHqe9VwkcOYqannIBfA94puiB93EPBHeQsH-BD5J09NOvHsCRH9L330bSu-KBR9YHQV07-eCqyoGA";
// proof: string;
// }

// var t = new TokenManager();

// t.newToken().then((token) => {
//  console.log(token);
// })

// var proof = new p();
/*
describe('newWallet', () => {
  it('Ritorna un nuovo wallet', (done) => {

  });
});
*/

describe('getWalletFromPrivate', () => {
  it('Ritorna Wallet', (done) => {
    const t = new EthersHelper(provider, ETHERSCAN_API_KEY);

    const result = t.getWalletFromPrivate(pk).address.toString();
    expect(result).to.equal((new Wallet(pk, provider).address.toString()));
    done();
  });
});


describe('getContractInterfaceByAddress', () => {
  it('Carica il contratto', (done) => {
    const v = new EthersHelper(provider, ETHERSCAN_API_KEY);

    v.getContractInterfaceByAddress(ca)
      .then((result) => {
        expect(result.toString()).to.equal(abi);
        done();
      })
      .catch(assert.fail);
  });
});
/*
describe('loadSmartContract', () => {
  it('Carica il contratto', (done) => {
    const v = new EthersHelper(provider, ETHERSCAN_API_KEY);

    new Promise((resolve, reject) => {
      v.loadSmartContract(ca)
      .then((contract) => {
        const c = new Contract(ca, abi, provider);
        expect(contract.toString()).to.equal(c.toString());
        resolve(done());
      })
      .catch(reject);
    }).catch(assert.fail);
  });
});
*/