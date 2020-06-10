const PoliToken = artifacts.require("PoliToken");
const PoliTokenFund = artifacts.require("PoliTokenFund");
const Fixidity = artifacts.require("FixidityLib");
const DaiAddress = "0x6b175474e89094c44da98b954eedeac495271d0f"; // mainnet address
//const DaiAddress = "0x2D69aD895797C880abce92437788047BA0Eb7fF6"; // ropsten address
//const DaiToken = artifacts.require("Dai");
//const chainId = await web3.eth.getChainId();

module.exports = function(deployer) {
deployer.deploy(Fixidity).then(function() {
  	return deployer.deploy(PoliToken, 1000).then(function() {
  		deployer.link(Fixidity, [PoliTokenFund]);
  		var tokenPrice = 1; // 1 DAI, which will be converted into 24-decimal representation upon PoliToken creation, per Fixidity specs
  		return deployer.deploy(PoliTokenFund, DaiAddress, PoliToken.address, tokenPrice);
  		});
  	});
};

/* Deploying own Dai contract first for local and public testnet development purposes.
module.exports = function(deployer) {
  
  deployer.deploy(DaiToken, 1337).then(function() {
  	return deployer.deploy(Fixidity).then(function() {
  		return deployer.deploy(PoliToken, 1000).then(function() {
  			deployer.link(Fixidity, [PoliTokenFund]);
  			var tokenPrice = 1; // 1 DAI, which will be converted into 24-decimal representation, per the Fixidity specs
  			return deployer.deploy(PoliTokenFund, DaiToken.address, PoliToken.address, tokenPrice);
  		});
  	});
  });
};
*/