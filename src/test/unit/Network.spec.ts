/**
 * Copyright 2019 American Express Travel Related Services Company, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

/* tslint:disable:variable-name */
import { expect } from 'chai';
import FabricClient from 'fabric-client';
import FabricClientLegacy from 'fabric-client-legacy';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import * as sinon from 'sinon';
import Contract from '../../app/Contract';
import Gateway from '../../app/Gateway';
import Network from '../../app/Network';
import * as types from '../../app/types';
const EventHub = require('fabric-client/lib/ChannelEventHub');
const TransactionID = require('fabric-client/lib/TransactionID');
const ClientLegacy = require('fabric-client-legacy');
const Client = require('fabric-client');

// test cryptoStore location
const storePath = path.join(__dirname, '../../../WALLET/hfc-key-store/test');

// test chaincode path

const chaincodeZipPath = path.join(__dirname, '../chaincode/chaincode_example02.zip');
// test config file without certificate authority
const configWithoutCA = path.join(
  __dirname,
  '../config/connection-profile-without-ca.json',
);

const channelName = 'mychannel';

// test user for enrollment
const identity = Math.random()
  .toString(36)
  .substring(7);

const chaincodeId = 'mycc';

describe('#Network', function exec() {
  this.timeout(10000);
  const expectedResult = Buffer.from('42');
  const fakeProposal = { proposal: 'all good' };
  const fakeHeader = { header: 'fakeuu' };
  let mockChannel: any;
  let mockChannelLegacy: any;
  let stubClient: any;
  let mockPeer: any;
  let mockPeerList: any;
  const validProposalResponse = {
    response: {
      status: 200,
      payload: expectedResult,
      peer: { url: 'grpc://fakehost:9999' },
    },
  };

  const errorResponseMessage = 'I_AM_AN_ERROR_RESPONSE';
  const errorProposalResponse = Object.assign(new Error(errorResponseMessage), {
    response: {
      status: 500,
      payload: 'error',
      peer: { url: 'grpc://fakehost:9999' },
    },
  });

  const validProposalResponses = [
    [validProposalResponse],
    fakeProposal,
    fakeHeader,
  ];
  const noProposalResponses: any[] = [[], fakeProposal, fakeHeader];
  const errorProposalResponses = [
    [errorProposalResponse],
    fakeProposal,
    fakeHeader,
  ];
  const mixedProposalResponses = [
    [validProposalResponse, errorProposalResponse],
    fakeProposal,
    fakeHeader,
  ];
  let transactionId: any;
  let stubEventHub: any;
  beforeEach(() => {
    mockPeer = sinon.createStubInstance(FabricClient.Peer);
    mockPeer.getName.returns('Peer2');
    mockPeer.index = 1;
    mockPeerList = [mockPeer];
    stubEventHub = sinon.createStubInstance(EventHub);
    stubEventHub.connect.returns(true);
    stubEventHub.disconnect.returns(true);
    stubEventHub._stubInfo = 'eventHub';
    stubEventHub.getPeerAddr.returns('eventHubAddress');
    stubEventHub.registerTxEvent.yields('txID', 'VALID', '12345');
    stubEventHub.registerChaincodeEvent.yields({ payload:'eventpayload' },
                                               '12345', 'txID', 'VALID');
    stubClient = sinon.createStubInstance(FabricClient);
    mockChannel = sinon.createStubInstance(FabricClient.Channel);
    mockChannel.getChannelEventHubsForOrg.returns([stubEventHub]);
    mockChannel.sendInstantiateProposal.resolves(validProposalResponses);
    mockChannel.sendUpgradeProposal.resolves(validProposalResponses);
    mockChannel.sendTransaction.resolves({ status: 'SUCCESS' });

    transactionId = sinon.createStubInstance(TransactionID);
    transactionId.getTransactionID.returns('TRANSACTION_ID');
    mockChannelLegacy = sinon.createStubInstance(FabricClientLegacy.Channel);

  });
  afterEach(() => {
    sinon.restore();
  });

  describe('#Initialization', () => {
    it('should return Network object', async () => {
      expect(new Network(new Gateway(), mockChannel)).to.be.an.instanceof(
        Network,
      );
    });
  });
  describe('#methods', () => {
    let network: types.Network;
    beforeEach(() => {
      network = new Network(new Gateway(), mockChannel);
    });
    afterEach(() => {
      network.dispose();
    });
    describe('#getChannel', () => {
      it('should return Legacy Channel object', async () => {
        network = new Network(new Gateway(), mockChannelLegacy);
        expect(network.getChannel()).to.be.an.instanceof(
          FabricClientLegacy.Channel,
        );
      });
      it('should return Latest Channel object', async () => {
        expect(network.getChannel()).to.be.an.instanceof(FabricClient.Channel);
      });
    });
    describe('#getContract', () => {
      it('should throw on disconnected network', async () => {
        expect(() => network.getContract('contract')).to.throw(
          /Unable to return contract/,
        );
      });
      it('should return Contract object', async () => {
        const gateway = new Gateway();
        await gateway.connect(
          configWithoutCA,
          {
            identity,
            keystore: storePath,
          },
        );
        const network = await gateway.getNetwork(channelName);
        expect(network.getContract(chaincodeId)).to.be.an.instanceof(Contract);
        gateway.disconnect();
      });
      it('should return Contract object from map', async () => {
        const gateway = new Gateway();
        await gateway.connect(
          configWithoutCA,
          {
            identity,
            keystore: storePath,
          },
        );
        const network = await gateway.getNetwork(channelName);
        let contract = network.getContract(chaincodeId);
        expect(contract).to.be.an.instanceof(Contract);
        contract = network.getContract(chaincodeId);
        expect(contract).to.be.an.instanceof(Contract);
        gateway.disconnect();
      });
    });
    describe('#_dispose', () => {
      it('should clear contracts and close channel', async () => {
        const gateway = new Gateway();
        await gateway.connect(
          configWithoutCA,
          {
            identity,
            keystore: storePath,
          },
        );
        const network = await gateway.getNetwork(channelName);
        network.getContract(chaincodeId);
        expect(network.getContract(channelName)).to.be.an.instanceof(Contract);
        network.dispose();
        expect(network.getContractMap()).to.have.lengthOf(0);
        gateway.disconnect();
      });
    });
    describe('#getPeerList', () => {
      it('should return peer list', async () => {
        const gateway = new Gateway();
        await gateway.connect(
          configWithoutCA,
          {
            identity,
            keystore: storePath,
          },
        );
        const network = await gateway.getNetwork(channelName);
        const peerList = network.getPeerList();
        expect(peerList).to.be.a('array');
        expect(peerList).to.have.lengthOf(2);
        gateway.disconnect();
      });
      it('should return peer list for Legacy Network', async () => {
        const gateway = new Gateway(true);
        await gateway.connect(
          configWithoutCA,
          {
            identity,
            keystore: storePath,
          },
        );
        const network = await gateway.getNetwork(channelName);
        const peerList = network.getPeerList();
        expect(peerList).to.be.a('array');
        expect(peerList).to.have.lengthOf(2);
        gateway.disconnect();
      });
    });
    describe('#installContract', () => {
      it('should install new contract', async () => {
        const gateway = new Gateway();
        await gateway.connect(
          configWithoutCA,
          {
            identity,
            keystore: storePath,
          },
        );
        stubClient.installChaincode.resolves(validProposalResponses);
        sinon.stub(gateway, 'getClient').returns(stubClient);
        const network = await gateway.getNetwork(channelName);
        const chaincodeBuffer =  fsExtra.readFileSync(chaincodeZipPath);
        const result = await network.installContract('chaincode_example02',
                                                     chaincodeBuffer, { language:'node', version:'1.0.0', uploadType:'zip' });
        expect(result.payload).to.equal('Successfully Installed chaincode');
        gateway.disconnect();
      });
      it('should throw error for missing uploadType', async () => {
        const gateway = new Gateway();
        await gateway.connect(
          configWithoutCA,
          {
            identity,
            keystore: storePath,
          },
        );
        stubClient.installChaincode.resolves(validProposalResponses);
        sinon.stub(gateway, 'getClient').returns(stubClient);
        const network = await gateway.getNetwork(channelName);
        const chaincodeBuffer =  fsExtra.readFileSync(chaincodeZipPath);
        expect(() => network.installContract('chaincode_example02', chaincodeBuffer,
                                             { language:'node', version:'1.0.0' })).to.throw();
      });
    });
    describe('#instantiateContract', () => {
      it('should instantiate new contract', async () => {
        const gateway = new Gateway();
        await gateway.connect(
          configWithoutCA,
          {
            identity,
            keystore: storePath,
          },
        );
        stubClient.installChaincode.resolves(validProposalResponses);
        stubClient.newTransactionID.returns(transactionId);
        sinon.stub(gateway, 'getClient').returns(stubClient);
        const network = await gateway.getNetwork(channelName);
        sinon.stub(network, 'getPeerList').returns(mockPeerList);
        sinon.stub(network, 'getChannel').returns(mockChannel);
        const result = await network.instantiateContract(
'chaincode_example02',
{ language:'node', version:'1.0.0', uploadType:'zip' }, 'init', ['a', '100', 'b', '200'],
        );
        expect(result.status).to.equal('SUCCESS');
        gateway.disconnect();
      });
      it('should upgrade  contract', async () => {
        const gateway = new Gateway();
        await gateway.connect(
          configWithoutCA,
          {
            identity,
            keystore: storePath,
          },
        );
        stubClient.installChaincode.resolves(validProposalResponses);
        stubClient.newTransactionID.returns(transactionId);
        sinon.stub(gateway, 'getClient').returns(stubClient);
        const network = await gateway.getNetwork(channelName);
        sinon.stub(network, 'getPeerList').returns(mockPeerList);
        sinon.stub(network, 'getChannel').returns(mockChannel);
        const result = await network.upgradeContract(
'chaincode_example02',
{ language:'node', version:'1.0.0', uploadType:'zip' }, 'init', ['a', '100', 'b', '200'],
        );
        expect(result.status).to.equal('SUCCESS');
        gateway.disconnect();
      });
    });
  });
});
