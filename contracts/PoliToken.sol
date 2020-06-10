// SPDX-License-Identifier: MIT

pragma solidity ^0.5.16;

import "./usingProvable.sol";
import "./SafeMath.sol";

contract PoliToken {
	// Conditioners
	using SafeMath for uint;


	// Storage
	string public name = "CoolToken";
	string public symbol = "COOL";
	string	public standard = "CoolToken v1.0";
	uint public totalSupply; // number of tokens
	mapping(address => uint) public balanceOf; // _owner => _balance
	mapping(address => mapping(address => uint)) public allowance; // _owner => [_spender => _value]

	address[] private holderList; // enables accessing poliHolder balances, by iterating over this list of poliHolders.
	mapping(address => uint) public holderPointers; // poliHolderAddrs => listPointers
	// https://ethereum.stackexchange.com/questions/13167/are-there-well-solved-and-simple-storage-patterns-for-solidity


	// ERC20 Events
	event Transfer(
		address indexed _from,
		address indexed _to,
		uint _value
	);

	event Approval(
		address indexed _owner,
		address indexed _spender,
		uint _value
	);


	// Constructor
	constructor(uint _initialSupply) public {
		totalSupply = _initialSupply;
		balanceOf[msg.sender] = _initialSupply; // all tokens initially go to the creator of the poli
	}


	// ERC20 Transfer
	function transfer(address _to, uint _value) public returns (bool success) {
		// trigger exception if the sender doesn't have enough
		require(balanceOf[msg.sender] >= _value);

		// change balances
		balanceOf[msg.sender] -= _value;
		balanceOf[_to] += _value;

		// announce
		emit Transfer(msg.sender, _to, _value);

		// update current holder data
		updateTransactionHolders(msg.sender, _to);

		return true;
	}


	// ERC-20 Delegated Transfer
	function approve(address _spender, uint _value) public returns (bool success) {
		allowance[msg.sender][_spender] = _value;
		emit Approval(msg.sender, _spender, _value);
		return true;
	}

	function transferFrom(address _from, address _to, uint _value) public returns (bool success) {
		// require that _from has enough tokens and allowance is big enough
		require(_value <= balanceOf[_from]);
		require(_value <= allowance[_from][msg.sender]);

		// change the balance and update the allowance
		balanceOf[_from] -= _value;
		balanceOf[_to] += _value;
		allowance[_from][msg.sender] -= _value;

		// announce
		emit Transfer(_from, _to, _value);

		// update current holder data
		updateTransactionHolders(_from, _to);

		return true;
	}


	// Holder Helpers
  	function isHolder(address _holderAddress) public view returns(bool isIndeed) {
    	if(holderList.length == 0) return false;
    	return (holderList[holderPointers[_holderAddress]] == _holderAddress);
  	}

  	function getHolderCount() public view returns(uint holderCount) {
    	return holderList.length;
  	}

  	function newHolder(address _holderAddress) private returns(bool success) {
    	require(!isHolder(_holderAddress));
    	holderPointers[_holderAddress] = holderList.push(_holderAddress).sub(1);
    	return true;
  	}

  	function deleteHolder(address _holderAddress) private returns(bool success) {
    	require(isHolder(_holderAddress));
    	uint rowToDelete = holderPointers[_holderAddress];
    	address keyToMove   = holderList[holderList.length.sub(1)];
    	holderList[rowToDelete] = keyToMove;
    	holderPointers[keyToMove] = rowToDelete;
    	holderList.length.sub(1);
    	return true;
  	}

  	function updateTransactionHolders(address _sender, address _receiver) private returns(bool success) {
  		if (balanceOf[_sender] == 0) deleteHolder(_sender); // deleteHolder _sender if _sender now has a 0 balance
		if (!isHolder(_receiver)) newHolder(_receiver); // make _receiver a newHolder, if not already
		return true;
  	}

}