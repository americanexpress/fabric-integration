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
import FabricClient from 'fabric-client';
import * as types from '../types';
import { getLogger } from './logger';
const logger = getLogger('initializeCrypto');

export const enrollOnCA = async (
  client: FabricClient,
  username: string,
): Promise<FabricClient.User> => {
  const caClient = client.getCertificateAuthority();
  const connectionProfilePath = FabricClient.getConfigSetting(
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

  const adminUserObj = await client.setUserContext({
    password: registrar.enrollSecret,
    username: registrar.enrollId,
  });
  const affiliationKey = types.AFFILIATION_KEY;
  const password = await caClient.register(
    {
      affiliation: registrar[affiliationKey][0],
      enrollmentID: username,
    },
    adminUserObj,
  );
  const user = await client.setUserContext({
    password,
    username,
  });
  return user;
};

export const enrollUsingCerts = async (
  client: FabricClient,
  username: string,
): Promise<FabricClient.User> => {
  let user: FabricClient.User = null;
  const mspid = client.getMspid();
  const orgName = client.getClientConfig().organization;
  const clientConfig: any = client;
  const keyPEM: any =
    clientConfig._network_config._network_config.organizations[orgName]
      .adminPrivateKey.pem;
  const certPEM: any =
    clientConfig._network_config._network_config.organizations[orgName]
      .signedCert.pem;
  const cryptoContent = {
    privateKeyPEM: keyPEM.toString(),
    signedCertPEM: certPEM.toString(),
  };
  await client.createUser({
    cryptoContent,
    mspid,
    username,
    skipPersistence: false,
  });
  user = await client.getUserContext(username, true);
  return user;
};
export const enrollIdentity = async (
  client: FabricClient,
  username: string,
): Promise<FabricClient.User> => {
  let user: FabricClient.User = null;
  try {
    const cA = client.getCertificateAuthority();
    if (cA instanceof Error) {
      throw cA;
    }
    user = await enrollOnCA(client, username);
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
  client: FabricClient,
): Promise<FabricClient.User> => {
  let user: FabricClient.User = null;

  FabricClient.setConfigSetting('connection-timeout', types.FABRIC_CA_TIMEOUT);
  const stateStore = await FabricClient.newDefaultKeyValueStore({
    path: keystore,
  });

  client.setStateStore(stateStore);

  const cryptoSuite = FabricClient.newCryptoSuite();
  const cryptoStore = FabricClient.newCryptoKeyStore({
    path: keystore,
  });

  cryptoSuite.setCryptoKeyStore(cryptoStore);
  client.setCryptoSuite(cryptoSuite);

  user = await client.getUserContext(identity, true);
  if (!user) {
    user = await enrollIdentity(client, identity);
  } else {
    logger.debug('User %s was found to be registered and enrolled', identity);
  }
  return user;
};
