
const contract = require('@truffle/contract');
const Maker = require('@makerdao/dai');
const Web3Utils = require('web3-utils');
const MicroModal = require('micromodal');
//const Chart = require('chart.js');
//const tippy = require('tippy.js').default;
//const tippyCSS = require('tippy.js/dist/tippy.css');
//const material = require('tippy.js/themes/material.css');

/* --- TO DO --- ***

I. Prepare smart contract code to face the public

1. Link to Github from front end, in the 2 places noted
2. 

II. Deploy on mainnet

II. Prepare supporting material for inclusion on the site

1. Write whitepaper to link to
2. Uncomment link to whitepaper, and update link on main page of front end

*/


App = {

	daiAddress: "0x2D69aD895797C880abce92437788047BA0Eb7fF6", // on ropsten
	web3Provider: null,
	contracts: {},
	account: "0x0",
	poliBalance: 0,
	daiBalance: 0,
	loading: false,
	tokenPrice: 1000000000000000000000000, // in DAI, now, with all the 24 zeros
	tokenGrowth: 0,
	tokensIssued: 0,
	tokensAvailable: 1000,
	lastPublicOutcome: 1000000000000000000000000,
	lastGrowthTime: 0,
	fundRatio: 1000000000000000000000000,

	init: function() {
		console.log("App initialized...")
		return App.initWeb3();
	},

	initWeb3: function() {
		if(typeof web3 !== 'undefined') {
			// If a web3 instance is already provided by Meta Mask.
			App.web3Provider = web3.currentProvider;
			web3 = new Web3(web3.currentProvider);
		} else {
			// Specify default instance if no web3 instance provided
			App.web3Provider = new Web3.providers.WebsocketProvider("http://localhost:7545");
			web3 = new Web3(web3.currentProvider);
		}
		return App.initContracts();
	},

	initContracts: function() {
		$.getJSON("PoliTokenFund.json", function(poliTokenFund) {
			App.contracts.PoliTokenFund = TruffleContract(poliTokenFund);
			App.contracts.PoliTokenFund.setProvider(App.web3Provider);
			App.contracts.PoliTokenFund.deployed().then(function(poliTokenFund) {
				console.log("Poli Token Fund Address: ", poliTokenFund.address);
			});
		}).done(function() {
			$.getJSON("PoliToken.json", function(poliToken) {
				App.contracts.PoliToken = TruffleContract(poliToken);
				App.contracts.PoliToken.setProvider(App.web3Provider);
				App.contracts.PoliToken.deployed().then(function(poliToken) {
					console.log("Poli Token Address: ", poliToken.address);
				});
			});


		}).done(function() {
			
			const daiABI = [{"constant":true,"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"mint","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"}];
			App.contracts.DaiToken = contract({ abi: daiABI });
			App.contracts.DaiToken.setProvider(App.web3Provider);
			App.contracts.DaiToken.at(App.daiAddress).then(function(daiToken) {
				console.log("Dai Token Address: ", daiToken.address);
			});

			App.listenForEvents();
			return App.render();

			/* Used in local testing
			$.getJSON("Dai.json", function(daiToken) {
				App.contracts.DaiToken = TruffleContract(daiToken);
				App.contracts.DaiToken.setProvider(App.web3Provider);
				App.contracts.DaiToken.deployed().then(function(daiToken) {
					console.log("Dai Token Address: ", daiToken.address);
				});

				App.listenForEvents();
				return App.render()
			});
			*/
		});
	},

	render: function() {
		if (App.loading) {
			return
		}
		App.loading = true;

		var loader = $('#loader');
		var content = $('#content');

		loader.show()
		content.hide()

		// load account data
		web3.eth.getCoinbase(function(err, account) {
			if(err === null) {
				console.log("account", account);
				App.account = account;
				$('#accountAddress').html(account);
			}
		})

		// load token fund contract
		App.contracts.PoliTokenFund.deployed().then(function(instance) {
			poliTokenFundInstance = instance;
			return poliTokenFundInstance.tokenPrice();
		}).then(function(tokenPrice) {
			App.tokenPrice = tokenPrice;
			console.log("tokenPrice", tokenPrice);
			$('.token-price').html((App.tokenPrice / 10**24).toFixed(2));
			return poliTokenFundInstance.lastGrowthRate();
		}).then(function(tokenGrowth) {
			App.tokenGrowth = tokenGrowth;
			console.log("tokenGrowth", tokenGrowth.toString());
			$('.price-growth').html((App.tokenGrowth / 10**22).toFixed(2)); // dividing by 10^24 * 100 to get a percentage
			return poliTokenFundInstance.lastPublicOutcome();
		}).then(function(publicOutcome) {
			App.lastPublicOutcome = publicOutcome;
			console.log("publicOutcome", publicOutcome);
			$('.public-outcome').html((App.lastPublicOutcome / 10**24).toFixed(2));
			return poliTokenFundInstance.tokensIssued();
		}).then(function(tokensIssued) {
			App.tokensIssued = tokensIssued.toNumber();
			$('.tokens-sold').html(App.tokensIssued);
			$('.tokens-available').html(App.tokensAvailable);
			var progressPercent = (Math.ceil(App.tokensIssued) / App.tokensAvailable) * 100;
			$('#progress').css('width', progressPercent + '%');
			return poliTokenFundInstance.capitalizationRatio();
		}).then(function(ratio) {
			App.fundRatio = ratio;
			console.log("fundRatio", ratio);
			$('.fund-ratio').html((App.fundRatio / 10**22).toFixed()); // dividing by 10^24 * 100 to get a percentage
			return poliTokenFundInstance.lastGrowthTime();
		}).then(function(growthTime) {
			App.lastGrowthTime = growthTime;
			console.log("growthTime", growthTime);

			// load countdown timer
			App.loadCountdownTimer();

			// load token contract
			App.contracts.PoliToken.deployed().then(function(instance) {
				poliTokenInstance = instance;
				return poliTokenInstance.balanceOf(App.account);
			}).then(function(balance) {
				App.poliBalance = balance;
				$('.poli-portfolio-value').html((balance * App.tokenPrice / 10**24).toFixed(2));
				$('.poli-token-balance').html(balance.toNumber().toFixed());

				// load DAI contract
				App.contracts.DaiToken.at(App.daiAddress).then(function(daiToken) { 
					return daiToken.balanceOf(App.account);
				}).then(function(balance) {
					App.daiBalance = balance;
					console.log("daiBalance", balance);

					App.loading = false;
					loader.hide();
					content.show();

				});
			});
		});
	},

	// Load countdown timer
	loadCountdownTimer: function() {

		// parse Unix time, and get vars to determine whether we're within the exchange window or not. 
		const now = Math.floor(Date.now() / 1000); // Unix time, which is in seconds, not milliseconds
		const secondsInWindow = 3 * 24 * 60 * 60;
		const secondsUntilNextWindow = 30 * 24 * 60 * 60;

		const growthWindowClose = Number.parseInt(App.lastGrowthTime, 10) + secondsInWindow;
		const nextGrowthWindowOpen = Number.parseInt(App.lastGrowthTime, 10) + secondsUntilNextWindow;

		// presume that countdownDate is the close of the last exchange window  
		var countdownDate = new Date(growthWindowClose * 1000);
		$('.exchange-window-text').html('...until this monthly exchange window closes.');

		// if now is past the close of the last exchange window, then set countdown date to when the next window opens,
		// reset the text, and disable the buy/sell buttons
		if (now > growthWindowClose) {
			countdownDate = new Date(nextGrowthWindowOpen * 1000);
			$('.exchange-window-text').html('...until the next monthly exchange window opens.');
			$('#buyButton').prop('disabled', true);
			$('#sellButton').prop('disabled', true);
		};

		countdownDate = countdownDate.getFullYear() + "/" + (countdownDate.getMonth() + 1) + "/" + countdownDate.getDate();
		console.log(countdownDate.toString());

		// load countdown date and update header copy
		$('#clock').countdown(countdownDate.toString()).on('update.countdown', function(event) {
      		var $this = $(this).html(event.strftime(''
	        + '<div class="holder m-2" style="display: inline;"><span class="h1 display-3">%D</span> day%!d</div>'
	        + '<div class="holder m-2" style="display: inline;"><span class="h1 display-3">%H</span> hr</div>'
	        + '<div class="holder m-2" style="display: inline;"><span class="h1 display-3">%M</span> min</div>'
	        + '<div class="holder m-2" style="display: inline;"><span class="h1 display-3">%S</span> sec</div>'));
    	});
	},

	// Listen for events emitted by the contract
	listenForEvents: function() {
		App.contracts.PoliTokenFund.deployed().then(function(instance) {
			instance.contract.events.Sell({
				fromBlock: 0,
				toBlock: 'latest',
			},
			function(error, event) {
				console.log("event triggered", event);
				App.render();
			});
		});
	},

	
	// Purchase at a given price in DAI
	processSubmit: function(action) {

		console.log(action);

		App.contracts.PoliTokenFund.deployed().then(function(poliFund) {
			if (action == "buy") {
				return App.buyTokens();
			} else if (action == "sell") {
				return App.sellTokens();
			}
		});
	},
	

	// Buy tokens
	buyTokens: function() {
		const numberOfTokens = $('#numberOfTokens').val();
		const purchasePrice = numberOfTokens * App.tokenPrice / 1000000 // translating to DAI decimals: 18 instead of 24
		const purchasePriceHex = '0x' + purchasePrice.toString(16);

		// pop modal if user doesn't have the balance to buy
		if (purchasePrice > App.daiBalance) {
			$('.exchange-units').html('DAI');
			$('.exchange-action').html('buy');
			MicroModal.show('exchangeModal');
			return console.log("user doesn't have the required daiBalance");
		}

		$('#content').hide();
		$('#loader').show();

		//App.contracts.DaiToken.deployed().then(function(daiToken) { // use for testing on local network
		App.contracts.PoliTokenFund.deployed().then(function(poliFund) {
			App.contracts.DaiToken.at(App.daiAddress).then(function(daiToken) { 
				return daiToken.approve(poliFund.address, purchasePriceHex, { from: App.account });

			}).then(function(result) {
				return poliFund.buyTokens(numberOfTokens, {
					from: App.account,
					gas: 500000
				});
			});
		}).then(function(result) {
			console.log("Tokens bought...");
			// wait for Sell event

		});
	},


	// Sell tokens
	sellTokens: function() {

		var numberOfTokens = $('#numberOfTokens').val();

		// pop modal if user doesn't have the balance to sell
		if (numberOfTokens > App.poliBalance) {
			console.log("Hit 'if' condition that user doesn't have the required poliBalance");
			$('.exchange-units').html('Cool Tokens');
			$('.exchange-action').html('sell');
			MicroModal.show('exchangeModal');
			return console.log("user doesn't have the required poliBalance");
		}

		$('#content').hide();
		$('#loader').show();

		App.contracts.PoliTokenFund.deployed().then(function(poliFund) {
			
			App.contracts.PoliToken.deployed().then(function(poliToken) { // use for testing on local network
			//App.contracts.DaiToken.at(App.daiAddress).then(function(daiToken) {
				return poliToken.approve(poliFund.address, numberOfTokens, { from: App.account });


			}).then(function(result) {
				return poliFund.sellTokens(numberOfTokens, {
					from: App.account,
					gas: 500000
				});
			});
		}).then(function(result) {
			console.log("Tokens sold...");
			// wait for Sell event

		});
	},

}

$(function() {
	$(window).on('load', function() {
		App.init();
	});
});