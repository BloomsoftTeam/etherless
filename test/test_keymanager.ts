import { expect, assert } from 'chai';
import path from 'path';
import fs from 'fs';
// import getToken from './hello';
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
import { describe, it } from 'mocha';
import KeyManager from '../cli/KeyManager';
import os from 'os';

interface ProofToken {
  token: string;
  proof: string;
}
const password = 'ciao';
const t = new KeyManager(password);
const credentialsPath = `${os.homedir()}/.credentials`;
const keyPath = path.resolve(credentialsPath, 'private.key');
const walletPath = path.resolve(credentialsPath, 'wallet.txt');
const wallet = '0xA23E02B08003AD253fa5f217efCBa8D1213c687b';
const privatekey = '0xc06d007178f5141e3ef38725c1f4be28507e3c10d85eba1eb519ccefbb3ad12a';
const criptedKey = 'etlkeyKsJyKjq5Ie5fa0xEE5QQ5QOAYX9aGYrCN4jgCyDOA4CQr6Li-hEAncqgLex_WDkuV38WAUNgIFoXZNTWY2oZJh9eRzjn2JuGpwCPfHaDlWFLf7uRjiJ8AFpd1BTYHk6TbVmfGToRUpTZ0kZ4OpSoqxdy_Q';
const criptedLength = criptedKey.length;

describe('encryptData', () => {
  it('encryptData is working', (done) => {
    new Promise((resolve, reject) => {
      const matchKey = 'etlkey';
      t.encryptData(privatekey)
      .then((result) => {
        expect(result).to.include(matchKey);
        expect(result.length).to.be.equal(criptedLength);
        done();
        resolve();
      }).catch((error) => {
        reject(new Error(error.toString()));
      });
    }).catch(assert.fail);
  });
});

describe('decryptData', () => {
  it('decryptData is working', (done) => {
    new Promise((resolve, reject) => {
      t.decryptData(criptedKey)
      .then((result) => {
        expect(result).to.be.equal(privatekey);
        done();
        resolve();
      }).catch((error) => {
        reject(new Error(error.toString()));
      });
    }).catch(assert.fail);
  });
});

describe('saveCredentials', () => {
  it('saving credentials into fs is working', (done) => {
    new Promise ((resolve, reject) => {
      t.saveCredentials(privatekey, wallet)
      .then(() => {
        const readWallet = fs.readFileSync(walletPath).toString();
        const readKey = fs.readFileSync(keyPath).toString();
        expect(readWallet).to.be.equal(wallet);
        expect(readKey.length).to.be.equal(criptedLength);
        fs.unlinkSync(walletPath);
        fs.unlinkSync(keyPath);
        done();
        resolve();
      }).catch((error) => {
        fs.unlinkSync(walletPath);
        fs.unlinkSync(keyPath);
        reject(new Error(error.toString()));
      });      
      
    }).catch(assert.fail);
  });
});

describe('checkCredentialsExistance', () => {
  it('checkCredentialsExistance (true case) is working', (done) => {
    new Promise ((resolve, reject) => {
      fs.writeFileSync(walletPath, wallet);
      fs.writeFileSync(keyPath, privatekey);
      t.checkCredentialsExistance()
      .then(() => {
        done();
        resolve();
      }).catch((error) => {
        reject(new Error(error.toString()));
      });
    }).catch(assert.fail);
  });
});

describe('checkCredentialsExistance', () => {
  it('checkCredentialsExistance (false case) is working', (done) => {
    new Promise ((resolve, reject) => {
      fs.writeFileSync(walletPath, wallet);
      fs.writeFileSync(keyPath, privatekey);
      fs.unlinkSync(walletPath);
      fs.unlinkSync(keyPath);
      t.checkCredentialsExistance()
      .then(reject)
      .catch(() => {
        done();
        resolve();
      });
    }).catch(assert.fail);
  });
});

describe('loadPublicKey', () => {
  it('loadPublicKey is working', (done) => {
    new Promise ((resolve, reject) => {
      fs.writeFileSync(walletPath, wallet);
      t.loadPublicKey()
      .then((readWallet) => {
        expect(readWallet).to.be.equal(wallet);
        done();
        resolve;
      }).catch((error) => {
        reject(new Error(error.toString()));
      });
    }).catch(assert.fail);
  });
});

describe('loadCredentials', () => {
  it('loadCredentials is working', (done) => {
    new Promise ((resolve, reject) => {
      fs.writeFileSync(keyPath, criptedKey);
      t.loadCredentials()
      .then((readKey) => {
        expect(readKey).to.be.equal(privatekey);
        done();
        resolve;
      }).catch((error) => {
        reject(new Error(error.toString()));
      });
    }).catch(assert.fail);
  });
});

describe('removeCredentials', () => {
  it('removeCredentials is working', (done) => {
    new Promise ((resolve, reject) => {
      fs.writeFileSync(walletPath, wallet);
      fs.writeFileSync(keyPath, criptedKey);
      t.removeCredentials()
      .then(() => {
        done();
        resolve;
      }).catch((error) => {
        reject(new Error(error.toString()));
      });
    }).catch(assert.fail);
  });
});