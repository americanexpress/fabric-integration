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
import * as types from '../types';
import FabricClientLegacy from 'fabric-client-legacy';
import FabricClient from 'fabric-client';
import { getClient } from './FabricClient';
import { getLogger } from './logger';
const logger = getLogger('initializeCrypto');

export const enrollOnCA = async (
  client: FabricClientLegacy | FabricClient,
  username: string,
  version: string,
) : Promise<FabricClient.User | FabricClientLegacy.User> => {
  const caClient = client.getCertificateAuthority();
  const connectionProfilePath = getClient(version).getConfigSetting(
    types.CONNECTION_PROFILE_PATH,
  );
  const connectionProfile = require(connectionProfilePath);
  const caName = caClient.getCaName();
  const certificateAuthorities: any[] = Object.keys(
    connectionProfile.certificateAuthorities,
  );
  const caNameKey = certificateAuthorities.filter(
    key => connectionProfile.certificateAuthorities[key].caName === caName,
  )[0];
  const registrar =
    connectionProfile.certificateAuthorities[caNameKey].registrar[0];

  const adminUserObj: FabricClientLegacy.User = await client.setUserContext({
    username: registrar.enrollId,
    password: registrar.enrollSecret,
  });
  const affiliationKey = types.AFFILIATION_KEY;
  const secret = await caClient.register(
    {
      enrollmentID: username,
      affiliation: registrar[affiliationKey][0],
    },
    adminUserObj,
  );
  const user = await client.setUserContext({
    username,
    password: secret,
  });
  return user;
};

export const enrollUsingCerts = async (
  client: FabricClientLegacy | FabricClient,
  username: string,
) : Promise<FabricClient.User | FabricClientLegacy.User> => {
  let user: FabricClient.User | FabricClientLegacy.User = null;
  const mspid = client.getMspid();
  const orgName = client.getClientConfig().organization;
  const clientConfig: any = client;
  const keyPEM: any =
    clientConfig._network_config._network_config.organizations[orgName]
      .adminPrivateKey.pem;
  const certPEM: any =
    clientConfig._network_config._network_config.organizations[orgName]
      .signedCert.pem;
  await client.createUser({
    username,
    mspid,
    cryptoContent: {
      privateKeyPEM: keyPEM.toString(),
      signedCertPEM: certPEM.toString(),
    },
    skipPersistence: false,
  });
  user = await client.getUserContext(username, true);
  return user;
};
export const enrollIdentity = async (
  client: FabricClientLegacy | FabricClient,
  username: string,
  version: string,
) : Promise<FabricClient.User | FabricClientLegacy.User> => {
  let user: FabricClient.User | FabricClientLegacy.User = null;
  try {
    const cA = client.getCertificateAuthority();
    if (cA instanceof Error) { throw cA; }
    user = await enrollOnCA(client, username, version);
  } catch (error) {
    if (
      error.message.includes(
        "is missing this client's organization and certificate authority",
      )
    ) {
      user = await enrollUsingCerts(client, username);
    } else {
      logger.error(error.message);
      throw error;
    }
  }
  if (!user || !user.isEnrolled()) {
    throw new Error('User was not enrolled');
  }
  return user;
};
export const initializeCrypto = async (
  identity: string,
  keystore: string,
  client: FabricClientLegacy | FabricClient,
  version: string,
) : Promise<FabricClient.User | FabricClientLegacy.User> => {
  let user: FabricClient.User | FabricClientLegacy.User = null;

  const fabricClient = getClient(version);
  fabricClient.setConfigSetting('connection-timeout', types.FABRIC_CA_TIMEOUT);
  const stateStore = await fabricClient.newDefaultKeyValueStore({
    path: keystore,
  });

  client.setStateStore(stateStore);

  const cryptoSuite = fabricClient.newCryptoSuite();
  const cryptoStore = fabricClient.newCryptoKeyStore({
    path: keystore,
  });

  cryptoSuite.setCryptoKeyStore(cryptoStore);
  client.setCryptoSuite(cryptoSuite);

  user = await client.getUserContext(identity, true);
  if (!user) {
    user = await enrollIdentity(client, identity, version);
  } else {
    logger.debug('User %s was found to be registered and enrolled', identity);
  }
  return user;
};
