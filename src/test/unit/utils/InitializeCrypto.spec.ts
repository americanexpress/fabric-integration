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
import {
  initializeCrypto,
  enrollIdentity,
  enrollOnCA,
  enrollUsingCerts,
} from '../../../app/utils/initializeCrypto';
import * as sinon from 'sinon';
import { User } from 'fabric-client';
import * as path from 'path';
const Client = require('fabric-client');
const CertificateAuthority = require('fabric-client/lib/CertificateAuthority');
chai.use(require('chai-as-promised'));
const configWithCA = path.join(
  __dirname,
  '../../config/connection-profile-with-ca.json',
);
const { expect } = chai;
describe('#initializeCrypto', () => {
  let mockClient: any;
  let mockCA: any;
  let mockUser: any;
  const mspid = 'org1';
  let mockIEnrollResponse: any;
  let mockKey: any;
  beforeEach(() => {
    mockKey = {
      toBytes: sinon.stub(),
    };
    mockIEnrollResponse = {
      key: mockKey,
      certificate: 'string',
      rootCertificate: 'string',
    };
    mockUser = sinon.createStubInstance(User);
    mockUser.isEnrolled.returns(true);
    mockCA = sinon.createStubInstance(CertificateAuthority);
    mockCA.getCaName.returns('ca-org1');
    mockCA.register.returns('secret');
    mockCA.enroll.returns(mockIEnrollResponse);
    mockClient = sinon.createStubInstance(Client);
    mockClient.setUserContext.returns(mockUser);
    mockClient.getMspid.returns(mspid);
    mockClient.getClientConfig.returns({ organization: mspid });
    mockClient._network_config = {
      _network_config: {
        organizations: { org1: { adminPrivateKey: { pem: '---KEY---' } } },
      },
    };
    mockClient._network_config._network_config.organizations.org1.signedCert = {
      pem: '---CERT---',
    };
    mockClient.createUser.returns(null);
    mockClient.getUserContext.returns(mockUser);
    mockClient.getCertificateAuthority.returns(mockCA);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('#methods', () => {
    describe('#initializeCrypto', () => {
      it('should throw  ', async () => {
        mockClient.getUserContext.rejects(new Error('Error'));
        try {
          await initializeCrypto('me', '/tmp/dummy', mockClient, '1.1');
          expect.fail();
        } catch (error) {
          expect(error.message).to.eql('Error');
        }
      });
      it('should return existing user ', async () => {
        mockClient.getUserContext.returns(mockUser);
        const result = await initializeCrypto(
          'me',
          '/tmp/dummy',
          mockClient,
          '1.1',
        );
        expect(result).to.be.eql(mockUser);
      });
      it('should return user ', async () => {
        mockClient.getUserContext.resolves(null);
        mockClient.createUser.returns(mockUser);
        Client.setConfigSetting(
          'network-connection-profile-path',
          configWithCA,
        );
        const result = await initializeCrypto(
          'me',
          '/tmp/dummy',
          mockClient,
          '1.1',
        );
        expect(result).to.be.eql(mockUser);
      });
    });
    describe('#enrollOnCA', () => {
      it('should return user oject', async () => {
        mockClient.createUser.returns(mockUser);
        const result = await enrollOnCA(mockClient, 'admin', '1.1');
        expect(result).to.be.eql(mockUser);
      });
      it('should throw', async () => {
        mockCA.register.rejects(new Error('Already exists'));
        try {
          await enrollOnCA(mockClient, 'admin', '1.1');
          expect.fail();
        } catch (error) {
          expect(error.message).equal('Already exists');
        }
      });
    });

    describe('#enrollUsingCerts', () => {
      it('should return user oject', async () => {
        const result = await enrollUsingCerts(mockClient, 'admin');
        expect(result).to.be.eql(mockUser);
      });
      it('should throw', async () => {
        mockClient.getUserContext.rejects(new Error('Error'));
        try {
          await enrollUsingCerts(mockClient, 'admin');
          expect.fail();
        } catch (error) {
          expect(error.message).equal('Error');
        }
      });
    });
    describe('#enrollIdentity', () => {
      it('should return user oject', async () => {
        mockClient.createUser.returns(mockUser);
        const result = await enrollIdentity(mockClient, 'admin', '1.1');
        expect(result).to.be.eql(mockUser);
      });
      it('should throw', async () => {
        mockCA.register.rejects(new Error('Already exists'));
        try {
          await enrollIdentity(mockClient, 'admin', '1.1');
          expect.fail();
        } catch (error) {
          expect(error.message).equal('Already exists');
        }
      });
      it('should return user oject', async () => {
        mockClient.getCertificateAuthority.returns(
          new Error(
            "is missing this client's organization and certificate authority YYY",
          ),
        );
        const result = await enrollIdentity(mockClient, 'admin', '1.1');
        expect(result).to.be.eql(mockUser);
      });
      it('should throw', async () => {
        mockClient.getCertificateAuthority.returns(new Error('XYZ Error'));
        try {
          await enrollIdentity(mockClient, 'admin', '1.1');
          expect.fail();
        } catch (error) {
          expect(error.message).equal('XYZ Error');
        }
      });
      it('should throw not enrolled', async () => {
        mockUser.isEnrolled.returns(false);
        try {
          await enrollIdentity(mockClient, 'admin', '1.1');
          expect.fail();
        } catch (error) {
          expect(error.message).equal('User was not enrolled');
        }
      });
    });
  });
});
