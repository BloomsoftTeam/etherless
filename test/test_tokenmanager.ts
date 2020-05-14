import { expect, assert } from 'chai';
import { describe, it } from 'mocha';
import TokenManager from '../cli/common/TokenManager';
import { resolve } from 'dns';
// import getToken from './hello';
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line

interface ProofToken {
  token: string;
  proof: string;
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

const t = new TokenManager();
class testToken implements ProofToken {
  token: string;
  proof: string;
  constructor(){
    this.token = 'BwZEME3SUk-vrnqeAnIDWBahwFzWYi0uNIyAzvm5nD1Uf7yS0Dt6432Vrn3b22GbWY--3msxGhsa1C2PshTeTA';
    this.proof = '9MJibfzPA72M3-Tyh9rTT8r0eck-xyL4cBZWnjGsaX79pxVJsvineRxc_hh-lJ4kp_P_34-UzuefoCdeCf-dAA';
  }
};
const concreteToken = new testToken();

describe('newToken', () => {
  it('newToken is working', (done) => {
    new Promise((resolve, reject) => {
      t.newToken()
      .then((result) => {
        expect(result.token.length).to.be.equal(86);
        done();
        resolve();
      }).catch((error) => {
        reject(new Error(error.toString()));
      });
    }).catch(assert.fail);
  });
});

describe('setToken', () => {
  it('setToken is working', (done) => {
    const tm = new TokenManager();
    new Promise((resolve, reject) => {
      tm.setToken(concreteToken);
      expect(tm.getToken()).to.be.equal(concreteToken);
      done();
      resolve();
    }).catch(assert.fail);
  });
});

describe('getToken', () => {
  it('getToken is working', (done) => {
    t.setToken(concreteToken);
    new Promise((resolve, reject) => {
      expect(t.getToken()).to.be.equal(concreteToken);
      done();
      resolve();
    }).catch(assert.fail);
  });
});

describe('computeProof', () => {
  it('computeProof is working', (done) => {
    new Promise((resolve, reject) => {
      t.computeProof(concreteToken.token)
      .then((result) => {
        expect(result).to.be.equal(concreteToken.proof);
        done();
        resolve();
      }).catch((error) => {
        reject(new Error(error.toString()));
      });
    }).catch(assert.fail);
  });
});

describe('verifyToken', () => {
  it('verifyToken is working', (done) => {
    new Promise((resolve, reject) => {
      t.setToken(concreteToken);
      t.verifyToken()
      .then((result) => {
        expect(result).to.be.equal(true);
        done();
        resolve();
      }).catch((error) => {
        reject(new Error(error.toString()));
      });
    }).catch(assert.fail);
  });
});