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
import Network from '../../app/Network';
import Gateway from '../../app/Gateway';
import Contract from '../../app/Contract';
import Transaction from '../../app/Transaction';
import * as sinon from 'sinon';
import TransactionHandler from '../../app/helpers/TransactionHandler';
import QueryHandler from '../../app/helpers/QueryHandler';
import * as hf from 'fabric-client';
const Client = require('fabric-client');
const TransactionID = require('fabric-client/lib/TransactionID');
const chaincodeId = 'mycc';
class ChannelPeer {
  constructor() {}
  getPeer() {}
}
describe('#Contract', function exec() {
  this.timeout(10000);
  let network: any;
  let mockChannel: any;
  let mockClient: any;
  let mockGateway: any;
  let mockPeer1: any;
  let contract: any;
  let mockTransactionID: any;
  let transactionHandler: any;
  beforeEach(() => {
    mockChannel = sinon.createStubInstance(hf.Channel);
    mockPeer1 = sinon.createStubInstance(hf.Peer);
    const mockPeer2: any = sinon.createStubInstance(hf.Peer);
    mockPeer1.index = 1;
    mockPeer1.getName.returns('Peer1');
    mockPeer2.index = 1;
    mockPeer2.getName.returns('Peer1');
    mockPeer1._peer = mockPeer2;
    const mockChannelPeer1: any = sinon.createStubInstance(ChannelPeer);
    mockChannelPeer1.getPeer.returns(mockPeer1);
    const mockChannelPeer2: any = sinon.createStubInstance(ChannelPeer);
    mockChannelPeer2.getPeer.returns(mockPeer2);
    mockChannel.getPeersForOrg.returns([mockPeer1]);
    mockChannel.getPeers.returns([mockChannelPeer1, mockChannelPeer2]);
    mockClient = sinon.createStubInstance(Client);
    mockClient.getPeersForOrgOnChannel.returns([]);
    mockGateway = sinon.createStubInstance(Gateway);
    mockGateway.getClient.returns(mockClient);
    mockGateway.getCurrentIdentity.returns(JSON.stringify({ mspid: 'org1' }));
    network = new Network(mockGateway, mockChannel);

    mockTransactionID = sinon.createStubInstance(TransactionID);
    mockTransactionID.getTransactionID.returns('XYXYXYXYYXYX');
    mockClient.newTransactionID.returns(mockTransactionID);
    mockChannel.getName.returns('mychaincode');

    contract = new Contract(network, chaincodeId, mockGateway);
    transactionHandler = new TransactionHandler();
  });

  afterEach(() => {
    sinon.restore();
  });
  describe('#Initialization', () => {
    it('should return Contract object', async () => {
      expect(contract).to.be.instanceof(Contract);
    });
  });
  describe('#methods', () => {
    describe('#getNetwork', () => {
      it('should return a Network', () => {
        const result = contract.getNetwork();
        expect(result).to.be.an.instanceOf(Network);
      });
    });
    describe('#createTransactionID', () => {
      it('should return TransactionID', () => {
        const result = contract.createTransactionID();
        expect(result).to.be.an.instanceOf(TransactionID);
      });
    });
    describe('#getChaincodeId', () => {
      it('returns the chaincode ID', () => {
        const result = contract.getChaincodeId();
        expect(result).to.be.equal(chaincodeId);
      });
    });
    describe('#createTransaction', () => {
      it('returns a transaction with only a name', () => {
        const name = 'name';
        const result = contract.createTransaction(name);
        expect(result.getName()).to.be.equal(name);
      });

      it('throws if name is an empty string', () => {
        expect(() => contract.createTransaction('')).to.throw('name');
      });
    });
    describe('#submitTransaction', () => {
      it('submits a transaction with supplied arguments', async () => {
        const args = ['a', 'b', 'c'];
        const expected = Buffer.from('result');
        const stubTransaction = sinon.createStubInstance(Transaction);
        stubTransaction.submit.withArgs(...args).resolves(expected);
        sinon.stub(contract, 'createTransaction').returns(stubTransaction);

        const result = await contract.submitTransaction('name', ...args);
        expect(result).to.be.equal(expected);
      });
    });
    describe('#evaluateTransaction', () => {
      it('evaluates a transaction with supplied arguments', async () => {
        const args = ['a', 'b', 'c'];
        const expected = Buffer.from('result');
        const stubTransaction = sinon.createStubInstance(Transaction);
        stubTransaction.evaluate.withArgs(...args).resolves(expected);
        sinon.stub(contract, 'createTransaction').returns(stubTransaction);

        const result = await contract.evaluateTransaction('name', ...args);
        expect(result).to.be.equal(expected);
      });
    });
    describe('#getQueryhandler', () => {
      it('returns the query handler object', () => {
        const expected = QueryHandler;
        const result1 = contract.getQueryHandler();
        const result2 = contract.getQueryHandler();
        expect(result1).to.be.instanceOf(expected);
        expect(result2).to.be.instanceOf(expected);
      });
    });
    describe('#getTransactionHandler', () => {
      it('returns transactionHandler Object', () => {
        sinon.stub(transactionHandler, 'setTxnOptions');
        const expected = TransactionHandler;
        const result1 = contract.getTransactionHandler();
        const result2 = contract.getTransactionHandler();
        expect(result1).to.be.instanceOf(expected);
        expect(result2).to.be.instanceOf(expected);
      });
    });
  });
});
