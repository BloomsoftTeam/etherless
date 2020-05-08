// import ProofToken = require('ProofToken');
/*
TODO: "include": [
        "src/**^^/*"
    ],
  in tsconfig.json
*/

import _sodium = require('libsodium-wrappers');

const tokenByteSize = 64;

/** usage
on client generate token = newToken()
send token.proof via insecure channel
authenticate via secure channel with token.token
on server receive via insecure channel the receivedProof
when authenticating the client verifyToken(new ProofToken(receivedToken, receivedProof))
*/

export interface ProofToken {
  token: string;
  proof: string;
}

export interface TokenManagerInterface {
  newToken(): Promise<ProofToken>;
  setToken(aToken: ProofToken);
  getToken(): ProofToken;
  verifyToken(): Promise<boolean>;
}

class TokenManager implements TokenManagerInterface {
  private token: ProofToken;

  newToken(): Promise<ProofToken> {
    return new Promise((resolve, reject) => {
      _sodium.ready.then(() => {
        const sodium = _sodium;
        const randomToken = sodium.to_base64(sodium.randombytes_buf(tokenByteSize));
        const tokenProof = sodium.to_base64(sodium.crypto_hash(randomToken));
        this.token = { token: randomToken, proof: tokenProof };
        resolve(this.token);
      }).catch(reject);
    });
  }

  setToken(aToken: ProofToken) {
    this.token = aToken;
  }

  getToken(): ProofToken {
    return this.token;
  }

  computeProof(aToken: string): Promise<string> {
    return new Promise((resolve, reject) => {
      _sodium.ready.then(() => {
        const sodium = _sodium;
        const aProof = sodium.to_base64(sodium.crypto_hash(aToken));
        this.token = { token: aToken, proof: aProof };
        resolve(aProof);
      }).catch(reject);
    });
  }

  verifyToken(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      _sodium.ready.then(() => {
        const sodium = _sodium;
        const testProof = sodium.to_base64(sodium.crypto_hash(this.token.token));
        resolve(testProof === this.token.proof);
      }).catch(reject);
    });
  }
}

export { TokenManager as default };
