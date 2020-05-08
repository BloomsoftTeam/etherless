pragma solidity 0.5.16;

import "./etherlessStorage.sol";

contract DeployContract is Initializable, Ownable {

    EtherlessStorageInterface private etherlessStorage;

    event uploadToken(string token, bytes32 operationHash);
    event requestUpload(bytes32 operationHash);
    event deployFailure(bytes32 operationHash);
    event deploySuccess(bytes32 operationHash);

    function initialize(address _sender) public initializer {
        Ownable.initialize(_sender);
    }

    function setStorage(address _storage) public onlyOwner {
      etherlessStorage = EtherlessStorageInterface(_storage);
    }

    function getDeployFee() public view returns (uint) {
      return etherlessStorage.getDeployFee();
    }

    function deploy(string calldata _token, string calldata _funcName) payable external returns (bytes32) {
        require(msg.value == etherlessStorage.getDeployFee(), "Error: the value (ETH) you sent is inappropriate to deploy");
        require(etherlessStorage.hasFuncPermission(_funcName, msg.sender), "you dont have permission to deploy or overwrite this function");

        etherlessStorage.addFuncOwnership(_funcName, msg.sender);

        bytes32 operationHash = etherlessStorage.getOperationHash(uint16(msg.sender), "deploy", _funcName);
        etherlessStorage.setUserOperation.value(msg.value)(msg.sender, operationHash);
        emit uploadToken(_token, operationHash);
        return operationHash;
    }
    
    function sendRequestUpload(bytes32 _operationHash) external onlyOwner {
        emit requestUpload(_operationHash);
    }
    
    function terminateDeploy(string calldata _funcName, address devAddress, uint funcPrice, bytes32 _operationHash) external onlyOwner {
      etherlessStorage.addFunc(_funcName, "available", devAddress, funcPrice);
      etherlessStorage.closeOperation(_operationHash);
      emit deploySuccess(_operationHash);
    }

    function refundDeploy(string calldata _funcName, bytes32 _operationHash) external onlyOwner {
      etherlessStorage.removeFuncOwnership(_funcName);
      etherlessStorage.cancelOperation(_operationHash);
      emit deployFailure(_operationHash);
    }
    
}