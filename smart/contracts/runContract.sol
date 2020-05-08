pragma solidity 0.5.16;

import "./etherlessStorage.sol";

contract RunContract is Initializable, Ownable {

    using SafeMath for uint256;

    EtherlessStorageInterface private etherlessStorage;

    event runRequest(bytes32 operationHash, string funcName, string funcParameters);
    event runResult(bytes32 operationHash, string funcResult);

    function initialize(address _sender) public initializer {
        Ownable.initialize(_sender);
    }

    function setStorage(address _storage) public onlyOwner {
      etherlessStorage = EtherlessStorageInterface(_storage);
    }

    function _compareString(string memory _first, string memory _second) private pure returns (bool) {
      return (keccak256(abi.encodePacked(_first)) == keccak256(abi.encodePacked(_second)));
    }

    function checkFuncPrice(string calldata _funcName) external view returns (uint) {
      require(etherlessStorage.checkFuncAvailability(_funcName), "the function is not available");
      return etherlessStorage.getFuncPrice(_funcName);
    }

    function sendRunRequest(string calldata _funcName, string calldata _funcParameters) external payable returns (bytes32) {
        require(etherlessStorage.checkFuncAvailability(_funcName), "the function you requested is not avaiable");
        require(msg.value == etherlessStorage.getFuncPrice(_funcName), "The value (ETH) you sent is inappropriate to run the function");

        bytes32 operationHash = etherlessStorage.getOperationHash(uint16(msg.sender), "run", _funcName);
        etherlessStorage.setUserOperation.value(msg.value)(msg.sender, operationHash);

        emit runRequest(operationHash, _funcName, _funcParameters);
        return operationHash;
    }

    function sendRunResult(string calldata _funcResult, uint _executionPrice, uint _devFee, address payable _devAddress, bytes32 _operationHash) external onlyOwner {
        etherlessStorage.payCommissions(_devAddress, _devFee);
        etherlessStorage.payCommissions(msg.sender, _executionPrice);

        uint totalExpenses = _devFee.add(_executionPrice);
        etherlessStorage.closeOperationWithTotalExpenses(_operationHash, totalExpenses);

        emit runResult(_operationHash, _funcResult);
    }

    function sendRunFailure(string calldata _funcName, bytes32 _operationHash) external onlyOwner {
      etherlessStorage.markHidden(_funcName);
      etherlessStorage.cancelOperation(_operationHash);
      emit runResult(_operationHash, "the function you executed did not stop");
    }

}