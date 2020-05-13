pragma solidity 0.5.16;

import "./etherlessStorage.sol";

contract DeleteContract is Initializable, Ownable {

    EtherlessStorageInterface private etherlessStorage;

    event deleteRequest(bytes32 operationHash, string funcName);
    event deleteSuccess(bytes32 operationHash);
    event deleteFailure(bytes32 operationHash);

    function initialize(address _sender) public initializer {
        Ownable.initialize(_sender);
    }

    function setStorage(address _storage) public onlyOwner {
      etherlessStorage = EtherlessStorageInterface(_storage);
    }

    function sendDeleteRequest(string calldata _funcName) external {
        require(etherlessStorage.checkFuncExistance(_funcName) && etherlessStorage.hasFuncPermission(_funcName, msg.sender), "Error: Function either doesnt exist or you dont have permissions to delete it");
        bytes32 operationHash = etherlessStorage.getOperationHash(uint16(msg.sender), "delete", _funcName);
        etherlessStorage.setUserOperation(msg.sender, operationHash);
        emit deleteRequest(operationHash, _funcName);
    }

    function sendDeleteSuccess(bytes32 _operationHash, string calldata _funcName) external onlyOwner {
        etherlessStorage.removeFunc(_funcName, msg.sender);
        etherlessStorage.closeOperation(_operationHash);
        emit deleteSuccess(_operationHash);
    }

    function sendDeleteFailure(bytes32 _operationHash) external onlyOwner {
        etherlessStorage.cancelOperation(_operationHash);
        emit deleteFailure(_operationHash);
    }

}