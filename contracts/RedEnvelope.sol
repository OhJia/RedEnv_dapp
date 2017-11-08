pragma solidity ^0.4.13;

contract RedEnvelope {

	struct Envelope {
		uint id;
		bytes32 link;
		address creatorAddress; 
		uint startTime;
		uint initialBalance; 
		uint remainingBalance; 
		uint totalClaims;   
		mapping (address => uint) claims; 
	}

	mapping (uint => Envelope) envelopes;
	//mapping (address => bytes32) envHash;

	uint public envelopeIndex; 
	
	function RedEnvelope() public {
		envelopeIndex = 0;
	}

	// Create an envelope by paying ether
	// Envelope is identified from envelopes by a unique link (hash)
	function buyEnvelope(uint _startTime) payable public returns (bool) {
		
		require (msg.value > 0);

		envelopeIndex += 1;
		bytes32 nonce = bytes32(envelopeIndex);
		bytes32 envLink = sha3(nonce, msg.sender);
		

		Envelope memory env = Envelope(
			envelopeIndex,
			envLink,
        	msg.sender, 
        	_startTime,
        	msg.value, 
        	msg.value,
        	0
		);

		envelopes[envelopeIndex] = env;

    	return true;
	}

	// Get an envelope's data using the unique link
	function getEnvelopeInfo(uint _envIndex) public returns (uint, bytes32, address, uint, uint, uint) {
		Envelope memory env = envelopes[_envIndex];
    
		return (env.id, env.link, env.creatorAddress, env.startTime, env.initialBalance, env.remainingBalance);
	}

	// Get an envelope's remaining balance using the unique link
	function getRemainingBalance(uint _envelopeLink) public returns (uint) {
		Envelope memory env = envelopes[_envelopeLink];

		return env.remainingBalance;
	}

	// Claim a random fraction of the ether in the envelope
	function claim(uint _envelopeLink) public {
		Envelope storage env = envelopes[_envelopeLink];

		require (env.remainingBalance > 0);
		uint claimAmount = generateClaimAmount(env.remainingBalance);
		env.remainingBalance -= claimAmount;

		msg.sender.transfer(claimAmount);
		env.totalClaims += 1;
		env.claims[msg.sender] = claimAmount;
	}

	function totalClaims(uint _envIndex) public returns (uint) {
		Envelope memory env = envelopes[_envIndex];
		return env.totalClaims;
	}

	function generateClaimAmount(uint _remainingBalance) private constant returns (uint) {
		uint amount = uint(sha3(block.timestamp))%(0+_remainingBalance)-0;
		return amount;
	}

}
