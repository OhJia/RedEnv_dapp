/* eslint-disable semi */

import '../stylesheets/app.css';

import { default as Web3 } from 'web3';
import { default as contract } from 'truffle-contract';

// Import contract artifacts and turn them into usable abstractions.
import redenvelopeArtifacts from '../../build/contracts/RedEnvelope.json';

import { default as moment } from 'moment';
import { default as BigNumber } from 'bignumber.js';

var RedEnvelope = contract(redenvelopeArtifacts);

window.App = {

  start: () => {
    RedEnvelope.setProvider(web3.currentProvider);
    console.log('App started and web3 provider set.');

    /*
    * On create page
    */
    $('#create-envelope').submit((event) => {
      const req = {
        amount: $('#amount').val(),
        passcode: $('#passcode').val()
      };

      event.preventDefault();

      App.buyEnvelope(req);
    });

    /*
    * On claim page
    */
    let claimEnvIndex;

    if ($('#claim-page').length > 0) {
      const envIndex = new URLSearchParams(window.location.search).get('env-id');
      console.log('On claim page');
      $('#passcode-not-match').hide();

      // If this is a query
      if (envIndex) {
        $('#claim-default').hide();
        $('#unlock-envelope').show();
        claimEnvIndex = envIndex;
        App.checkIndex(claimEnvIndex);
      } else {
        $('#unlock-envelope').hide();
        $('#claim-default').show();
      }
    }

    /*
    * Submit passcode to claim envelope
    */
    $('#claim-enter-passcode').submit((event) => {
      const req = {
        claimPasscode: App.getPasscode(),
        claimIndex: claimEnvIndex
      };
      console.log(req);

      event.preventDefault();

      App.checkPasscode(req);
    });
  },

  getPasscode: () => {
    return $('#claim-passcode').val();
  },

  /*
  * Create envelope
  */
  buyEnvelope: (params) => {
    const amountToBuy = params.amount;
    const amountInWei = web3.toWei(amountToBuy, 'gwei');
    const passcode = params.passcode.toString();
    RedEnvelope.deployed().then((i) => {
      $('#pending-notification').show();
      $('#pending-notification').html(`<p>Please select SUBMIT in MetaMask Notification </p><p>and wait for transaction to verify...</p>`);
      i.buyEnvelope(passcode, { from: web3.eth.accounts[0], value: amountInWei }).then((f) => {
        console.log(f);
        $('#container-create').hide();
        $('#pending-notification').hide();
        renderEnvelopeLink();
      }).catch((e) => {
        console.log(e);
        this.setStatus('Error buying envelope; see log.');
      });
    });
  },

  /*
  * Check that envelope exists,
  * check passcode,
  * and claim envelope
  */
  checkIndex: (id) => {
    RedEnvelope.deployed().then((i) => {
      i.envelopeIndex.call().then((index) => {
        console.log('total envelope index: ', parseInt(index));
        if (id > parseInt(index)) {
          console.log('envelope not found');
          $('#unlock-envelope').hide();
          $('#envelope-not-found').show();
          $('#envelope-not-found').html(buildErrorMessage());
        } else {
          console.log('found');
          $('#envelope-not-found').hide();
          $('#claim-env-index').html(id);
          $('#unlock-envelope').show();
        }
      }).catch((e) => {
        console.log(e);
        this.setStatus('Error getting envelope index; see log.');
      });
    });
  },

  checkPasscode: (params) => {
    const passcode = params.claimPasscode;
    const index = params.claimIndex;

    RedEnvelope.deployed().then((i) => {
      i.checkPasscode.call(passcode, index, { from: web3.eth.accounts[0] }).then((matched) => {
        console.log('passcode matched: ', matched);
        if (matched) {
          $('#unlock-envelope').hide();
          $('#passcode-not-match').html('');
          renderEnvelopeToClaim(index);
        } else {
          console.log(`Passcode doesn't match. Try again.'`);
          $('#passcode-not-match').show();
          $('#passcode-not-match').html(`<p>Passcode doesn't match. Try again.</p>`);
        }
      }).catch((e) => {
        console.log(e);
        this.setStatus('Error checking passcode; see log.');
      });
    });
  },

  claim: (index) => {
    let claimIndex = index;
    $('#pending-notification').show();
    $('#pending-notification').html(`<p>Please select SUBMIT in MetaMask Notification </p><p>and wait for transaction to verify...</p>`);
    RedEnvelope.deployed().then((i) => {
      return i.claim(App.getPasscode(), claimIndex, { from: web3.eth.accounts[0] })
    }).then((result) => {
      // Look for Claimed event in logs
      for (var i = 0; i < result.logs.length; i++) {
        var log = result.logs[i];
        if (log.event === 'Claimed') {
          console.log('Claimed event found! ', parseInt(log.args._id), parseInt(log.args._value));
          $('#envelope-to-claim').hide();
          $('#claimed-envelope').hide();
          $('#pending-notification').hide();
          renderClaimedEnvelope(parseInt(log.args._id));
          $('#claim-info').show();
          $('#claim-info').html(buildClaimInfo(parseInt(log.args._value), web3.eth.accounts[0]));
        }
      }
    }).catch((e) => {
      console.log(e);
      this.setStatus('Error claiming envelope; see log.');
    });
  }

};

