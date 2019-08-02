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
import * as chai from 'chai';
import FabricClient from 'fabric-client';
import FabricClientLegacy from 'fabric-client-legacy';
const getClient = require('../../../app/utils/FabricClient').getClient;

const { expect } = chai;

describe('#FabricClient', () => {
  describe('#getClient', () => {
    it('should return LatestClient  ', () => {
      const client = getClient('1.4');
      expect(client).to.eql(FabricClient);
    });
    it('should return LegacyClient  ', () => {
      const client = getClient('1.1');
      expect(client).to.eql(FabricClientLegacy);
    });
  });
});
