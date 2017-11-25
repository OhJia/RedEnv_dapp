import "../stylesheets/app.css";

import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

// Import contract artifacts and turn them into usable abstractions.
import redenvelope_artifacts from '../../build/contracts/RedEnvelope.json'

import { default as moment } from 'moment';

var RedEnvelope = contract(redenvelope_artifacts);

window.copyToClipboard = window.copyToClipboard || function(element) {
  console.log("pressed!", $(element).val());
  console.log(element);
  var $temp = $("<input>");
  $("body").append($temp);
  $temp.val($(element).val()).select();
  document.execCommand("copy");
  $temp.remove();
}
 
window.App = {
  start: function() {
    var self = this;

    RedEnvelope.setProvider(web3.currentProvider);
    console.log("App started and web3 provider set.")

    /* 
    * On create page
    */ 
    $("#create-envelope").submit(function(event) {
       const req = {
        amount: $('#amount').val(),
        passcode: $('#passcode').val(),
       };

       event.preventDefault();

       App.buyEnvelope(req);
    });

    /* 
    * On claim page
    */ 
    let claimEnvIndex;

    if ($("#claim-page").length > 0) {
      let envIndex = new URLSearchParams(window.location.search).get('env-id');
      console.log("On claim page");
      $("#passcode-not-match").hide();

      // If this is a query
      if (envIndex) { 
        claimEnvIndex = envIndex;
        checkIndex(claimEnvIndex);
      } else {
        window.location.replace("/index.html");
      }
    }

    /* 
    * Submit passcode to claim envelope
    */ 
    $("#claim-enter-passcode").submit(function(event) {
       const req = {
         claimPasscode: App.getPasscode(),
         claimIndex: claimEnvIndex
       };
       console.log(req);

       event.preventDefault();

       App.checkPasscode(req);
    });
  },

  getPasscode: function() {
    return $('#claim-passcode').val();
  },

  // Create envelope
  buyEnvelope: function(params) {
    var self = this;

    let amountToBuy = params.amount;
    let amountInWei = web3.toWei(amountToBuy, 'ether');   
    let passcode = params.passcode.toString();

    console.log("params:", params);

    //$("#buy-msg").html("Making your envelope. Please wait.");

    RedEnvelope.deployed().then(function(i) {
      i.buyEnvelope(passcode, {from: web3.eth.accounts[0], value: amountInWei}).then(function(f) {
        //$("#buy-msg").html("");
        $("#container-create").hide();
        generateEnvelopeLink();
      }).catch(function(e) {
        console.log(e);
        self.setStatus("Error sending coin; see log.");
      });
    });
  },


  // Claim

  checkPasscode: function(params) {
    var self = this;

    let passcode = params.claimPasscode;
    let index = params.claimIndex;
    console.log(passcode);
    console.log(index);

    RedEnvelope.deployed().then(function(i) {
      i.checkPasscode.call(passcode, index, {from: web3.eth.accounts[0]}).then(function(matched) {
        console.log("passcode matched: ", matched);
        if (matched) {
          $("#unlock-envelope").hide();
          $("#passcode-not-match").html("");
          renderEnvelopeToClaim(index);
          // renderClaimButton(index);
        } else {
          console.log("Passcode doesn't match. Try again.");
          $("#passcode-not-match").show();
          $("#passcode-not-match").html("Passcode doesn't match. Try again.");
        }
      }).catch(function(e) {
        console.log(e);
        self.setStatus("Error sending coin; see log.");
      });
    });
  },

  claim: function(index) {
    var self = this;
    let claimIndex = index;
    RedEnvelope.deployed().then(function(i) {
      return i.claim(App.getPasscode(), claimIndex, {from: web3.eth.accounts[0]})
    }).then(function(result) { 
          
      for (var i = 0; i < result.logs.length; i++) {
        var log = result.logs[i];
        if (log.event == "Claimed") {
          console.log("Claimed event found! ", parseInt(log.args._id), parseInt(log.args._value));
          $("#envelope-to-claim").hide();
          $("#claimed-envelope").hide();
          renderClaimedEnvelope(parseInt(log.args._id));
          $("#claim-info").html(buildClaimInfo(parseInt(log.args._value)));
        }
      }        
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error sending coin; see log.");
    });
  }

};

/***************************************************
  RENDER ENVELOPE INFO AFTER CREATE

****************************************************/
function generateEnvelopeLink() {  
  RedEnvelope.deployed().then(function(i) {
    i.envelopeIndex.call().then(function(index) {
      console.log("index is at: ", index);
      const link = "/claim.html?env-id=" + index;
      $("#envelope-link").append(buildEnvelopeLink(link));
      renderEnvelope(index);
    });
  })
}

function buildEnvelopeLink(link) {
  let node = $("<div/>");
  let node1 = $("<div/>");
  node1.addClass("col-sm-9 container-input left-align");
  node1.append("<input type='text' id='envelope-link-field' value=" + link + ">");
  let node2 = $("<div/>");
  node2.addClass("col-sm-3 container-button");
  node2.append(`<button id='copyBtn' class='btn btn-env' onclick='copyToClipboard("#envelope-link-field")'>COPY</button>`);
  node.append(node1);
  node.append(node2);
  return node;
}

function renderEnvelope(index) {
  RedEnvelope.deployed().then(function(i) {
    i.getEnvelopeInfo.call(index).then(function(p) {
      $("#envelope-info").append(buildEnvelope(p));
    });
  })
}

