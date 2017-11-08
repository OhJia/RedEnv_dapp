Eutil = require('ethereumjs-util');
RedEnvelope = artifacts.require("./RedEnvelope.sol");

module.exports = function(callback) {
	//current_time = Math.round(new Date() / 1000);
	//amt_1 = web3.toWei(1, 'ether');
	RedEnvelope.deployed().then(function(i) {i.getEnvelopeInfo.call('0xb4f86117c8af767805a125b692a60a3445005a2ea8ccb5db80dd1d7cfef5c30a').then(function(f) {console.log(f)})});	
	//RedEnvelope.deployed().then(function(i) {i.envelopeHash.call().then(function(f){console.log(f)})});
}