pragma solidity ^0.4.13;

contract RedEnvelope {

	struct Envelope {
		uint id;
		bytes32 hash;
		address creatorAddress;
		uint startTime;
		uint initialBalance;
		uint remainingBalance;
		uint totalClaims;
		mapping (address => uint) claims;
	}

	mapping (uint => Envelope) private envelopes;
	mapping (string => address) private textToAddress;

	uint public envelopeIndex; 
	
	function RedEnvelope() public {
		envelopeIndex = 0;
	}


	// Create an envelope by paying ether

	function buyEnvelope(string _password) payable public returns (bool) {
		
		require (msg.value > 0);

		envelopeIndex += 1;
		bytes32 envHash = sha3(msg.sender, _password);
		
		Envelope memory env = Envelope(
			envelopeIndex,
			envHash,
        	msg.sender, 
        	now,
        	msg.value, 
        	msg.value,
        	0,
        	false
		);

		textToAddress[_password] = msg.sender;
		envelopes[envelopeIndex] = env;

    	return true;
	}

	
	// Check passcode

	function checkPassword(string _password, uint _envelopeIndex) public returns (bool) {
		address creator = textToAddress[_password];
		bytes32 submittedHash = sha3(creator, _password);

		Envelope storage env = envelopes[_envelopeIndex];

		return submittedHash == env.hash;
	}

	function claim(string _password, uint _envelopeIndex) public {
		Envelope storage env = envelopes[_envelopeIndex];

		require (checkPassword(_password, _envelopeIndex))
		require (env.remainingBalance > 0);

		uint claimAmount = generateClaimAmount(env.remainingBalance);
		env.remainingBalance -= claimAmount;

		msg.sender.transfer(claimAmount);
		env.totalClaims += 1;
		env.claims[msg.sender] = claimAmount;
	}

	// Getters

	function getEnvelopeInfo(uint _envelopeIndex) public returns (uint, address, uint, uint, uint, uint) {
		Envelope memory env = envelopes[_envelopeIndex];
		return (env.id, env.creatorAddress, env.startTime, env.initialBalance, env.remainingBalance, env.totalClaims);
	}

	function getRemainingBalance(uint _envelopeIndex) public returns (uint) {
		Envelope memory env = envelopes[_envelopeIndex];
		return env.remainingBalance;
	}

	function totalClaims(uint _envelopeIndex) public returns (uint) {
		Envelope memory env = envelopes[_envelopeIndex];
		return env.totalClaims;
	}

	function getClaimInfo(uint _envelopeIndex, address _claimer) public returns (uint) {
		Envelope storage env = envelopes[_envelopeIndex];
		return env.claims[_claimer];
	}

	function getEnvelopeHash(uint _envelopeIndex) private returns (bytes32) {
		Envelope memory env = envelopes[_envelopeIndex];    
		return (env.hash);
	}

	// Helper

	function generateClaimAmount(uint _remainingBalance) private constant returns (uint) {
		uint amount = uint(sha3(block.timestamp))%(0+_remainingBalance)-0;
		return amount;
	}

}
