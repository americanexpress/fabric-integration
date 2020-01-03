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
const EventHub = require('fabric-client-legacy/lib/ChannelEventHub');
import * as sinon from 'sinon';
import * as chai from 'chai';
import EventHandler from '../../../app/helpers/EventHandler';
const { expect } = chai;
chai.use(require('chai-as-promised'));

describe('EventHandler', () => {
  let eventHandler: EventHandler;
  let stubEventHub: any;
  beforeEach(() => {
    stubEventHub = sinon.createStubInstance(EventHub);
    stubEventHub.connect.returns(true);
    stubEventHub.disconnect.returns(true);
    stubEventHub._stubInfo = 'eventHub';
    stubEventHub.getPeerAddr.returns('eventHubAddress');
    stubEventHub.registerTxEvent.yields('txID', 'VALID', '12345');
    stubEventHub.registerChaincodeEvent.yields({ payload:'eventpayload' },
                                               '12345', 'txID', 'VALID');
    eventHandler = new EventHandler(stubEventHub);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('#registerChaincodeEvent', function exec() {
    this.timeout(30000);
    it('should return success ', async () => {
      const callback = sinon.stub();
      await eventHandler.registerChaincodeEvent(
        'chaincodeId',
        'eventName',
        callback,
      );
      expect(callback.calledOnceWith(null, { payload:'eventpayload' },
                                     '12345', 'txID', 'VALID')).to.be.true;
    });
    it('should return failure ', async () => {
      const callback = sinon.stub();
      stubEventHub.registerChaincodeEvent.yields({ payload:'eventpayload' },
                                                 '12345', 'txID', 'INVALID');
      await eventHandler.registerChaincodeEvent(
        'chaincodeId',
        'eventName',
        callback,
      );
      expect(callback.called).to.be.true;
      expect(callback.firstCall.args[0]).to.be.instanceof(Error);
    });
    it('should return failure on eventhub failure', async () => {
      const callback = sinon.stub();
      stubEventHub.registerChaincodeEvent.yieldsRight(new Error('Im Error'));
      await eventHandler.registerChaincodeEvent(
        'chaincodeId',
        'eventName',
        callback,
      );
      expect(callback.called).to.be.true;
      expect(callback.firstCall.args[0]).to.be.instanceof(Error);
    });
    it('should return failure on eventhub timeout', async () => {
      const callback = sinon.stub();
      const clock = sinon.useFakeTimers();
      stubEventHub.registerChaincodeEvent = () => {
        clock.tick(10001);
        return 'hello';
      };
      stubEventHub.disconnect.returns(true);
      await eventHandler.registerChaincodeEvent(
        'chaincodeId',
        'eventName',
        callback,
      );
      expect(callback.called).to.be.true;
      expect(callback.firstCall.args[0]).to.be.instanceof(Error);
    });
  });

  describe('#registerTxEvent', function exec() {
    this.timeout(30000);
    it('should return success ', async () => {
      return expect(eventHandler.registerTxEvent(
        'txIdString', null, null,
      )).to.not.be.rejected;
    });
    it('should fail for invalid eventhub response ', async () => {
      stubEventHub.registerTxEvent.yields('txID', 'INVALID', '12345');
      return expect(eventHandler.registerTxEvent(
        'txIdString', null, null,
      )).to.be.rejected;
    });
    it('should return failure on eventhub failure', async () => {
      stubEventHub.registerTxEvent.yieldsRight(new Error('Im Error'));
      return expect(eventHandler.registerTxEvent(
        'txIdString', null, null,
      )).to.be.rejected;
    });
    it('should return failure on eventhub timeout', async () => {
      const clock = sinon.useFakeTimers();
      stubEventHub.registerTxEvent = () => {
        clock.tick(10001);
        return 'hello';
      };
      stubEventHub.disconnect.returns(true);
      return expect(eventHandler.registerTxEvent(
        'txIdString', null, null,
      )).to.be.rejected;
    });
  });
});
