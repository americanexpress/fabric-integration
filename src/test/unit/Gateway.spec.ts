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
import FabricClient from 'fabric-client';
import * as fs from 'fs-extra';
import * as path from 'path';
import Gateway from '../../app/Gateway';
import Network from '../../app/Network';
import * as types from '../../app/types';
chai.use(require('chai-as-promised'));

const { expect } = chai;

// test cryptoStore location
const storePath = path.join(__dirname, '../../../WALLET/hfc-key-store/test');

// test config file without certificate authority
const configWithoutCA = path.join(
  __dirname,
  '../config/connection-profile-without-ca.json',
);

const channelName = 'mychannel';

// test user for enrollment
const identity = 'latestTypeUser';

describe('#Gateway', function exec() {
  this.timeout(10000);
  describe('#Initial conditions', () => {
    let gateway: types.Gateway;
    beforeEach(() => {
      gateway = new Gateway();
    });
    it('should instantiate Gateway object with default property values ', async () => {
      expect(gateway).to.have.property('client', null);
      expect(gateway).to.have.property('config', null);
      expect(gateway).to.have.property('currentIdentity', null);
      expect(gateway).to.have.property('isConnected', false);
    });
  });
  describe('#Initialization', () => {
    it('should return instance of Gateway oject', async () => {
      expect(new Gateway()).to.be.an.instanceof(Gateway);
    });
  });

  describe('#methods', () => {
    describe('#connect', () => {
      let gateway: types.Gateway;
      beforeEach(() => {
        gateway = new Gateway();
      });
      afterEach(() => {
        gateway.disconnect();
      });
      it('should throw on invalid config (json) ,valid options', async () => {
        // invalid config file but valid json file
        const randomFileName = `/tmp/${Math.random()
          .toString(36)
          .substring(7)}`;
        const fileContent = {
          version: '1.0.0',
        };
        fs.writeFileSync(randomFileName, JSON.stringify(fileContent));
        return expect(
          gateway.connect(randomFileName, {
            identity,
            keystore: storePath,
          }),
        ).to.be.rejectedWith(/Invalid config file/);
      });
      it('should throw on invalid config(non json) ,valid options', async () => {
        // invalid config but valid file location
        const notJson = path.join(__dirname, '../../../README.md');
        return expect(
          gateway.connect(notJson, {
            identity,
            keystore: storePath,
          }),
        ).to.be.rejectedWith(/Unexpected token/);
      });
      it('should throw on invalid config(invalid path) ,valid options', async () => {
        // non existant path
        const fakePath = path.join(__dirname, 'test123');
        return expect(
          gateway.connect(fakePath, {
            identity,
            keystore: storePath,
          }),
        ).to.be.rejectedWith(/File not found/);
      });
      it('should return client with identity enrolled from local store', async () => {
        const randomUser = Math.random()
          .toString(36)
          .substring(7);
        await gateway.connect(configWithoutCA, {
          identity: randomUser,
          keystore: storePath,
        });
        const client = await gateway.getClient();
        const user = await client.getUserContext(randomUser, true);
        return expect(user.isEnrolled()).to.be.true;
      });
    });

    describe('#getCurrentIdentity', () => {
      let gateway: types.Gateway;
      beforeEach(() => {
        gateway = new Gateway();
      });
      afterEach(() => {
        gateway.disconnect();
      });
      it('should return User object', async () => {
        await gateway.connect(configWithoutCA, {
          identity,
          keystore: storePath,
        });
        expect(gateway.getCurrentIdentity()).to.be.an.instanceof(
          FabricClient.User,
        );
      });
    });

    describe('#getClient', () => {
      let gateway: types.Gateway;
      beforeEach(() => {
        gateway = new Gateway();
      });
      afterEach(() => {
        gateway.disconnect();
      });
      it('should return Latest Client object', async () => {
        await gateway.connect(configWithoutCA, {
          identity,
          keystore: storePath,
        });
        expect(gateway.getClient()).to.be.an.instanceof(FabricClient);
      });
      it('should throw on unintilized Gateway', async () => {
        expect(() => gateway.getClient()).to.throw(/Can not get client/);
      });
      it('should throw on disconnected Gateway', async () => {
        await gateway.connect(configWithoutCA, {
          identity,
          keystore: storePath,
        });
        gateway.disconnect();
        expect(() => gateway.getClient()).to.throw(/Can not get client/);
      });
    });

    describe('#getNetwork', () => {
      let gateway: types.Gateway;
      beforeEach(() => {
        gateway = new Gateway();
      });
      afterEach(() => {
        gateway.disconnect();
      });
      it('should throw on disconnected gateway', async () =>
        expect(gateway.getNetwork('channel')).to.eventually.be.rejectedWith(
          /Can not get network/,
        ));
      it('should return Network object', async () => {
        await gateway.connect(configWithoutCA, {
          identity,
          keystore: storePath,
        });
        expect(gateway.getNetwork(channelName)).eventually.to.be.an.instanceof(
          Network,
        );
        // should return from map
        expect(gateway.getNetwork(channelName)).eventually.to.be.an.instanceof(
          Network,
        );
      });
      it('should throw on non invalid channel', async () => {
        const invalidChannel = 'invalid_channel';
        await gateway.connect(configWithoutCA, {
          identity,
          keystore: storePath,
        });
        return expect(
          gateway.getNetwork(invalidChannel),
        ).to.eventually.be.rejectedWith(/Failed to create Channel/);
      });
    });

    describe('#getIsConnected', () => {
      let gateway: types.Gateway;
      beforeEach(() => {
        gateway = new Gateway();
      });
      afterEach(() => {
        gateway.disconnect();
      });
      it('should return isConnected true', async () => {
        await gateway.connect(configWithoutCA, {
          identity,
          keystore: storePath,
        });
        return expect(gateway.getIsConnected()).to.be.true;
      });
      it('should return isConnected false', async () => {
        return expect(gateway.getIsConnected()).to.be.false;
      });
    });
    describe('#disconnect', () => {
      let gateway: types.Gateway;
      beforeEach(() => {
        gateway = new Gateway();
      });
      afterEach(() => {
        gateway.disconnect();
      });
      it('should not throw and networks length be 0', async () => {
        await gateway.connect(configWithoutCA, {
          identity,
          keystore: storePath,
        });
        expect(() => gateway.disconnect()).to.not.throw(Error);
        return expect(gateway.getIsConnected()).to.be.false;
      });
    });
  });
});
