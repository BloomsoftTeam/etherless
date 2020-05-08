pragma solidity 0.5.16;

import "./etherlessStorageInterface.sol";

contract EtherlessStorageMock is EtherlessStorageInterface {

  uint constant public DEPLOY_FEE = 0.002 ether;

  function _compareString(string memory _first, string memory _second) private pure returns (bool) {
    return (keccak256(abi.encodePacked(_first)) == keccak256(abi.encodePacked(_second)));
  }

  function getDeployFee() external pure returns (uint) {
    return DEPLOY_FEE;
  }

  function setWhitelistAddress(address) external {}

  function hasFuncPermission(string calldata _funcName, address) external view returns(bool) {
    if (_compareString(_funcName, "admin")) {
      return true;
    }
    return false;
  }

  function removeFuncOwnership(string calldata) external {}
  function addFuncOwnership(string calldata, address) external {}

  function getFuncPrice(string calldata) external view returns (uint) {
    return 1000;
  }

  function checkFuncExistance(string calldata _funcName) external view returns (bool) {
    if (_compareString(_funcName, "admin") || _compareString(_funcName, "exist")) {
      return true;
    }
    return false;
  }

  function checkFuncAvailability(string calldata _funcName) external view returns (bool) {
    if (_compareString(_funcName, "admin") || _compareString(_funcName, "exist")) {
      return true;
    }
    return false;
  }

  function addFunc(string calldata, string calldata, address, uint) external {}
  function removeFunc(string calldata, address) external {}
  function markHidden(string calldata) external {}

  function getOperationHash(uint16, string calldata, string calldata) external view returns (bytes32) {
    return 0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209;
  }

  function setUserOperation(address, bytes32) external payable {}

  function closeOperationWithTotalExpenses(bytes32 _operationHash, uint) external {
    require((_operationHash == 0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209), 'the operation hash specified no longer exist');
  }
  function closeOperation(bytes32 _operationHash) external {
    require((_operationHash == 0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209), 'the operation hash specified no longer exist');
  }

  function cancelOperation(bytes32 _operationHash) external {
    require((_operationHash == 0xf56be95dc8fe51e1fdd58b1b263fe6673f428925632e04676390dbece6d9c209), 'the operation hash specified no longer exist');
  }

  function payCommissions(address, uint) external {}


    
}