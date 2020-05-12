import FormData from 'form-data';
import fetch from 'node-fetch';
import log from './common/Logger';

export interface ServerManagerInterface {
  getFunctionsWith(_opt: RequestOptions): Promise<string>;
  deploy(_byteStream: Buffer, config: Buffer, funcName: string, _token: string):
  Promise<ResponseDeployInterface>;
  searchFunctionsWith(_nameFunction: string): Promise<string>;
}

export interface RequestOptions {
  hidden?: boolean;
  own?: string;
}

export interface ResponseDeployInterface {
  ok: boolean;
  message?: string;
  error?: string;
}

class ServerManager {
  readonly server: string;

  readonly api: string;

  constructor(server: string, api: string) {
    this.server = server;
    this.api = api;
  }

  getFunctionsWith(_opt: RequestOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!_opt.hidden && !_opt.own) {
        fetch(`${this.api}/list`)
          .then((response) => {
            resolve(response.json());
          })
          .catch((err) => {
            reject(err);
          });
      } else if (_opt.hidden) {
        fetch(`${this.api}/list/hidden`)
          .then((response) => {
            resolve(response.json());
          })
          .catch((err) => {
            reject(err);
          });
      } else if (_opt.own) {
        fetch(`${this.api}/list/owner/${_opt.own}`)
          .then((response) => {
            resolve(response.json());
          })
          .catch((err) => {
            reject(err);
          });
      }
    });
  }

  searchFunctionsWith(keyword: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fetch(`${this.api}/search/${keyword}`)
        .then((response) => {
          resolve(response.json());
        })
        .catch((err) => {
          reject(err);
        });
      // reject(new Error('not implemented'));
    });
  }

  deploy(_byteStream: Buffer, config: Buffer, funcName: string, _token: string):
  Promise<ResponseDeployInterface> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('funcZip', _byteStream);
      formData.append('funcConfig', config);
      formData.append('token', _token);
      formData.append('funcName', funcName);
      fetch(`${this.server}/deploy`, {
        method: 'POST',
        body: formData,
      }).then((response) => {
        if (response.ok) {
          resolve({ ok: true, message: response.statusText });
          return;
        }
        resolve({ ok: false, error: response.statusText });
      }).catch(reject);
    });
  }
}

export { ServerManager };
