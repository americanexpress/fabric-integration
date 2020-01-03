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
import Contract from '../../../app/Contract';
import Network from '../../../app/Network';
import FabricClient from 'fabric-client';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import FabricClientLegacy from 'fabric-client-legacy';
const Channel = require('fabric-client-legacy/lib/Channel');
const TransactionID = require('fabric-client-legacy/lib/TransactionID');
const EventHub = require('fabric-client-legacy/lib/ChannelEventHub');
import * as sinon from 'sinon';
import * as chai from 'chai';
import ChaincodeHandler from '../../../app/helpers/ChaincodeHandler';
const { expect } = chai;
chai.use(require('chai-as-promised'));

// test chaincode path

const chaincodeZipPath = path.join(__dirname, '../../chaincode/chaincode_example02.zip');
const chaincodecdsPath = path.join(__dirname, '../../chaincode/chaincode_example02@1.0.0.cds');

describe('ChaincodeHandler', () => {
  const expectedResult = Buffer.from('42');
  const fakeProposal = { proposal: 'all good' };
  const fakeHeader = { header: 'fakeuu' };
  let mockPeer: any;
  let mockPeerLegacy: any;
  let mockPeerList: any;
  let stubClient: any;
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

  let stubContract: any;
  let channel: any;
  let chaincodeHandler:ChaincodeHandler;

  let transactionId: any;

  beforeEach(() => {
    mockPeerLegacy = sinon.createStubInstance(FabricClientLegacy.Peer);
    mockPeerLegacy.getName.returns('Peer1');
    mockPeerLegacy.index = 1;
    mockPeer = sinon.createStubInstance(FabricClient.Peer);
    mockPeer.getName.returns('Peer2');
    mockPeer.index = 1;
    mockPeerList = [mockPeer];
    stubContract = sinon.createStubInstance(Contract);
    stubClient = sinon.createStubInstance(FabricClient);
    transactionId = sinon.createStubInstance(TransactionID);
    transactionId.getTransactionID.returns('TRANSACTION_ID');
    stubContract.createTransactionID.returns(transactionId);
    stubClient.newTransactionID.returns(transactionId);
    const network = sinon.createStubInstance(Network);
    stubContract.getNetwork.returns(network);

    channel = sinon.createStubInstance(Channel);
    channel.getChannelEventHubsForOrg.returns([]);
    channel.sendTransactionProposal.resolves(validProposalResponses);
    channel.sendInstantiateProposal.resolves(validProposalResponses);
    channel.sendUpgradeProposal.resolves(validProposalResponses);
    channel.sendTransaction.resolves({ status: 'SUCCESS' });
    network.getChannel.returns(channel);

    stubContract.getChaincodeId.returns('chaincode-id');

    chaincodeHandler = new ChaincodeHandler(mockPeerList);
  });
  afterEach(() => {
    sinon.restore();
  });

  describe('#installContract', function exec() {
    this.timeout(30000);
    it('should succeed for validProposalResponses', async () => {
      const chaincodeBuffer =  fsExtra.readFileSync(chaincodeZipPath);
      stubClient.installChaincode.resolves(validProposalResponses);
      const result = await chaincodeHandler.installChaincode(
stubClient, 'chaincode_example02', chaincodeBuffer, { language:'node', version:'1.0.0', uploadType:'zip' },
      );
      expect(result.payload).to.equal('Successfully Installed chaincode');
    });
    it('should succeed for cds file with validProposalResponses', async () => {
      const chaincodeBuffer =  fsExtra.readFileSync(chaincodecdsPath);
      stubClient.installChaincode.resolves(validProposalResponses);
      const result = await chaincodeHandler.installChaincode(
stubClient, 'chaincode_example02', chaincodeBuffer, { language:'node', version:'1.0.0', uploadType:'cds' },
      );
      expect(result.payload).to.equal('Successfully Installed chaincode');
    });
    it('should fail for invalidProposalResponses', async () => {
      const chaincodeBuffer =  fsExtra.readFileSync(chaincodeZipPath);
      stubClient.installChaincode.resolves(errorProposalResponses);

      return expect(chaincodeHandler.installChaincode(
stubClient, 'chaincode_example02', chaincodeBuffer, { language:'node', version:'1.0.0', uploadType:'zip' },
)).to.be.rejected;

    });
    it('should fail for mixedProposalResponses', async () => {
      const chaincodeBuffer =  fsExtra.readFileSync(chaincodeZipPath);
      stubClient.installChaincode.resolves(mixedProposalResponses);
      return expect(chaincodeHandler.installChaincode(
stubClient, 'chaincode_example02', chaincodeBuffer, { language:'node', version:'1.0.0', uploadType:'zip' },
)).to.be.rejected;

    });
    it('should fail for error from clients installCahincode invocation', async () => {
      const chaincodeBuffer =  fsExtra.readFileSync(chaincodeZipPath);
      stubClient.installChaincode.rejects(new Error('Unable to connect'));
      return expect(chaincodeHandler.installChaincode(
stubClient, 'chaincode_example02', chaincodeBuffer, { language:'node', version:'1.0.0', uploadType:'zip' },
)).to.be.rejected;

    });
  });
  describe('#instantiateOrUpgrade', function exec() {
    this.timeout(30000);
    it('should Successfully instantiate for validProposalResponses', async () => {
      const result = await chaincodeHandler.instantiateOrUpgrade(
        'instantiate', channel, transactionId, 'chaincode_example02', { language:'node', version:'1.0.0',
          uploadType:'zip' },
        'init',
        ['a', '100', 'b', '200'],
      );
      expect(result.status).to.equal('SUCCESS');
    });
    it('should Successfully upgrade for validProposalResponses', async () => {
      const result = await chaincodeHandler.instantiateOrUpgrade(
        'upgrade', channel, transactionId, 'chaincode_example02',
        { language:'node', version:'1.0.0',
          uploadType:'zip' },
        'init',
        ['a', '100', 'b', '200'],
      );
      expect(result.status).to.equal('SUCCESS');
    });
    it('should fail for invalidProposalResponses', async () => {
      channel.sendInstantiateProposal.resolves(errorProposalResponses);
      return expect(chaincodeHandler.instantiateOrUpgrade(
'instantiate', channel, transactionId, 'chaincode_example02',
{ language:'node', version:'1.0.0', uploadType:'zip' }, 'init', ['a', '100', 'b', '200'],
      )).to.be.rejected;
    });
    it('should fail for mixedProposalResponses', async () => {
      channel.sendInstantiateProposal.resolves(mixedProposalResponses);
      return expect(chaincodeHandler.instantiateOrUpgrade(
'instantiate', channel, transactionId, 'chaincode_example02',
{ language:'node', version:'1.0.0', uploadType:'zip' }, 'init', ['a', '100', 'b', '200'],
      )).to.be.rejected;
    });
    it('should fail for error from channels sendInstantiateProposal invocation', async () => {
      channel.sendInstantiateProposal.rejects(new Error('Failed to call function'));
      return expect(chaincodeHandler.instantiateOrUpgrade(
'instantiate', channel, transactionId, 'chaincode_example02',
{ language:'node', version:'1.0.0', uploadType:'zip' }, 'init', ['a', '100', 'b', '200'],
      )).to.be.rejected;
    });
  });
});
