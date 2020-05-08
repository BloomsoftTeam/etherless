// test/DeployContract.test.js

import { accounts, contract } from '@openzeppelin/test-environment';
import chai from 'chai';
import {
  expectEvent, expectRevert,
} from '@openzeppelin/test-helpers';

const { expect } = chai;

const DeployContract = contract.fromArtifact('DeployContract');
const EtherlessStorageMock = contract.fromArtifact('EtherlessStorageMock');

describe('DeployContract', () => {
  const [owner, other] = accounts;

  beforeEach(async function setup() {
    const storage = await EtherlessStorageMock.new({ from: owner });

    this.myContract = await DeployContract.new({ from: owner });
    await this.myContract.initialize(owner, { from: owner });
    await this.myContract.setStorage(storage.address, { from: owner });
  });

  it('should verify deployFee gets returned correctly to anyone', async function checkDeployFee() {
    this.myContract.getDeployFee({ from: other })
      .then((fee) => {
        expect(fee.toString()).to.be.equal('2000000000000000');
      })
      .catch(chai.assert.fail);
  });

  it('should revert the operation because the value provided is inappropriate', async function checkNoAppropriateValue() {
    await expectRevert(
      this.myContract.deploy('0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209', 'somma', { from: other, value: 0 }),
      'Error: the value (ETH) you sent is inappropriate to deploy',
    );
  });

  it('should revert the operation because the dev has no permissions on that function', async function checkNoPermissionFunc() {
    await expectRevert(
      this.myContract.deploy('0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209', 'somma', { from: owner, value: 2000000000000000 }),
      'you dont have permission to deploy or overwrite this function',
    );
  });

  it('should emit an event to send the deploy token to the server with the correct data', async function checkSendDeployToken() {
    const receipt = await this.myContract.deploy('0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209', 'admin', { from: other, value: 2000000000000000 });
    expectEvent(receipt, 'uploadToken', { token: '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209', operationHash: '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209' });
  });

  it('should revert because only owner can request the upload of a new function to the platform', async function checkOnlyOwnerOverride() {
    await expectRevert(
      this.myContract.sendRequestUpload('0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209', { from: other }),
      'Ownable: caller is not the owner.',
    );
  });

  it('should emit an event to request the function upload from the cli', async function checkSendRequestUpload() {
    const receipt = await this.myContract.sendRequestUpload('0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209', { from: owner });
    expectEvent(receipt, 'requestUpload', { operationHash: '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209' });
  });

  it('should revert because only the owner can terminate the deploy operation in case of a success', async function checkOnlyOwnerTerminate() {
    await expectRevert(
      this.myContract.terminateDeploy('somma', other, 1000, '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209', { from: other }),
      'Ownable: caller is not the owner.',
    );
  });

  it('should revert because there is no operation to close', async function checkNoOperationToClose() {
    await expectRevert(
      this.myContract.terminateDeploy('somma', other, 1000, '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c208', { from: owner }),
      'the operation hash specified no longer exist',
    );
  });

  it('should revert because only the owner can refund the dev in case of a deploy failure', async function checkOnlyOwnerCanRefundDeploy() {
    await expectRevert(
      this.myContract.refundDeploy('somma', '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209', { from: other }),
      'Ownable: caller is not the owner.',
    );
  });

  it('should revert because there is no operation to cancel', async function checkNoOperationToCancel() {
    await expectRevert(
      this.myContract.refundDeploy('somma', '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c208', { from: owner }),
      'the operation hash specified no longer exist',
    );
  });
});
