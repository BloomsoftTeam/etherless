pragma solidity 0.5.16;

contract EtherlessStorageInterface {
  function getDeployFee() external pure returns (uint);
  function setWhitelistAddress(address sender) external;
  function hasFuncPermission(string calldata _funcName, address _devAddress) external view returns(bool);
  function removeFuncOwnership(string calldata _funcName) external;
  function addFuncOwnership(string calldata _funcName, address _owner) external;
  function getFuncPrice(string calldata _funcName) external view returns (uint);
  function checkFuncExistance(string calldata _funcName) external view returns (bool);
  function checkFuncAvailability(string calldata _funcName) external view returns (bool);
  function addFunc(string calldata _funcName, string calldata _availability, address _devAddress, uint _funcPrice) external;
  function removeFunc(string calldata _funcName, address _devAddress) external;
  function markHidden(string calldata _funcName) external;
  function getOperationHash(uint16 _sender, string calldata _operationType, string calldata _funcName) external view returns (bytes32);
  function setUserOperation(address _userAddress, bytes32 _operationHash) external payable;
  function closeOperationWithTotalExpenses(bytes32 _operationHash, uint _totalExpenses) external;
  function closeOperation(bytes32 _operationHash) external;
  function cancelOperation(bytes32 _operationHash) external;
  function payCommissions(address _receiver, uint _amount) external;
}



    