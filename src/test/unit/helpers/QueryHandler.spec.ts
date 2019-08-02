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
const TransactionID = require('fabric-client/lib/TransactionID');

import * as FabricClient from 'fabric-client';
import * as FabricClientLegacy from 'fabric-client-legacy';

import * as sinon from 'sinon';
import * as chai from 'chai';
import QueryHandler from '../../../app/helpers/QueryHandler';

const { expect } = chai;
chai.use(require('chai-as-promised'));
class ChannelPeer {
  constructor() {}
  getPeer() {}
}
describe('QueryHandler', () => {
  let mockPeer: any;
  let mockPeerLegacy: any;
  let mockPeerList: any;
  let mockPeerListLegacy: any;
  let mockTransactionID: any;
  let mockChannel: any;
  let mockChannelLegacy: any;
  let queryHandlerLegacy: any;
  let queryHandler: any;
  beforeEach(() => {
    mockPeerLegacy = sinon.createStubInstance(FabricClientLegacy.Peer);
    mockPeerLegacy.getName.returns('Peer1');
    mockPeerLegacy.index = 1;
    mockPeer = sinon.createStubInstance(FabricClient.Peer);
    mockPeer.getName.returns('Peer2');
    mockPeer.index = 1;
    mockPeerListLegacy = [mockPeerLegacy];
    mockPeerList = [mockPeer];
    mockTransactionID = sinon.createStubInstance(TransactionID);
    mockChannel = sinon.createStubInstance(FabricClient.Channel);
    mockChannelLegacy = sinon.createStubInstance(FabricClientLegacy.Channel);
    queryHandlerLegacy = new QueryHandler(mockPeerListLegacy);
    queryHandler = new QueryHandler(mockPeerList);
  });
  afterEach(() => {
    sinon.restore();
  });

  describe('#constructor', () => {
    it('should return targets initilized', () => {
      expect(queryHandlerLegacy.targets).to.have.lengthOf(1);
      expect(queryHandlerLegacy.targets).to.eql(mockPeerListLegacy);
    });
  });

  describe('#queryChaincode', () => {
    let errorResponse: any;
    let validResponse: any[];

    beforeEach(() => {
      errorResponse = new Error('Chaincode error response');
      errorResponse.status = 500;
      errorResponse.isProposalResponse = true;
      validResponse = [Buffer.from('hello world')];
      mockChannelLegacy.queryByChaincode.resolves(validResponse);
      mockChannel.queryByChaincode.resolves(validResponse);
    });

    it('should return error ', async () => {
      mockChannelLegacy.queryByChaincode.resolves([errorResponse]);
      const result: {
        status: string;
        payload: any[];
      } = await queryHandlerLegacy.queryChaincode(
        'chaincodeId',
        mockChannelLegacy,
        mockTransactionID,
        'myfunc',
        ['arg1', 'arg2'],
      );
      expect(result.status).to.equal('SUCCESS');
      const payload: any[] = result.payload.map(item => item.toString('utf8'));
      expect(payload[0]).includes('Error');
    });

    it('should return success and valid payload', async () => {
      const result = await queryHandlerLegacy.queryChaincode(
        'chaincodeId',
        mockChannelLegacy,
        mockTransactionID,
        'myfunc',
        ['arg1', 'arg2'],
      );
      expect(result.status).to.equal('SUCCESS');
      expect(result.payload).to.eql(
        validResponse.map(item => item.toString('utf8')),
      );
    });
    it('should return success and valid payload for latest channel', async () => {
      const result = await queryHandler.queryChaincode(
        'chaincodeId',
        mockChannel,
        mockTransactionID,
        'myfunc',
        ['arg1', 'arg2'],
      );
      expect(result.status).to.equal('SUCCESS');
      expect(result.payload).to.eql(
        validResponse.map(item => item.toString('utf8')),
      );
    });
    it('sould fail if chaincode throws', async () => {
      mockChannelLegacy.queryByChaincode.rejects(
        new Error('queryByChaincode failed'),
      );
      return expect(
        queryHandlerLegacy.queryChaincode(
          'chaincodeId',
          mockChannelLegacy,
          mockTransactionID,
          'myfunc',
          ['arg1', 'arg2'],
        ),
      ).to.be.rejected;
    });
    it('sould fail if chaincode throws', async () => {
      mockChannelLegacy.queryByChaincode.resolves(null);
      const result = await queryHandlerLegacy.queryChaincode(
        'chaincodeId',
        mockChannelLegacy,
        mockTransactionID,
        'myfunc',
        ['arg1', 'arg2'],
      );
      expect(result.status).equal('FAILURE');
    });
  });
});
