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
const Channel = require('fabric-client-legacy/lib/Channel');
const TransactionID = require('fabric-client-legacy/lib/TransactionID');
const EventHub = require('fabric-client-legacy/lib/ChannelEventHub');
import * as sinon from 'sinon';
import * as chai from 'chai';
import TransactionHandler from '../../../app/helpers/TransactionHandler';
const { expect } = chai;
chai.use(require('chai-as-promised'));

describe('TransactionHandler', () => {
  const expectedResult = Buffer.from('42');
  const fakeProposal = { proposal: 'all good' };
  const fakeHeader = { header: 'fakeuu' };
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
  let transactionHandler: any;
  let stubEventHub: any;

  let transactionId: any;

  beforeEach(() => {
    stubContract = sinon.createStubInstance(Contract);
    stubEventHub = sinon.createStubInstance(EventHub);
    stubEventHub.connect.returns(true);
    stubEventHub.disconnect.returns(true);
    stubEventHub._stubInfo = 'eventHub';
    stubEventHub.getPeerAddr.returns('eventHubAddress');
    stubEventHub.registerTxEvent.yields('txID', 'VALID', '12345');
    stubEventHub.registerChaincodeEvent.yields({ payload:'eventpayload' },
                                               '12345', 'txID', 'VALID');
    transactionId = sinon.createStubInstance(TransactionID);
    transactionId.getTransactionID.returns('TRANSACTION_ID');
    stubContract.createTransactionID.returns(transactionId);

    const network = sinon.createStubInstance(Network);
    stubContract.getNetwork.returns(network);

    channel = sinon.createStubInstance(Channel);
    channel.getChannelEventHubsForOrg.returns([]);
    channel.sendTransactionProposal.resolves(validProposalResponses);
    channel.sendTransaction.resolves({ status: 'SUCCESS' });
    network.getChannel.returns(channel);

    stubContract.getChaincodeId.returns('chaincode-id');

    transactionHandler = new TransactionHandler({txnCustomEvent:[{
      eventName:'event', callback:() => {
      } }]});
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('#submit', function exec() {
    this.timeout(30000);
    it('should succeed for validProposalResponses ,no eventHUb', async () => {
      const result = await transactionHandler.submit(
        channel,
        transactionId,
        'submit',
        'chainid',
        ['a', 'b', 'c'],
      );
      expect(result.status).to.equal('SUCCESS');
    });
    it('should succeed for validProposalResponses , eventHUb repsonse valid', async () => {
      stubEventHub.registerTxEvent.yields('txID', 'VALID', '12345');
      channel.getChannelEventHubsForOrg.returns([stubEventHub]);
      const result = await transactionHandler.submit(
        channel,
        transactionId,
        'submit',
        'chainid',
        ['a', 'b', 'c'],
      );
      expect(result.status).to.equal('SUCCESS');
    });
    it('should fail for validProposalResponses , eventHUb repsonse invalid', async () => {
      stubEventHub.registerTxEvent.yields('txID', 'INVALID', '12345');
      channel.getChannelEventHubsForOrg.returns([stubEventHub]);
      return expect(
        transactionHandler.submit(channel, transactionId, 'submit', 'chainid', [
          'a',
          'b',
          'c',
        ]),
      ).to.be.rejected;
    });
    it('should fail for validProposalResponses , eventHUb returns error', async () => {
      stubEventHub.registerTxEvent.yieldsRight('Im Error');
      channel.getChannelEventHubsForOrg.returns([stubEventHub]);
      return expect(
        transactionHandler.submit(channel, transactionId, 'submit', 'chainid', [
          'a',
          'b',
          'c',
        ]),
      ).to.be.rejected;
    });
    it('should fail for validProposalResponses , eventHUb timeout', async () => {
      const clock = sinon.useFakeTimers();
      stubEventHub.registerTxEvent = () => {
        clock.tick(10001);
        return 'hello';
      };
      stubEventHub.disconnect.returns(true);
      channel.getChannelEventHubsForOrg.returns([stubEventHub]);
      return expect(
        transactionHandler.submit(channel, transactionId, 'submit', 'chainid', [
          'a',
          'b',
          'c',
        ]),
      ).to.be.rejected;
    });
    it('should fail for errorProposalResponses', async () => {
      channel.sendTransactionProposal.resolves(errorProposalResponses);
      return expect(
        transactionHandler.submit(channel, transactionId, 'submit', 'chainid', [
          'a',
          'b',
          'c',
        ]),
      ).to.be.rejected;
    });
    it('should fail for noProposalResponses', async () => {
      channel.sendTransactionProposal.resolves(noProposalResponses);
      return expect(
        transactionHandler.submit(channel, transactionId, 'submit', 'chainid', [
          'a',
          'b',
          'c',
        ]),
      ).to.be.rejected;
    });
    it('should fail for errorProposalResponses', async () => {
      channel.sendTransactionProposal.resolves(errorProposalResponses);
      return expect(
        transactionHandler.submit(channel, transactionId, 'submit', 'chainid', [
          'a',
          'b',
          'c',
        ]),
      ).to.be.rejected;
    });
    it('should fail for mixedProposalResponses', async () => {
      channel.sendTransactionProposal.resolves(mixedProposalResponses);
      return expect(
        transactionHandler.submit(channel, transactionId, 'submit', 'chainid', [
          'a',
          'b',
          'c',
        ]),
      ).to.be.rejected;
    });
    it('should fail for sendTransactionProposal failure ', async () => {
      channel.sendTransactionProposal.rejects(
        new Error('send tx proposal failed'),
      );
      return expect(
        transactionHandler.submit(channel, transactionId, 'submit', 'chainid', [
          'a',
          'b',
          'c',
        ]),
      ).to.be.rejected;
    });
    it('should fail for invalid orderer response ', async () => {
      channel.sendTransaction.resolves({ status: 'FAILURE' });
      const result = await transactionHandler.submit(
        channel,
        transactionId,
        'submit',
        'chainid',
        ['a', 'b', 'c'],
      );
      expect(result.status).to.equal('FAILURE');
    });
  });
});
