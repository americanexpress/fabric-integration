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
import * as path from 'path';
import * as types from '../../app/types';
import Network from '../../app/Network';
import Gateway from '../../app/Gateway';
import Contract from '../../app/Contract';
import * as sinon from 'sinon';
import * as FabricClient from 'fabric-client';
import * as FabricClientLegacy from 'fabric-client-legacy';
const ClientLegacy = require('fabric-client-legacy');
const Client = require('fabric-client');

// test cryptoStore location
const storePath = path.join(__dirname, '../../../WALLET/hfc-key-store/test');

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
  let mockChannel: any;
  let mockChannelLegacy: any;

  beforeEach(() => {
    mockChannel = sinon.createStubInstance(FabricClient.Channel);
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
        await network.getContract(chaincodeId);
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
  });
});
