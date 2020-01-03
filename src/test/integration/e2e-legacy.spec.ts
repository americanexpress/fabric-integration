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

import { expect, assert } from 'chai';
import * as path from 'path';
import Gateway from '../../app/Gateway';
import * as types from '../../app/types';

// cryptoStore location  for org1
const keystore = path.join(
  __dirname,
  '../../../WALLET/hfc-key-store/e2e/legacy/',
);

// test config file without certificate authority
const configLocationWithoutCA = path.join(
  __dirname,
  '../config/connection-profile-without-ca.json',
);
const configLocationWithCA = path.join(
  __dirname,
  '../config/connection-profile-with-ca.json',
);
// valid channel name
const channelName = 'mychannel';

// user for enrollment
const identity = 'e2eUser';
const cAIdentity = Math.random()
  .toString(36)
  .substring(7);

const chaincodeId = 'mycc';
describe('#End to End Integration Test on Local Legacy Network', function exec() {
  this.timeout(50000);
  let gatewayForNonCAClient: types.Gateway;
  let gatewayForCAClient: types.Gateway;
  beforeEach(async () => {
    gatewayForNonCAClient = new Gateway(true);
    gatewayForCAClient = new Gateway(true);
    await gatewayForNonCAClient.connect(
      configLocationWithoutCA,
      {
        identity,
        keystore: keystore.concat('nonca'),
      },
    );
    await gatewayForCAClient.connect(
      configLocationWithCA,
      {
        identity: cAIdentity,
        keystore: keystore.concat('ca'),
      },
    );
  });
  afterEach(() => {
    gatewayForNonCAClient.disconnect();
    gatewayForCAClient.disconnect();
  });
  describe('#Capabilities', () => {
    describe('#enroll', () => {
      it('should return client with identity enrolled, NON CA Client', async () => {
        const client = await gatewayForNonCAClient.getClient();
        const user = await client.getUserContext(identity, true);
        // tslint:disable-next-line: no-unused-expression
        expect(user.isEnrolled()).to.be.true;
      });
      it('should return client with identity enrolled , CA Client', async () => {
        const client = await gatewayForCAClient.getClient();
        const user = await client.getUserContext(cAIdentity, true);
        // tslint:disable-next-line: no-unused-expression
        expect(user.isEnrolled()).to.be.true;
      });
    });
    describe('#evaluate', () => {
      it('should return query response with status success, NON CA Client', async () => {
        const network = await gatewayForNonCAClient.getNetwork(channelName);
        const contract = network.getContract(chaincodeId);
        const result = await contract.createTransaction('query').evaluate('a');
        assert.propertyVal(result, 'status', 'SUCCESS');
        return expect(
          Array.isArray(result.payload) && result.payload.some(item => item.includes('Error: Failed to connect') ||
          result.payload.includes('Error: Failed to connect'),
        ),
        ).to.be.false;
      });
      it('should return query response with status success, CA Client', async () => {
        const network = await gatewayForCAClient.getNetwork(channelName);
        const contract = network.getContract(chaincodeId);
        const result = await contract.createTransaction('query').evaluate('a');
        console.log(result);
        assert.propertyVal(result, 'status', 'SUCCESS');
        return expect(
          Array.isArray(result.payload) && result.payload.some(item => item.includes('Error: Failed to connect') ||
          result.payload.includes('Error: Failed to connect'),
        ),
        ).to.be.false;
      });
    });
    describe('#Submit', () => {
      it('should return submit response with status success, NON CA Client', async () => {
        const network = await gatewayForNonCAClient.getNetwork(channelName);
        const contract = network.getContract(chaincodeId);
        const result = await contract
          .createTransaction('move')
          .submit('a', 'b', '10');
        assert.propertyVal(result, 'status', 'SUCCESS');
        expect(result.payload)
          .to.be.a('string')
          .that.matches(/^[a-f0-9]{64}$/);
      });
      it('should return submit response with status success, CA Client', async () => {
        const network = await gatewayForCAClient.getNetwork(channelName);
        const contract = network.getContract(chaincodeId);
        const result = await contract
          .createTransaction('move')
          .submit('a', 'b', '10');
        assert.propertyVal(result, 'status', 'SUCCESS');
        expect(result.payload)
          .to.be.a('string')
          .that.matches(/^[a-f0-9]{64}$/);
      });
    });
  });
});
