Eutil = require('ethereumjs-util');
RedEnvelope = artifacts.require("./RedEnvelope.sol");

module.exports = function(callback) {
	//current_time = Math.round(new Date() / 1000);
	amt_1 = web3.toWei(1, 'ether');
	RedEnvelope.deployed().then(function(i) {i.buyEnvelope('testingtesting', {from: web3.eth.accounts[0], value: amt_1}).then(function(f) {console.log(f)})});
	RedEnvelope.deployed().then(function(i) {i.buyEnvelope('passcode', {from: web3.eth.accounts[0], value: amt_1}).then(function(f) {console.log(f)})});
	RedEnvelope.deployed().then(function(i) {i.buyEnvelope('testpasscode', {from: web3.eth.accounts[0], value: amt_1}).then(function(f) {console.log(f)})});	
	RedEnvelope.deployed().then(function(i) {i.envelopeIndex.call().then(function(f){console.log(f)})});
}
