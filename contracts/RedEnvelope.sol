pragma solidity ^0.4.13;

contract RedEnvelope {

	struct Envelope {
		uint id;
		bytes32 link;
        address creatorAddress; 
        uint startTime;
        uint initialBalance; 
        uint remainingBalance;    
        mapping (address => uint) claims; 
    }

    mapping (bytes32 => Envelope) envelopes;

    uint public envelopeIndex; 

	function RedEnvelope() public {
		envelopeIndex = 0;
	}

	function buyEnvelope(uint _startTime) payable public returns (bytes32, bytes32, bytes32, address, uint) {
		
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
        	msg.value
		);

		envelopes[envLink] = env;

        return (nonce, envLink, envelopes[envLink].link, envelopes[envLink].creatorAddress, envelopes[envLink].initialBalance);
    }

	function getEnvelopeInfo(bytes32 _envelopeLink) public returns (uint, address, uint, uint, uint) {
		Envelope memory env = envelopes[_envelopeLink];
    
    	return (envelopes[_envelopeLink].id, envelopes[_envelopeLink].creatorAddress, envelopes[_envelopeLink].startTime, envelopes[_envelopeLink].initialBalance, envelopes[_envelopeLink].remainingBalance);
	}

	function getRemainingBalance(bytes32 _envelopeLink) public returns (uint) {
		Envelope memory env = envelopes[_envelopeLink];

		return env.remainingBalance;
	}

	function claim(bytes32 _envelopeLink) public {
		Envelope storage env = envelopes[_envelopeLink];

		require (env.remainingBalance > 0);
		uint claimAmount = generateClaimAmount(env.remainingBalance);
		env.remainingBalance -= claimAmount;

		env.claims[msg.sender] = claimAmount;

		msg.sender.transfer(claimAmount);
	}

	function generateClaimAmount(uint _remainingBalance) private constant returns (uint) {
		uint amount = uint(sha3(block.timestamp))%(0+_remainingBalance)-0;
		return amount;
	}

}
