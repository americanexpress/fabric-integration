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
import * as fs from 'fs-extra';
import Network from './Network';
import * as types from './types';
import { initializeCrypto } from './utils/initializeCrypto';
import { getLogger } from './utils/logger';
const logger = getLogger('Gateway');
/**
 * This class provides the connection point for an application to interact
 * with fabric network. Constructor of this class takes a optional boolean parameter, which
 * Connect method of this class accepts connection profile file to connect to fabric network.
 */
export default class Gateway implements types.Gateway {
  private readonly networks = new Map<string, types.Network>();
  private config: string = null;
  private client: FabricClient = null;
  private currentIdentity: FabricClient.User = null;
  private isConnected = false;

  /**
   * Connect to the Gateway with a connection profile
   *
   * @param {string} config - Location of profile.json file
   * @param {Options} options - User and keystore details
   * @throws {Error}
   * @example
   *     gateway.connect('/somepath/profile.json', {
   * identity : 'admin' ,
   * keystore : '/somepath/keystore-org1'
   * })
   */
  public async connect(config: string, options: types.Options) {
    if (!fs.existsSync(config)) {
      throw new Error(`File not found ${config}`);
    }
    const { identity } = options;
    const { keystore } = options;
    this.config = config;
    this.client = FabricClient.loadFromConfig(this.config);
    FabricClient.setConfigSetting(types.CONNECTION_PROFILE_PATH, this.config);
    if (!this.client.getMspid()) {
      throw new Error('Invalid config file');
    }
    this.currentIdentity = await initializeCrypto(
      identity,
      keystore,
      this.client,
    );
    this.isConnected = true;
  }
  /**
   * Get the current identity
   */
  public getCurrentIdentity() {
    return this.currentIdentity;
  }

  /**
   * Returns hyperledger fabric client of connected gateway
   * @throws {Error}
   */
  public getClient(): FabricClient {
    if (this.client === null || !this.isConnected) {
      const message = 'Can not get client from disconnected gateway';
      logger.error(message);
      throw new Error(message);
    }
    return this.client;
  }

  /**
   * Clean up and disconnect this Gateway connection in preparation for
   * it to be discarded and garbage collected
   */
  public disconnect() {
    this.networks.forEach(network => network.dispose());
    this.networks.clear();
    this.isConnected = false;
  }
  /**
   * Connect to the Gateway with a connection profile
   *
   * @param {string} networkName - Name of hyperledger fabric network channel
   * @throws {Error}
   * @example
   *     gateway.getNetwork('mychannel')
   */
  public async getNetwork(networkName: string) {
    if (this.client === null || !this.isConnected) {
      const message = 'Can not get network from disconnected gateway';
      logger.error(message);
      throw new Error(message);
    }

    const existingNetwork = this.networks.get(networkName);
    if (existingNetwork) {
      return existingNetwork;
    }
    let channel = this.client.getChannel(networkName, false);
    if (channel === null) {
      channel = this.client.newChannel(networkName);
    }
    const newNetwork: types.Network = new Network(this, channel);
    this.networks.set(networkName, newNetwork);
    return newNetwork;
  }
  /**
   * returns gateway status
   */
  public getIsConnected() {
    return this.isConnected;
  }
}
