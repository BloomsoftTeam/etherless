import { expect, assert } from 'chai';
import { describe, it } from 'mocha';
import { ServerManager } from '../cli/ServerManager';

const serverLink = 'http://ec2-3-8-120-14.eu-west-2.compute.amazonaws.com:3000';
const apiLink = 'https://w1hr7l3wui.execute-api.eu-west-2.amazonaws.com/dev/';
const serverManager = new ServerManager(serverLink, apiLink); //TO DO Aggiungere link server
describe('searchFunction', () => {
  it('search is working', (done) => {
    const searchParam = 'TestingFunction';
    new Promise((resolve, reject) => {
      serverManager.searchFunctionsWith(searchParam)
      .then((response) =>{
        expect(JSON.stringify(response)).include('{"funcName":"TestingFunction","params":"integer, integer","unavailable":"false","usage":"function for testing","price":"1","description":"Function used by unit test","devAddress":"testAddress"}');
        resolve(done());
      })
      .catch(reject);
    });
  });
});

describe('searchFunction', () => {
  it('search not found is working', (done) => {
    const searchParam = 'NoFunc';
    new Promise((resolve, reject) => {
      serverManager.searchFunctionsWith(searchParam)
      .then((response) =>{
        expect(JSON.stringify(response)).include('{"message":"Internal server error"}');
        resolve(done());
      })
      .catch(reject);
    });
  });
});

describe('list', () => {
  it('list is working', (done) => {
    const _opt = { hidden: false, own: null }
    new Promise((resolve, reject) => {
      serverManager.getFunctionsWith(_opt)
      .then((response) =>{
        expect(JSON.stringify(response)).include('{"funcName":"TestingFunction","params":"integer, integer","unavailable":"false","usage":"function for testing","price":"1","description":"Function used by unit test","devAddress":"testAddress"}');
        resolve(done());
      })
      .catch(reject);
    });
  });
});

describe('listHidden', () => {
  it('list -h is working', (done) => {
    const _opt = {
      hidden: true,
    }
    new Promise((resolve, reject) => {
      serverManager.getFunctionsWith(_opt)
      .then((response) =>{
        expect(JSON.stringify(response)).include('{"funcName":"TestingFunction2","params":"integer, integer","unavailable":"true","usage":"function for testing","price":"1","description":"Function used by unit test","devAddress":"testAddress2"}');
        resolve(done());
      })
      .catch(reject);
    });
  });
});

describe('listOwner', () => {
  it('list -o is working', (done) => {
    const ownerAddress = 'testAddress';
    const _opt = {
      own: ownerAddress,
    }
    new Promise((resolve, reject) => {
      serverManager.getFunctionsWith(_opt)
      .then((response) =>{
        expect(JSON.stringify(response)).include('{"funcName":"TestingFunction","params":"integer, integer","unavailable":"false","usage":"function for testing","price":"1","description":"Function used by unit test","devAddress":"testAddress"}');
        resolve(done());
      })
      .catch(reject);
    });
  });
});

// describe('list', () => {
//   it('empty db', (done) => {

//     let _opt = { own: null, hidden: false }

//     new Promise((resolve, reject) => {
//       serverManager.getFunctionsWith(_opt)
//       .then((response) =>{
//         expect(JSON.stringify(response)).include('{"message":"Internal server error"}');
//         _opt.hidden = true;
//         serverManager.getFunctionsWith(_opt)
//           .then((response) =>{
//             expect(JSON.stringify(response)).include('{"message":"Internal server error"}');
//             resolve(done());
//           })
//           .catch(reject);
//       })
//       .catch(reject);
//     });
  
//   });
// });
