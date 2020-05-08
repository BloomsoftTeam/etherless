// test/EtherlessStorage.test.js

import { accounts, contract } from '@openzeppelin/test-environment';
import { expect } from 'chai';

import {
  BN, expectRevert, balance, // , expectEvent, send, ether,
} from '@openzeppelin/test-helpers';

const EtherlessStorage = contract.fromArtifact('EtherlessStorage');

describe('EtherlessStorage', () => {
  const [owner, other] = accounts;

  beforeEach(async function setup() {
    this.myContract = await EtherlessStorage.new({ from: owner });
    await this.myContract.initialize(owner);
  });

  it('the deployer is the owner', async function setup() {
    expect(await this.myContract.owner()).to.equal(owner);
  });

  it('owner should pass onlyWhitelist modifier', async function checkUserPassOnlyWhitelist() {
    await this.myContract.addFunc('somma', 'available', other, 1000, { from: owner });
  });

  it('should verify deployFee gets returned correctly', async function checkDeployFeeCorrect() {
    expect((await this.myContract.getDeployFee()).toString()).to.equal('2000000000000000');
  });

  it('should revert because dev has no permission to call the function', async function checkNoPermissionToFunc() {
    await expectRevert(
      this.myContract.hasFuncPermission('somma', other, { from: other }),
      'Only whitelist addresses can call this function.',
    );
  });

  it('should return true because dev has permission on function because still available', async function checkDevPermissionOnFunc() {
    expect(await this.myContract.hasFuncPermission('somma', other, { from: owner })).to.equal(true);
  });

  it('should return false because dev has no permission on function because it is assigned to another dev', async function checkNoPermissionOnFunc() {
    await this.myContract.addFuncOwnership('somma', owner, { from: owner });
    expect(await this.myContract.hasFuncPermission('somma', other, { from: owner })).to.equal(false);
  });

  it('should revert because dev has no permission to call the function', async function checkNoPermissionFromDev() {
    await expectRevert(
      this.myContract.removeFuncOwnership('somma', { from: other }),
      'Only whitelist addresses can call this function.',
    );
  });

  it('should remove func ownership and remove permission to the old owner', async function checkFuncRemovalFromOldOwner() {
    await this.myContract.addFuncOwnership('somma', owner, { from: owner });
    await this.myContract.removeFuncOwnership('somma', { from: owner });
    expect(await this.myContract.hasFuncPermission('somma', other, { from: owner })).to.equal(true);
  });

  it('should revert because dev has no permission to call the function', async function checkNoPermissionFromUser() {
    await expectRevert(
      this.myContract.addFuncOwnership('somma', other, { from: other }),
      'Only whitelist addresses can call this function.',
    );
  });

  it('should add the ownership of the func specified to the dev', async function checkCorrectSetOwnershipDev() {
    await this.myContract.addFuncOwnership('somma', other, { from: owner });
    expect(await this.myContract.hasFuncPermission('somma', other, { from: owner })).to.equal(true);
  });

  it('should add the ownership of the func specified to the dev even if he is the owner already', async function checkCorrectSetOWnershipAlreadyOwner() {
    await this.myContract.addFuncOwnership('somma', other, { from: owner });
    await this.myContract.addFuncOwnership('somma', other, { from: owner });
    expect(await this.myContract.hasFuncPermission('somma', other, { from: owner })).to.equal(true);
  });

  it('should be callable by everyone who wants to know the price of a func', async function checkFuncPriceToAnyone() {
    expect((await this.myContract.getFuncPrice('somma', { from: other })).toString()).to.equal('0');
  });

  it('should return the correct price for the specified function', async function checkCorrectFuncPrice() {
    await this.myContract.addFunc('somma', 'available', other, 1000, { from: owner });
    expect((await this.myContract.getFuncPrice('somma', { from: other })).toString()).to.equal('1000');
  });

  it('should be callable by everyone who wants to check the existance of a specific function', async function checkFuncExistance() {
    expect(await this.myContract.checkFuncExistance('somma', { from: other })).to.equal(false);
  });

  it('should check that a previously added function exists on the platform', async function checkExistancePreviouslyAddedFunc() {
    await this.myContract.addFunc('somma', 'available', other, 1000, { from: owner });
    expect(await this.myContract.checkFuncExistance('somma', { from: other })).to.equal(true);
  });

  it('should be callable by everyone who wants to check the availability of a specific function', async function checkFuncAvailabilityFromAnyone() {
    expect(await this.myContract.checkFuncAvailability('somma', { from: other })).to.equal(false);
  });

  it('should check that a previously added function exists on the platform', async function checkAvailabilityPreviouslyAddedFunc() {
    await this.myContract.addFunc('somma', 'available', other, 1000, { from: owner });
    expect(await this.myContract.checkFuncAvailability('somma', { from: other })).to.equal(true);
  });

  it('should revert because dev has no permission to call the function', async function checkOnlyWhitelistHasPermission() {
    await expectRevert(
      this.myContract.addFunc('somma', 'available', other, 1000, { from: other }),
      'Only whitelist addresses can call this function.',
    );
  });

  it('should add a new function to the platform', async function checkFuncCreation() {
    await this.myContract.addFunc('somma', 'available', other, 1000, { from: owner });
    expect(await this.myContract.checkFuncExistance('somma')).to.equal(true);
  });

  it('should reject the creation of a new function to the platform because dev has no permission on it', async function checkRejectFuncCreation() {
    await this.myContract.addFunc('somma', 'available', owner, 1000, { from: owner });
    await expectRevert(
      this.myContract.addFunc('somma', 'available', other, 1000, { from: owner }),
      'dev address has no permission on the specified func',
    );
  });

  it('should revert because dev has no permission to remove the function', async function checkNoPermissionToDeleteFunc() {
    await expectRevert(
      this.myContract.removeFunc('somma', other, { from: other }),
      'Only whitelist addresses can call this function.',
    );
  });

  it('should remove the function from the platform', async function checkFuncRemoval() {
    await this.myContract.addFunc('somma', 'available', other, 1000, { from: owner });
    await this.myContract.removeFunc('somma', other, { from: owner });
    expect(await this.myContract.checkFuncExistance('somma')).to.equal(false);
  });

  it('should reject the removal of a function from the platform because dev has no permission on it', async function checkNoRemoval() {
    await this.myContract.addFunc('somma', 'available', owner, 1000, { from: owner });
    await expectRevert(
      this.myContract.removeFunc('somma', other, { from: owner }),
      'dev address has no permission on the specified func',
    );
  });

  it('should revert because dev has no permission to mark the function hidden', async function checkNoPermissionToMarkHidden() {
    await this.myContract.addFunc('somma', 'available', owner, 1000, { from: owner });
    await expectRevert(
      this.myContract.markHidden('somma', { from: other }),
      'Only whitelist addresses can call this function.',
    );
  });

  it('should make the func unavailable on the platform', async function checkMarkUnavailable() {
    await this.myContract.addFunc('somma', 'available', owner, 1000, { from: owner });
    await this.myContract.markHidden('somma', { from: owner });
    expect(await this.myContract.checkFuncAvailability('somma')).to.equal(false);
  });

  it('should revert because dev has no permission to get the operation hash', async function checkNoPermissionToGetHash() {
    await expectRevert(
      this.myContract.getOperationHash(other, 'delete', 'somma', { from: other }),
      'Only whitelist addresses can call this function.',
    );
  });

  it('should return the operation hash from the requested operation', async function checkCorrectOperationHash() {
    const opHash = await this.myContract.getOperationHash(other, 'delete', 'somma', { from: owner });
    expect(opHash.length).to.equal(66);
  });

  it('should revert because dev has no permission to set a new operation', async function checkNoPermissionToNewOperation() {
    const opHash = await this.myContract.getOperationHash(other, 'delete', 'somma', { from: owner });
    await expectRevert(
      this.myContract.setUserOperation(other, opHash, { from: other }),
      'Only whitelist addresses can call this function.',
    );
  });

  it('should save a new operation to the platform', async function checkOperationSave() {
    const opHash = await this.myContract.getOperationHash(other, 'delete', 'somma', { from: owner });
    await this.myContract.setUserOperation(other, opHash, { from: owner });
    // TODO
  });

  it('should save a new operation to the platform saving the value sent in the transaction in the address of the contract', async function checkValueWhileStoringOperation() {
    const opHash = await this.myContract.getOperationHash(other, 'delete', 'somma', { from: owner });
    await this.myContract.setUserOperation(other, opHash, { from: owner, value: 1000 });
    expect((await balance.current(this.myContract.address)).toString()).equal((new BN('1000')).toString());
  });

  it('should revert because dev has no permission to close an operation', async function checkNoPermissionToClose() {
    const opHash = await this.myContract.getOperationHash(other, 'delete', 'somma', { from: owner });
    await this.myContract.setUserOperation(other, opHash, { from: owner, value: 1000 });
    await expectRevert(
      this.myContract.closeOperationWithTotalExpenses(opHash, 1000, { from: other }),
      'Only whitelist addresses can call this function.',
    );
  });

  it('should remove the operation', async function checkOperationRemovalWithExpenses() {
    const opHash = await this.myContract.getOperationHash(other, 'delete', 'somma', { from: owner });
    await this.myContract.setUserOperation(other, opHash, { from: owner, value: 1000 });
    await this.myContract.closeOperationWithTotalExpenses(opHash, 100, { from: owner });
    await expectRevert(
      this.myContract.closeOperationWithTotalExpenses(opHash, 1000, { from: owner }),
      'the operation hash specified no longer exist',
    );
  });

  it('should remove the operation and refund the user for the extra money he paid beforehand', async function checkOperationRemovalAndRefund() {
    const opHash = await this.myContract.getOperationHash(other, 'delete', 'somma', { from: owner });
    await this.myContract.setUserOperation(other, opHash, { from: owner, value: 1000 });
    const tracker = await balance.tracker(other);
    await tracker.get();
    await this.myContract.closeOperationWithTotalExpenses(opHash, 100, { from: owner });
    expect((await tracker.delta()).toString()).equal((new BN('900')).toString());
  });

  it('should revert because dev has no permission to close an operation', async function checkNoPermissionToCloseOperation() {
    const opHash = await this.myContract.getOperationHash(other, 'delete', 'somma', { from: owner });
    await this.myContract.setUserOperation(other, opHash, { from: owner, value: 1000 });
    await expectRevert(
      this.myContract.closeOperation(opHash, { from: other }),
      'Only whitelist addresses can call this function.',
    );
  });

  it('should remove the operation', async function checkOperationRemoval() {
    const opHash = await this.myContract.getOperationHash(other, 'delete', 'somma', { from: owner });
    await this.myContract.setUserOperation(other, opHash, { from: owner, value: 1000 });
    await this.myContract.closeOperation(opHash, { from: owner });
    await expectRevert(
      this.myContract.closeOperation(opHash, { from: owner }),
      'the operation hash specified no longer exist',
    );
  });

  it('should remove the operation and pay the contract for the overall operation', async function checkOperationRemovalAndPayCommissions() {
    const opHash = await this.myContract.getOperationHash(other, 'delete', 'somma', { from: owner });
    await this.myContract.setUserOperation(other, opHash, { from: owner, value: 1000 });
    const tracker = await balance.tracker(this.myContract.address);
    await tracker.get();
    await this.myContract.closeOperation(opHash, { from: owner });
    expect((await tracker.delta()).toString()).equal((new BN('-1000').toString()));
  });

  it('should revert because dev has no permission to cancel an operation', async function checkNoPermissionToCancel() {
    const opHash = await this.myContract.getOperationHash(other, 'delete', 'somma', { from: owner });
    await this.myContract.setUserOperation(other, opHash, { from: owner, value: 1000 });
    await expectRevert(
      this.myContract.cancelOperation(opHash, { from: other }),
      'Only whitelist addresses can call this function.',
    );
  });

  it('should remove the operation', async function checkOperationRemovalFromCancel() {
    const opHash = await this.myContract.getOperationHash(other, 'delete', 'somma', { from: owner });
    await this.myContract.setUserOperation(other, opHash, { from: owner, value: 1000 });
    await this.myContract.cancelOperation(opHash, { from: owner });
    await expectRevert(
      this.myContract.cancelOperation(opHash, { from: owner }),
      'the operation hash specified no longer exist',
    );
  });

  it('should remove the operation and refund the user for the money paid', async function checkOperationRemocalAndRefund() {
    const opHash = await this.myContract.getOperationHash(other, 'delete', 'somma', { from: owner });
    await this.myContract.setUserOperation(other, opHash, { from: owner, value: 1000 });
    const tracker = await balance.tracker(other);
    await tracker.get();
    await this.myContract.cancelOperation(opHash, { from: owner });
    expect((await tracker.delta()).toString()).equal((new BN('1000')).toString());
  });

  it('should revert because dev has no permission to pay commissions', async function checkNoPermissionToPayCommissions() {
    await expectRevert(
      this.myContract.payCommissions(other, 1000, { from: other }),
      'Only whitelist addresses can call this function.',
    );
  });

  it('should pay commissions and addebit the contract for the money sent', async function checkPayCommissions() {
    const opHash = await this.myContract.getOperationHash(other, 'delete', 'somma', { from: owner });
    await this.myContract.setUserOperation(other, opHash, { from: owner, value: 1000 });
    const tracker = await balance.tracker(this.myContract.address);
    await tracker.get();
    await this.myContract.payCommissions(other, 1000, { from: owner });
    expect((await tracker.delta()).toString()).equal((new BN('-1000').toString()));
  });

  it('should pay commissions and accredit the receiver for the money sent', async function checkPayCommissionsToDev() {
    const opHash = await this.myContract.getOperationHash(other, 'delete', 'somma', { from: owner });
    await this.myContract.setUserOperation(other, opHash, { from: owner, value: 1000 });
    const tracker = await balance.tracker(other);
    await tracker.get();
    await this.myContract.payCommissions(other, 1000, { from: owner });
    expect((await tracker.delta()).toString()).equal((new BN('1000')).toString());
  });
});
