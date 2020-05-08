// test/DeleteContract.test.js

import { accounts, contract } from '@openzeppelin/test-environment';
// import { expect } from 'chai';
import {
  expectEvent, expectRevert, // , BN, balance, send, ether
} from '@openzeppelin/test-helpers';

const DeleteContract = contract.fromArtifact('DeleteContract');
const EtherlessStorageMock = contract.fromArtifact('EtherlessStorageMock');

describe('DeleteContract', () => {
  const [owner, other] = accounts;

  beforeEach(async function setup() {
    const storage = await EtherlessStorageMock.new({ from: owner });

    this.myContract = await DeleteContract.new({ from: owner });
    await this.myContract.initialize(owner, { from: owner });
    await this.myContract.setStorage(storage.address, { from: owner });
  });

  // it('should test a stupid check', async function() {
  //   expect(await .toString()).to.equal('2000000000000000');
  // });

  it('should revert the operation because the function does not exist', async function checkNoExistance() {
    await expectRevert(
      this.myContract.sendDeleteRequest('somma', { from: other }),
      'Error: Function either doesnt exist or you dont have permissions to delete it',
    );
  });

  it('should revert the operation because you dont have permission to delete it', async function checkNoPermissionDelete() {
    await expectRevert(
      this.myContract.sendDeleteRequest('exist', { from: other }),
      'Error: Function either doesnt exist or you dont have permissions to delete it',
    );
  });

  it('should emit an event to send the delete request', async function checkDeleteRequest() {
    const receipt = await this.myContract.sendDeleteRequest('admin', { from: other });
    expectEvent(receipt, 'deleteRequest', { operationHash: '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209', funcName: 'admin' });
  });

  it('should revert the send delete success operation because you dont have permission to perform this job', async function checkNoPermissionDeleteSuccess() {
    await expectRevert(
      this.myContract.sendDeleteSuccess('0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209', 'somma', { from: other }),
      'Ownable: caller is not the owner.',
    );
  });

  it('should emit an event to send the delete success response', async function checkDeleteSuccess() {
    const receipt = await this.myContract.sendDeleteSuccess('0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209', 'somma', { from: owner });
    expectEvent(receipt, 'deleteSuccess', { operationHash: '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209' });
  });

  it('should revert the send delete failure operation because you dont have permission to perform this job', async function CheckNoPermissionDeleteFailure() {
    await expectRevert(
      this.myContract.sendDeleteFailure('0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209', { from: other }),
      'Ownable: caller is not the owner.',
    );
  });

  it('should emit an event to send the delete failure response', async function checkDeleteFailure() {
    const receipt = await this.myContract.sendDeleteFailure('0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209', { from: owner });
    expectEvent(receipt, 'deleteFailure', { operationHash: '0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209' });
  });
});