/***************************************************
  RENDER ENVELOPE INFO AFTER CREATE
****************************************************/
function renderEnvelopeLink () {
  RedEnvelope.deployed().then((i) => {
    i.envelopeIndex.call().then((index) => {
      console.log('index is at: ', index);
      const urlPath = window.location.href.split('/').slice(0, -1).join('/');
      console.log("urlPath: ", urlPath);
      const link = `${urlPath}/claim.html?env-id=${index}`;
      $('#envelope-link').append(buildEnvelopeLink(link));
      renderEnvelopeCreated(index);
    });
  })
}

function buildEnvelopeLink (link) {
  let node = $('<div/>');

  let linkField = $('<div/>');
  linkField.addClass('row');
  let node1 = $('<div/>');
  node1.addClass('col-sm-9 container-input left-align');
  node1.append(`<input type='text' id='envelope-link-field' value=${link}>`);
  let node2 = $('<div/>');
  node2.addClass('col-sm-3 container-button');
  /* eslint-disable-next-line max-len */
  node2.append(`<button id='copyBtn' class='btn btn-env' onclick='copyToClipboard("#envelope-link-field")'>COPY</button>`);

  linkField.append(node1);
  linkField.append(node2);

  const labelText = 'Send this link to your recipients. They will also need the passcode to claim!'
  let node3 = $('<div/>');
  node3.append(`<p class='label-sub'>${labelText}</p>`);

  node.append(linkField);
  node.append(node3);
  return node;
}

function renderEnvelopeCreated (index) {
  RedEnvelope.deployed().then((i) => {
    i.getEnvelopeInfo.call(index).then((envelope) => {
      $('#envelope-info').html('');
      $('#envelope-info').html(buildEnvelope(envelope, 'create'));
    });
  })
}

/***************************************************
  RENDER ENVELOPE TO CLAIM
****************************************************/
function renderEnvelopeToClaim (index) {
  RedEnvelope.deployed().then((i) => {
    i.getEnvelopeInfo.call(index).then((envelope) => {
      $('#envelope-to-claim').html(buildEnvelope(envelope, 'claim'));
      $('#envelope-to-claim').show();
    });
  })
}

