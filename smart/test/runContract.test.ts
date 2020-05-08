// test/RunContract.test.js

import { accounts, contract } from '@openzeppelin/test-environment';
import { expect } from 'chai';

import {
  BN, expectEvent, expectRevert,
} from '@openzeppelin/test-helpers';

const RunContract = contract.fromArtifact('RunContract');
const EtherlessStorageMock = contract.fromArtifact('EtherlessStorageMock');

describe('RunContract', () => {
  const [owner, other] = accounts;

  beforeEach(async function setup() {
    const storage = await EtherlessStorageMock.new({ from: owner });

    this.myContract = await RunContract.new({ from: owner });
    await this.myContract.initialize(owner, { from: owner });
    await this.myContract.setStorage(storage.address, { from: owner });
  });

  it('should revert the operation because the function is not available', async function checkNoFuncPriceAvailable() {
    await expectRevert(
      this.myContract.checkFuncPrice('somma', { from: other }),
      'the function is not available',
    );
  });

  it('should return the price of the specified function to anyone', async function checkFuncPrice() {
    expect((await this.myContract.checkFuncPrice('exist', { from: other })).toString()).equal((new BN('1000')).toString());
  });

  it('should revert the run request because the function is not available', async function checkNoFuncAvailableToRun() {
    await expectRevert(
      this.myContract.sendRunRequest('somma', '{x:10, y:20}', { from: other, value: 1000 }),
      'the function you requested is not avaiable',
    );
  });

  it('should revert the run request because the value sent is inappropriate', async function checkInappropriateValue() {
    await expectRevert(
      this.myContract.sendRunRequest('exist', '{x:10, y:20}', { from: other, value: 10 }),
      'The value (ETH) you sent is inappropriate to run the function',
    );
  });

  it('should emit an event to send the run request to the server with the correct parameters', async function checkSendRunResult() {
    const receipt = await this.myContract.sendRunRequest('exist', '{x:10, y:20}', { from: owner, value: 1000 });
    expectEvent(receipt, 'runRequest', { operationHash: '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209', funcName: 'exist', funcParameters: '{x:10, y:20}' });
  });

  it('should revert the operation because dev has no permission to send run result', async function checkNoPermissionToRun() {
    await expectRevert(
      this.myContract.sendRunResult('funcResult', '900', '100', '0xe710597dE7cd68A8F9938dDfe7140f3fDf39AbB0', '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209', { from: other }),
      'Ownable: caller is not the owner.',
    );
  });

  it('should emit an event to send the run result success to the user', async function checkSendRunResult() {
    const receipt = await this.myContract.sendRunResult('funcResult', '900', '100', '0xe710597dE7cd68A8F9938dDfe7140f3fDf39AbB0', '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209', { from: owner });
    expectEvent(receipt, 'runResult', { operationHash: '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209', funcResult: 'funcResult' });
  });

  it('should revert the operation because dev has no permission to send run failure', async function checkNoPermissionSendRunFailure() {
    await expectRevert(
      this.myContract.sendRunFailure('somma', '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209', { from: other }),
      'Ownable: caller is not the owner.',
    );
  });

  it('should emit an event to send the run result failure to the user', async function checkSendRunResult() {
    const receipt = await this.myContract.sendRunFailure('somma', '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209', { from: owner });
    expectEvent(receipt, 'runResult', { operationHash: '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209', funcResult: 'the function you executed did not stop' });
  });
});