function buildEnvelope(env) {
  console.log(env);
  const [id, creatorAddress, startTime, initialBalance, remainingBalance] = env;
  
  let node = $("<div/>");

  let node0 = $("<div/>");
  node0.addClass("container-title");
  node0.append("<h2>Red Env #" + id + "</h2>");
  
  let node1 = $("<div/>");
  node1.addClass("left-align");
  node1.append("<p><strong>From: </strong>" + creatorAddress + "</p>");
  node1.append("<p><strong>Created at: </strong>" + moment(startTime).format('MM-DD-YYYY HH:MM:SS A') + "</p>");
  
  let node2 = $("<div/>");
  node2.addClass("envelope-info-area");
  node2.append("<p><strong>Remaining amount:</strong></p>");
  node2.append("<h2>" + remainingBalance + "ETH</h2>");
  node2.append("<p><strong>Initial amount: </strong>" + initialBalance + "ETH</p>");
  // node2.append("<p><strong># of claims: </strong>" + env[5] + "</p>");

  node.append(node0);
  node.append(node1);
  node.append(node2);
  return node;
}



/***************************************************
  RENDER ENVELOPE TO CLAIM

****************************************************/

function checkIndex(id) {
  console.log("submitted index: ", id);
  RedEnvelope.deployed().then(function(i) {
    i.envelopeIndex.call().then(function(index) {
      console.log("total envelope index: ", parseInt(index));
      if (id > parseInt(index)) {
        console.log("envelope not found");
        $("#unlock-envelope").hide();
        $("#envelope-not-found").show();
        $("#envelope-not-found").html("This envelope is not found. Try a different link.");
      } else {
        console.log("found");
        $("#envelope-not-found").hide();
        $("#claim-env-index").html(id);
        $("#unlock-envelope").show();
      }
    });
  })
}

function renderEnvelopeToClaim(index) {
  console.log("rendering claim envelope #: ", index);
  RedEnvelope.deployed().then(function(i) {
    i.getEnvelopeInfo.call(index).then(function(envelope) {
      $("#envelope-to-claim").html(buildEnvelopeToClaim(envelope));
      $("#envelope-to-claim").show();
    });
  })
}

function buildEnvelopeToClaim(env) {
  const [id, creatorAddress, startTime, initialBalance, remainingBalance, totalClaims] = env;
  let node = $("<div/>");

  let node0 = $("<div/>");
  node0.addClass("container-title");
  node0.append("<div><h2>Claim Red Env #" + id + "</h2></div>");
  node0.append("<div id='claim-button'><button id='claim' class='btn btn-env' onclick='App.claim(" + id + ")'>Claim</button></div>");

  let node1 = $("<div/>");
  node1.addClass("envelope-info-area");
  node1.append("<p><strong>Remaining amount:</strong></p>");
  node1.append("<h2>" + remainingBalance + "ETH</h2>");
  node1.append("<p><strong>Initial amount: </strong>" + initialBalance + "ETH</p>");
  node1.append("<p><strong># of claims: </strong>" + totalClaims + "</p>");

  let node2 = $("<div/>");
  node2.addClass("left-align");
  node2.append("<p><strong>From: </strong>" + creatorAddress + "</p>");
  node2.append("<p><strong>Created at: </strong>" + moment(startTime).format('MM-DD-YYYY HH:MM:SS A') + "</p>");

  node.append(node0);
  node.append(node1);
  node.append(node2);
  return node;
}


/***************************************************
  RENDER ENVELOPE INFO AFTER CLAIM

****************************************************/
// function renderClaimInfo(index, address) {
//   console.log("rendering claim info for #: ", index);
//   $("#claim-info").show();
//   RedEnvelope.deployed().then(function(i) {
//     i.getClaimInfo.call(index, address).then(function(claim) {
//       $("#claim-info").html(buildClaimInfo(claim));
//     });
//   })
// }

function buildClaimInfo(claim) {
  console.log(claim);
  let node = $("<div/>");
  node.append("<div><h2>You claimed " + claim + "</h2></div>");
  return node;
}

function renderClaimedEnvelope(index) {
  console.log("rendering claimed envelope #: ", index);
  RedEnvelope.deployed().then(function(i) {
    i.getEnvelopeInfo.call(index).then(function(envelope) {
      $("#claimed-envelope").html(buildClaimedEnvelope(envelope));
      $("#claimed-envelope").show();
    });
  })
}

function buildClaimedEnvelope(env) {
  const [id, creatorAddress, startTime, initialBalance, remainingBalance, totalClaims] = env;
  let node = $("<div/>");

  let node0 = $("<div/>");
  node0.addClass("container-title");
  node0.append("<div><h2>Claim Red Env #" + id + "</h2></div>");

  let node1 = $("<div/>");
  node1.addClass("envelope-info-area");
  node1.append("<p><strong>Remaining amount:</strong></p>");
  node1.append("<h2>" + remainingBalance + "ETH</h2>");
  node1.append("<p><strong>Initial amount: </strong>" + initialBalance + "ETH</p>");
  node1.append("<p><strong># of claims: </strong>" + totalClaims + "</p>");

  let node2 = $("<div/>");
  node2.addClass("left-align");
  node2.append("<p><strong>From: </strong>" + creatorAddress + "</p>");
  node2.append("<p><strong>Created at: </strong>" + moment(startTime).format('MM-DD-YYYY HH:MM:SS A') + "</p>");

  node.append(node0);
  node.append(node1);
  node.append(node2);
  return node;
}

/***************************************************
  ON LOAD
****************************************************/
window.addEventListener('load', function() {
  //Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }

  App.start();
});
