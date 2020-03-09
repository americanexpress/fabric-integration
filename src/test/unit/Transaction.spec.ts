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
import * as chai from 'chai';
import * as FabricClient from 'fabric-client';
import * as sinon from 'sinon';
import QueryHandler from '../../app/apis/QueryHandler';
import TransactionHandler from '../../app/apis/TransactionHandler';
import Contract from '../../app/Contract';
import Network from '../../app/Network';
import Transaction from '../../app/Transaction';
const { expect } = chai;
chai.use(require('chai-as-promised'));
const TransactionID = require('fabric-client/lib/TransactionID');

describe('Transaction', () => {
  const transactionName = 'helloworld';
  const expectedResult = Buffer.from('42');

  const fakeProposal = { proposal: 'all good' };
  const fakeHeader = { header: 'fakedeader' };
  const validProposalResponse = {
    response: {
      status: 200,
      payload: expectedResult,
      peer: { url: 'grpc://something.somewhere:1234' },
    },
  };
  const validProposalResponses = [
    [validProposalResponse],
    fakeProposal,
    fakeHeader,
  ];

  let stubContract: any;
  let transaction: Transaction;
  let channel: any;
  let stubQueryHandler: any;
  let network: any;

  beforeEach(() => {
    stubContract = sinon.createStubInstance(Contract);

    const transactionId: any = sinon.createStubInstance(TransactionID);
    transactionId.getTransactionID.returns('TRANSACTION_ID');
    stubContract.createTransactionID.returns(transactionId);

    network = sinon.createStubInstance(Network);
    stubContract.getNetwork.returns(network);
    const transactionHandler: any = sinon.createStubInstance(
      TransactionHandler,
    );
    stubQueryHandler = sinon.createStubInstance(QueryHandler);
    stubQueryHandler.queryChaincode.resolves(expectedResult);
    stubContract.getQueryHandler.returns(stubQueryHandler);

    channel = sinon.createStubInstance(FabricClient.Channel);
    channel.sendTransactionProposal.resolves(validProposalResponses);
    channel.sendTransaction.resolves({ status: 'SUCCESS' });
    network.getChannel.returns(channel);

    stubContract.getChaincodeId.returns('chaincode-id');
    stubContract.getTransactionHandler.returns(transactionHandler);

    transaction = new Transaction(stubContract, transactionName);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('#getName', () => {
    it('return the name', () => {
      const result = transaction.getName();
      expect(result).to.equal(transactionName);
    });
  });
  describe('#setTransactionOptions', () => {
    it('Adds transactionType key to transaction object', () => {
      const txoptions = {
        transactionType: 'install',
      };
      transaction.setTransactionOptions(txoptions);
      // transaction.setTransient({ testkey1: Buffer.from('testvalue1') });
      expect(transaction)
        .to.have.property('txnOptions')
        .that.is.haveOwnProperty('transactionType')
        .with.equals('install');
    });
    it('Adds transiantMap to txnOptions of transaction object', () => {
      const txnOptions = {
        transiantMap: {
          testkey1: Buffer.from('testvalue1'),
          testkey2: Buffer.from('testvalue2'),
        },
      };
      transaction.setTransactionOptions(txnOptions);
      expect(transaction)
        .to.have.property('txnOptions')
        .that.is.haveOwnProperty('transiantMap')
        .with.property('testkey1');
      expect(transaction)
        .to.have.property('txnOptions')
        .that.is.haveOwnProperty('transiantMap')
        .with.property('testkey2');
    });
    it('Adds customEventListner to txnOptions of transaction object', () => {
      const txnOptions = {
        txnCustomEvent: [
          {
            eventName: 'testevent1',
            callback: () => {},
          },
        ],
      };
      transaction.setTransactionOptions(txnOptions);
      expect(transaction)
        .to.have.property('txnOptions')
        .that.is.haveOwnProperty('txnCustomEvent')
        .with.lengthOf(1);
    });
  });
  describe('#getTransactionID', () => {
    it('has a default transaction ID', () => {
      const result = transaction.getTransactionID();
      expect(result).to.be.an.instanceOf(TransactionID);
    });
  });
  describe('#submit', () => {
    it('throws if called a second time', async () => {
      await transaction.submit();
      const promise = transaction.submit();
      return expect(promise).to.be.rejectedWith(
        'Transaction has already been invoked',
      );
    });

    it('throws if called after evaluate', async () => {
      await transaction.evaluate();
      const promise = transaction.submit();
      return expect(promise).to.be.rejectedWith(
        'Transaction has already been invoked',
      );
    });
  });
  describe('#evaluate', () => {
    it('returns empty string response', async () => {
      stubQueryHandler.queryChaincode.resolves(Buffer.from(''));
      const result = await transaction.evaluate();
      expect(result.toString()).to.equal('');
    });
    it('throws if called a second time', async () => {
      await transaction.evaluate();
      const promise = transaction.evaluate();
      return expect(promise).to.be.rejectedWith(
        'Transaction has already been invoked',
      );
    });
    it('throws if called after submit', async () => {
      await transaction.submit();
      const promise = transaction.evaluate();
      return expect(promise).to.be.rejectedWith(
        'Transaction has already been invoked',
      );
    });
  });
});
