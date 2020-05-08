pragma solidity 0.5.16;

import "./etherlessStorageInterface.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";

contract EtherlessStorage is Initializable, Ownable, EtherlessStorageInterface {

    using SafeMath for uint256;

    uint constant public DEPLOY_FEE = 0.002 ether;

    enum Availability {unassigned, available, unavailable}

    mapping (string => address) private funcOwnership;
    mapping (string => uint) private funcPrices;
    mapping (string => Availability) private funcAvailability;

    mapping (bytes32 => address) private operationUsers;
    mapping (bytes32 => uint) private operationCosts;

    mapping (address => bool) private whitelistAddresses;

    function initialize(address _sender) public initializer {
        Ownable.initialize(_sender);
    }

    modifier onlyWhitelist {
      require(
          msg.sender == owner() || whitelistAddresses[msg.sender] == true,
          "Only whitelist addresses can call this function."
      );
      _;
    }

    function _compareString(string memory _first, string memory _second) private pure returns (bool) {
      return (keccak256(abi.encodePacked(_first)) == keccak256(abi.encodePacked(_second)));
    }

    function getDeployFee() external pure returns (uint) {
      return DEPLOY_FEE;
    }

    // Private methods

    function _getAvailabilityFromString(string memory _availability) private pure returns (Availability) {
      if (_compareString(_availability, "available")) {
        return Availability.available;
      } else if (_compareString(_availability, "unavailable")) {
        return Availability.unavailable;
      }
      return Availability.unassigned;
    }

    function _getStringFromAvailability(Availability _availability) private pure returns (string memory) {
      if (Availability.available == _availability) {
        return "available";
      } else if (Availability.unavailable == _availability) {
        return "unavailable";
      }
      return "unassigned";
    }

    function _hasFuncPermission(string memory _funcName, address _devAddress) private view returns(bool) {
      return funcOwnership[_funcName] == _devAddress || _devAddress == owner() || funcOwnership[_funcName] == address(0);
    }

    function _setFuncOwnership(string memory _funcName, address _devAddress) private {
      funcOwnership[_funcName] = _devAddress;
    }

    function _getFuncOwnership(string memory _funcName) private view returns (address) {
      return funcOwnership[_funcName];
    }
    
    function _setFuncPrice(string memory _funcName, uint _fPrice) private {
        funcPrices[_funcName] = _fPrice;
    }

    function _setFuncAvailability(string memory _funcName, string memory _availability) private {
        funcAvailability[_funcName] = _getAvailabilityFromString(_availability);
    }

    function _getFuncAvailability(string memory _funcName) private view returns (string memory) {
      return _getStringFromAvailability(funcAvailability[_funcName]);
    }

    function _getOperationHash(uint16 _sender, string memory _operationType, string memory _funcName) private pure returns (bytes32) {
      return keccak256(abi.encodePacked(_sender, _operationType, _funcName));
    }

    function _getOperationCost(bytes32 _operationHash) private view returns (uint) {
      return operationCosts[_operationHash];
    }

    function _setUserOperation(address _userAddress, bytes32 _operationHash) private {
        operationUsers[_operationHash] = _userAddress;
        operationCosts[_operationHash] = msg.value;
    }

    function _removeUserOperation(bytes32 _operationHash) private {
        delete operationUsers[_operationHash];
        delete operationCosts[_operationHash];
    }

    function _checkUserOperationExistance(bytes32 _operationHash) private view returns (bool) {
      return operationUsers[_operationHash] != address(0);
    }

    function _closeOperationWithTotalExpenses(bytes32 _operationHash, uint _totalExpenses) private {

      uint refund = _getOperationCost(_operationHash).sub(_totalExpenses);

      if (refund > 0) {
        _payCommissions(operationUsers[_operationHash], refund);
        _payCommissions(owner(), _getOperationCost(_operationHash).sub(refund));
      } else {
        _payCommissions(owner(), _getOperationCost(_operationHash));
      }

      _removeUserOperation(_operationHash);
    }

    function _closeOperation(bytes32 _operationHash) private {
      _payCommissions(owner(), _getOperationCost(_operationHash));
      _removeUserOperation(_operationHash);
    }

    function _cancelOperation(bytes32 _operationHash) private {
      _payCommissions(_getOperationUser(_operationHash), _getOperationCost(_operationHash));
      _removeUserOperation(_operationHash);
    }

    function _payCommissions(address _receiver, uint _amount) private {
      (address(uint160(_receiver))).transfer(_amount);
    }

    function _getOperationUser(bytes32 _operationHash) private view returns (address) {
      return operationUsers[_operationHash];
    }

    // Public methods

    function setWhitelistAddress(address sender) external onlyOwner {
      whitelistAddresses[sender] = true;
    }

    function hasFuncPermission(string calldata _funcName, address _devAddress) external view onlyWhitelist returns(bool) {
      return _hasFuncPermission(_funcName, _devAddress);
    }

    function removeFuncOwnership(string calldata _funcName) external onlyWhitelist {
      delete funcOwnership[_funcName];
    }

    function addFuncOwnership(string calldata _funcName, address _owner) external onlyWhitelist {
      if (_getFuncOwnership(_funcName) != _owner) {
        _setFuncOwnership(_funcName, _owner);
      }
    }

    function getFuncPrice(string calldata _funcName) external view returns (uint) {
      return funcPrices[_funcName];
    }

    function checkFuncExistance(string calldata _funcName) external view returns (bool) {
      return funcOwnership[_funcName] != address(0);
    }

    function checkFuncAvailability(string calldata _funcName) external view returns (bool) {
      return _compareString(_getFuncAvailability(_funcName), "available");
    }

    function addFunc(string calldata _funcName, string calldata _availability, address _devAddress, uint _funcPrice) external onlyWhitelist {
      require(_hasFuncPermission(_funcName, _devAddress), 'dev address has no permission on the specified func');
      if (_getFuncOwnership(_funcName) != _devAddress) {
        _setFuncOwnership(_funcName, _devAddress);
      }
      _setFuncAvailability(_funcName, _availability);
      _setFuncPrice(_funcName, _funcPrice);
    }

    function removeFunc(string calldata _funcName, address _devAddress) external onlyWhitelist {
      require(_hasFuncPermission(_funcName, _devAddress), 'dev address has no permission on the specified func');
      delete funcOwnership[_funcName];
      delete funcPrices[_funcName];
      delete funcAvailability[_funcName];
    }

    function markHidden(string calldata _funcName) external onlyWhitelist {
      _setFuncAvailability(_funcName, "unavailable");
    }

    function getOperationHash(uint16 _sender, string calldata _operationType, string calldata _funcName) external view onlyWhitelist returns (bytes32) {
      return _getOperationHash(_sender, _operationType, _funcName);
    }

    function setUserOperation(address _userAddress, bytes32 _operationHash) external payable onlyWhitelist {
      _setUserOperation(_userAddress, _operationHash);
    }

    function closeOperationWithTotalExpenses(bytes32 _operationHash, uint _totalExpenses) external onlyWhitelist {
      require(_checkUserOperationExistance(_operationHash), 'the operation hash specified no longer exist');
      _closeOperationWithTotalExpenses(_operationHash, _totalExpenses);
    }

    function closeOperation(bytes32 _operationHash) external onlyWhitelist {
      require(_checkUserOperationExistance(_operationHash), 'the operation hash specified no longer exist');
      _closeOperation(_operationHash);
    }

    function cancelOperation(bytes32 _operationHash) external onlyWhitelist {
      require(_checkUserOperationExistance(_operationHash), 'the operation hash specified no longer exist');
      _cancelOperation(_operationHash);  
    }

    function payCommissions(address _receiver, uint _amount) external onlyWhitelist {
      _payCommissions(_receiver, _amount);
    }

}