function buildErrorMessage () {
  let node = $('<div/>');
  node.addClass('container-title');
  node.append(`<h2>Uh oh. This envelope does not exist.</h2>`);
  node.append(`<p>Check your URL and paste it into the search bar.</p>`);
  node.append(`<svg id="Layer_1" data-name="Layer 1" xmlns="https://www.w3.org/2000/svg" viewBox="0 0 1476 399"><defs><style>.cls-1{fill:#d8d8d8;}.cls-2{fill:#e1e7ec;}.cls-3{fill:#eb423e;}.cls-4{fill:#fbb03b;}.cls-5{fill:#7ac943;}.cls-6{fill:#fff;}.cls-7{fill:none;stroke:#eb423e;stroke-miterlimit:10;stroke-width:5px;}</style></defs><title>sb</title><rect class="cls-1" x="18" y="15" width="1438" height="159" rx="12" ry="12"/><rect class="cls-2" x="18" y="105" width="1437" height="169"/><circle class="cls-3" cx="66" cy="61" r="18"/><circle class="cls-4" cx="116" cy="61" r="18"/><circle class="cls-5" cx="166" cy="61" r="18"/><polygon class="cls-2" points="208 115 252 41 456 41 497 112 208 115"/><rect class="cls-6" x="192" y="129" width="1138" height="90" rx="12" ry="12"/><path class="cls-7" d="M715.5,173.75c0,114.74-93,207.75-207.75,207.75"/><polygon class="cls-3" points="715.33 158 695.7 192 734.96 192 715.33 158"/></svg>`);
  return node;
}

/***************************************************
  RENDER ENVELOPE INFO AFTER CLAIM
****************************************************/
function buildClaimInfo (claim, claimer) {
  console.log(claim);
  let claimAmountEth = new BigNumber(web3.fromWei(claim, 'ether')).toFormat(8);
  let claimAmountGwei = new BigNumber(web3.fromWei(claim, 'gwei')).toFormat(2);

  let node = $('<div/>');
  node.append(`<div><h2><strong>You claimed ${claimAmountEth} ETH</strong></h2></div>`);
  node.append(`<div><p>(${claimAmountGwei} GWEI)</p></div>`);
  node.append(`<div><p><strong>Paid to: </strong>${claimer}</p></div>`);
  return node;
}

function renderClaimedEnvelope (index) {
  RedEnvelope.deployed().then((i) => {
    i.getEnvelopeInfo.call(index).then((envelope) => {
      $('#claimed-envelope').html('');
      $('#claimed-envelope').html(buildEnvelope(envelope, 'claimed'));
      $('#claimed-envelope').show();
    });
  })
}

