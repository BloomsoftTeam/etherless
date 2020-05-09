// WARNING: non usare `*`
import path from 'path';
import fs from 'fs';
import os from 'os';
import _sodium from 'libsodium-wrappers';
import mkdirp from 'mkdirp';

class KeyManager {
  readonly credentialsPath = path.resolve(os.homedir(), '.credentials');

  readonly privatePath;

  readonly walletPath;

  readonly magicNumber = 'etlkey';

  private readonly password;

  constructor(password?: string) {
    this.privatePath = path.resolve(this.credentialsPath, 'private.key');
    this.walletPath = path.resolve(this.credentialsPath, 'wallet.txt');
    this.password = password;
  }

  encryptData(data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      _sodium.ready.then(() => {
        const sodium = _sodium;

        const saltForKey = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
        const saltForNonce = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);

        const key = sodium.crypto_pwhash(sodium.crypto_secretbox_KEYBYTES,
          this.password,
          saltForKey,
          sodium.crypto_pwhash_OPSLIMIT_MIN,
          sodium.crypto_pwhash_MEMLIMIT_MIN,
          sodium.crypto_pwhash_ALG_DEFAULT);

        const nonce = sodium.crypto_pwhash(sodium.crypto_secretbox_NONCEBYTES,
          this.password,
          saltForNonce,
          sodium.crypto_pwhash_OPSLIMIT_MIN,
          sodium.crypto_pwhash_MEMLIMIT_MIN,
          sodium.crypto_pwhash_ALG_DEFAULT);

        const cmtext = sodium.crypto_secretbox_easy(data, nonce, key);

        const toSave = this.magicNumber
          + sodium.to_base64(saltForKey)
          + sodium.to_base64(saltForNonce)
          + sodium.to_base64(cmtext);

        resolve(toSave);
      }).catch(reject);
    });
  }

  saveCredentials(privateKey: string, address: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.encryptData(privateKey).then((cipher) => {
        try {
          mkdirp.sync(this.credentialsPath);
          fs.writeFileSync(this.walletPath, address);
          fs.writeFileSync(this.privatePath, cipher);
          resolve();
        } catch (err) {
          reject(err);
        }
      }).catch(reject);
    });
  }

  loadPublicKey(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        resolve(fs.readFileSync(this.walletPath).toString());
      } catch (err) {
        reject(err);
      }
    });
  }

  loadCredentials(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const buffer = fs.readFileSync(this.privatePath, 'utf8');
        if (this.magicNumber !== buffer.substring(0, this.magicNumber.length)) {
          reject(new Error('magicNumber mismatch'));
        }
        this.decryptData(buffer)
          .then(resolve)
          .catch(reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  checkCredentialsExistance(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (fs.existsSync(path.resolve(this.credentialsPath, 'private.key'))) {
          resolve();
        } else {
          reject();
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  removeCredentials(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        fs.unlinkSync(this.privatePath);
        fs.unlinkSync(this.walletPath);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  decryptData(buffer: string): Promise<string> {
    return new Promise((resolve, reject) => {
      _sodium.ready.then(() => {
        const sodium = _sodium;
        const { password } = this;

        if (buffer.length < this.magicNumber.length + 44) {
          reject(new Error('Decryption failed: data length too short'));
          return;
        }

        if (buffer.substring(0, this.magicNumber.length) !== this.magicNumber) {
          reject(new Error('Decryption failed: incorrect magic number'));
          return;
        }

        try {
          const saltForKey = sodium.from_base64(
            buffer.substring(
              this.magicNumber.length,
              this.magicNumber.length + 22,
            ),
          );
          const saltForNonce = sodium.from_base64(
            buffer.substring(
              this.magicNumber.length + 22,
              this.magicNumber.length + 44,
            ),
          );
          const cmtext = sodium.from_base64(buffer.substring(
            this.magicNumber.length + 44,
            buffer.length,
          ));

          const key = sodium.crypto_pwhash(sodium.crypto_secretbox_KEYBYTES,
            password,
            saltForKey,
            sodium.crypto_pwhash_OPSLIMIT_MIN,
            sodium.crypto_pwhash_MEMLIMIT_MIN,
            sodium.crypto_pwhash_ALG_DEFAULT);

          const nonce = sodium.crypto_pwhash(sodium.crypto_secretbox_NONCEBYTES,
            password,
            saltForNonce,
            sodium.crypto_pwhash_OPSLIMIT_MIN,
            sodium.crypto_pwhash_MEMLIMIT_MIN,
            sodium.crypto_pwhash_ALG_DEFAULT);

          const data = sodium.crypto_secretbox_open_easy(cmtext, nonce, key);
          resolve(sodium.to_string(data));
        } catch (e) {
          reject(e);
        }
      }).catch(reject);
    });
  }
}

export { KeyManager as default };
