// SPDX-License-Identifier: MIT

pragma solidity ^0.5.16;

import "./PoliToken.sol";
import "./usingProvable.sol";
import "./SafeMath.sol";
import "./Fixidity.sol";


interface DaiToken {
    function transfer(address dst, uint wad) external returns (bool);
    function transferFrom(address src, address dst, uint wad) external returns (bool);
    function balanceOf(address guy) external view returns (uint);
}

contract PoliTokenFund is usingOraclize {
	// Conditioners
	using SafeMath for uint;
	using FixidityLib for int;


	// Storage
	address admin;

	DaiToken public daiToken; // to interact with DAI token contract, using the interface above
	PoliToken public tokenContract;
	uint public tokenPrice; // price 'p' at which polis can be redeemed for DAI (DAI/poli); each period, this price grows with the lastGrowthRate 'd' like this: p[t1] = p[t0] * (1 + d[t1]/12)
	uint public tokensIssued;

	int public lastPublicOutcome = int(1).newFixed(); // value to be used to calculate the growth of poli holder funds
	int public lastGrowthRate = int(4).newFixed().divide(int(100).newFixed()); // DAI rate (annualized) in 10^24, to compound per issued poli monthly (translates to 0.04, initially)
	uint public lastGrowthTime = now;
	uint public capitalizationRatio = uint(int(1).newFixed()); // the degree to which this contract is funded; 1*10^24 == 100% funded


	// Transaction Events
	event Sell(address _buyer, uint _amount);
  	event Paid(address indexed _from, uint _value);


	// Provable Events
	event NewProvableQuery(string _description);
	event NewPublicOutcome(string _outcome);


	// Constructor
	constructor(DaiToken _daiContract, PoliToken _tokenContract, int _tokenPrice) public {
		// initialize properties
		admin = msg.sender;
		//OAR = OraclizeAddrResolverI(0x6f485C8BF6fc43eA212E93BBF8ce046C7f1cb475); // used in local testing: instantiated after successfully configuring the Ethereum bridge
		tokenContract = _tokenContract;
		tokenPrice = uint(_tokenPrice.newFixed());
		daiToken = DaiToken(_daiContract); // to enable purchases and sales in DAI; this address is the Ethereum Mainnet MCD-DAI contract address
	}


	/// @notice Any funds sent to this function will be unrecoverable
	function () external payable {
	    emit Paid(msg.sender, msg.value);
	}


	// Transaction Methods
  	function buyTokens(uint _poliAmount) external returns (bool success) {
		uint _daiAmount = toDAI(_poliAmount);

		// ensure that sale takes place within the purchase/sale window: within 3 days following a priceUpdate (259,200 seconds)
		require(diffDays(lastGrowthTime, now) <= 3);

		// ensure that poliFund has the required balance to transfer to buyer
	    require(tokenContract.balanceOf(address(this)) >= _poliAmount);
		
		// execute the purchase
		require(daiToken.transferFrom(msg.sender, address(this), _daiAmount));
		require(tokenContract.transfer(msg.sender, _poliAmount));

	    tokensIssued += _poliAmount;

		emit Sell(msg.sender, _poliAmount);
		return true;
	}

	function sellTokens(uint _poliAmount) external returns (bool success) {
		uint _daiAmount = toDAI(_poliAmount);

		// ensure that sale takes place within the purchase/sale window: within 3 days following a priceUpdate
		require(diffDays(lastGrowthTime, now) <= 3);

		// ensure that poliFund has the required balance to transfer to buyer
		require(daiToken.balanceOf(address(this)) >= _daiAmount);

		// execute the sale - paying the seller first
		require(tokenContract.transferFrom(msg.sender, address(this), _poliAmount));
		require(daiToken.transfer(msg.sender, _daiAmount));

		tokensIssued -= _poliAmount;

		emit Sell(address(this), _poliAmount);
		return true;
	}


	// Exchange Rate Methods
	function accrueGrowth() public returns (bool success) {
		// permit only the admin to cause the poli to accrue growth
		require(msg.sender == admin);

		// make a usingProvable call to the given public outcome (e.g., global temperatures)
		updatePublicOutcome();

		return true;
	}

	function updatePublicOutcome() private {
		if (oraclize_getPrice("URL") > address(this).balance) {
            emit NewProvableQuery("Provable query was NOT sent, please add some ETH to cover for the query fee");
        } else {
            // calculate query month string
            string memory _queryIndex = getOracleQueryIndex();

        	// fire off oracle query - good only through 2020
            string memory _jsonQueryStr = append("xml(https://www.ncdc.noaa.gov/cag/global/time-series/globe/land_ocean/all/12/1880-2020/data.xml).dataCollection.data.", _queryIndex, ".value");
       		oraclize_query("URL", _jsonQueryStr);
       		emit NewProvableQuery("Provable query was sent, standing by for the answer..");
        }
	}

	// __callback is called only in updatePublicOutcome(), which itself is only called by accrueGrowth()
	function __callback(bytes32 _queryId, string memory _result) public {
		require(msg.sender == oraclize_cbAddress());
		emit NewPublicOutcome(_result);

		// parse lastPublicOutcome
		lastPublicOutcome = parseSignedInt(_result, 2);

		// calculate the last growth rate
		lastGrowthRate = calculateLastGrowthRate();

		// update poli price
		tokenPrice = updatePrice();

		// update last growth date
		lastGrowthTime = now;
		
		// update capitalizationRatio
		capitalizationRatio = updateCapitalizationRatio();
	}


	// Exchange Rate Helpers
	function toDAI(uint _poliAmount) internal view returns (uint dai) {
	    int _dai = ((int(_poliAmount).newFixed()).multiply(int(tokenPrice))).convertFixed(24, 18); // Poli prices are stored in 24 digits; DAI has 18 digits
	    return uint(_dai);
	}

	function calculateLastGrowthRate() internal view returns (int rate) {
  		// annualized growth rate per poli
  		// r = (20% - 16% * [anomaly in global average surface temperature in degrees Celsius])
  		int _yIntercept = int(20).newFixed().divide(int(100).newFixed());
  		int _slope = int(16).newFixed().divide(int(100).newFixed());
  		int _rate = _yIntercept.subtract(lastPublicOutcome.multiply(_slope));
  		return _rate;
  	}

  	function updatePrice() internal view returns (uint price) {
  		int _price = int(tokenPrice).multiply((lastGrowthRate.divide((int(12).newFixed())).add(1000000000000000000000000)));
  		return uint(_price);
  	}

  	function updateCapitalizationRatio() internal view returns (uint ratio) {
  		int _liabilities = int(tokenPrice).multiply(int(tokenContract.totalSupply().sub(tokenContract.balanceOf(address(this))).sub(tokenContract.balanceOf(admin))).newFixed()); // in DAI
  		if (_liabilities == 0) return 1000000000000000000000000; // if no liabilities, return "100%"

  		int _assets = int(daiToken.balanceOf(address(this))).newFixed(); // in DAI
  		int _ratio = _assets.divide(_liabilities);
  		return uint(_ratio);
  	}


  	// Other Helpers
  	function append(string memory a, string memory b, string memory c) internal pure returns (string memory d) {
    	return string(abi.encodePacked(a, b, c));
	}

	function getOracleQueryIndex() internal view returns (string memory query) {
		uint _firstUpdateIndex = 1683; // index number corresponding to the May 12th, 11:00am EDT release of the monthly NOAA data
		uint _firstUpdateDateTime = 1589295600; // unix timestamp corresponding to the May 12th, 11:00am EDT release of the monthly NOAA data
		uint _daysSinceFirstUpdate = diffDays(_firstUpdateDateTime, now);
		uint _roundedMonthsSinceFirstUpdate = uint(_daysSinceFirstUpdate) / 30; // casting explicitly as uint here gives the floor of the quotient using integer division
		uint _queryIndex = _firstUpdateIndex + _roundedMonthsSinceFirstUpdate; // this should increment by 1 each month, starting after the May 12, 2020 release, which itself corresponds to "1683"
		string memory _queryIndexStr = uint2str(_queryIndex);
		return _queryIndexStr;
	}

    function diffDays(uint fromTimestamp, uint toTimestamp) internal pure returns (uint _days) {
        require(fromTimestamp <= toTimestamp);
        uint _hoursPerDay = 24;
        uint _secondsPerDay = _hoursPerDay.mul(60).mul(60);
        _days = (toTimestamp.sub(fromTimestamp)) / _secondsPerDay;
    }

    function parseSignedInt(string memory _str, uint _digits) internal pure returns (int _int) {
    	string memory _unsignedStr = "";
    	uint _unsignedInt = 0;
    	int _signedInt = 0;
    	int _signedIntFixed = 0;
    	string memory _posNeg = getPosNeg(_str);
    	if (compareStrings(_posNeg, "")) {
    		_signedInt = int(parseInt(_str, _digits));
    	}
    	else {
    		_unsignedStr = substring(_str, 1, bytes(_str).length);
    		_unsignedInt = parseInt(_unsignedStr, _digits);
    		_signedInt = int(_unsignedInt).multiply(-1000000000000000000000000);
    	}
    	_signedIntFixed = (_signedInt.newFixed()).divide((int(10**_digits)).newFixed()); // turn into int 10^24, then scale for _digits, again
    	return _signedIntFixed;
    }

    function getPosNeg(string memory _str) internal pure returns (string memory sign) {
    	string memory _firstChar = substring(_str, 0, 1);
    	string memory _sign = "";
    	if (compareStrings(_firstChar, "-")) {
    		_sign = "-";
    	}
    	return _sign;
    } 

    function substring(string memory str, uint startIndex, uint endIndex) internal pure returns (string memory substr) {
	    bytes memory strBytes = bytes(str);
	    bytes memory result = new bytes(endIndex-startIndex);
	    for(uint i = startIndex; i < endIndex; i++) {
	        result[i-startIndex] = strBytes[i];
	    }
	    return string(result);
	}

	function compareStrings (string memory a, string memory b) internal pure returns (bool equivalent) {
  		return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))) );
    }
}