/***************************************************
  BUILD ENVELOPE COMPONENTS
****************************************************/
function buildEnvelope (env, step) {
  console.log(env);
  const [id, creatorAddress, startTime, initialBalance, remainingBalance, totalClaims] = env;
  let remainingBalanceEth = new BigNumber(web3.fromWei(remainingBalance, 'ether')).toFormat(4);
  let remainingBalanceGwei = new BigNumber(web3.fromWei(remainingBalance, 'gwei')).toFormat(2);

  let titleText = '';
  let claimButton = '';
  let initialBalanceText = '';
  let totalClaimsText = '';
  let pendingNotification = '';
  let initialBalanceEth = null;
  let initialBalanceGwei = null;

  if (step === 'create') {
    titleText = `<h2>Envelope #${id} created</h2>`;
  } else if (step === 'claim') {
    titleText = `<h2>Claim from Envelope #${id}</h2>`;
    claimButton = `<div id='claim-button'><button id='claim' class='btn btn-env' onclick='App.claim(${id})'>Claim</button></div>`;
    pendingNotification = `<div style="display: none;" id="pending-notification" class="alert"></div>`;
  } else if (step === 'claimed') {
    titleText = `<h2>from Envelope #${id}</h2>`;
    initialBalanceEth = new BigNumber(web3.fromWei(initialBalance, 'ether')).toFormat(4);
    initialBalanceGwei = new BigNumber(web3.fromWei(initialBalance, 'gwei')).toFormat(0);
    initialBalanceText = `<p><strong>Initial balance: </strong>${initialBalanceEth} Ξ (${initialBalanceGwei} GWEI)</p>`;
    totalClaimsText = `<p><strong># of claims: </strong>${totalClaims}</p>`;
  }

  let node = $('<div/>');

  let title = $('<div/>');
  title.addClass('container-title');
  title.append(pendingNotification);
  title.append(titleText);

  let envInfo = $('<div/>');
  let epochId = Date.now();
  envInfo.addClass('envelope-info-area');
  envInfo.append(claimButton);
  envInfo.append(`<svg class="envelope-info-bg" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink" viewBox="0 0 342 183"><defs><style>.envelope-1{fill:url(#envelope-linear-gradient-${epochId});}</style><linearGradient id="envelope-linear-gradient-${epochId}" x1="171.5" y1="10" x2="171.5" y2="176.5" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f85947"/><stop offset="0.43" stop-color="#f65546"/><stop offset="0.81" stop-color="#f04b41"/><stop offset="1" stop-color="#eb423e"/></linearGradient></defs><path class="envelope-1" d="M334,111.58V22a12,12,0,0,0-12-12H21A12,12,0,0,0,9,22v88.08L170.5,176.5Z"/></svg>`);
  envInfo.append(`<div class="envelope-balance-text">${remainingBalanceEth} Ξ</div>`);
  envInfo.append(`<p><strong>${remainingBalanceGwei} GWEI</strong></p>`);

  let envDetails = $('<div/>');
  envDetails.addClass('envelope-detail-area left-align');
  envDetails.append(`<p><strong>From: </strong>${creatorAddress}</p>`);
  envDetails.append(`<p><strong>Created at: </strong>${moment(startTime * 1000).local().format("YYYY-MM-DD HH:mm:ss")}</p>`);
  envDetails.append(initialBalanceText);
  envDetails.append(totalClaimsText);

  node.append(title);
  node.append(envInfo);
  node.append(envDetails);
  return node;
}

/***************************************************
  HELPER
****************************************************/
window.copyToClipboard = (element) => {
  console.log('pressed!', $(element).val());
  var $temp = $('<input>');
  $('body').append($temp);
  $temp.val($(element).val()).select();
  document.execCommand('copy');
  $temp.remove();
}

/***************************************************
  ON LOAD
****************************************************/
window.addEventListener('load', () => {

  // Check if on mobile
  if (navigator.userAgent.match(/mobile/i)) {
    $('#content-area').hide();
    $('#content-mobile').show();
    return false;
  }

  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn(`Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) https://truffleframework.com/tutorials/truffle-and-metamask`);
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
    $('#metamask-info-area').html(buildMetamaskInfo('detected'));
  } else {
    let node = $('<div/>');
    $('#metamask-info-area').html(buildMetamaskInfo('undetected'));
    console.warn(`No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask`);
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
  }

  App.start();
});

function buildMetamaskInfo (status) {
  let node = $('<div/>');
  node.addClass('row metamask-info-content');

  if (status === 'undetected') {
    const metamaskLink = `https://metamask.io/`;
    node.append(`<div style="display: inline-block" class="metamask-title"><strong>Install Metamask to give or claim Ether</strong></div>`);
    node.append(`<button style="display: inline-block" class="btn btn-env" id="install-metamask" onclick="window.location='${metamaskLink}';">install metamask</button>`);  
  } else if (status === 'detected') {
    const address = web3.eth.accounts[0];
    let networkType = '';
    web3.version.getNetwork((error, netId) => {
      console.log('netId', netId);
      if (!error) {
        switch (netId) {
          case '1':
            networkType = 'main';
            break;
          case '2':
            networkType = 'other';
            break;
          case '3':
            networkType = 'ropsten';
            break;
          default:
            console.log('cannot detect network type');
        }
        node.append(`<div style="display: inline-block" class="metamask-title"><strong>Metamask:</strong> ${networkType} network</div>`);
        node.append(`<div style="display: inline-block" class="metamask-title"><strong>Address:</strong> ${address}</div>`);
      }
    });
  }

  return node;
}

