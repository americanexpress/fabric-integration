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
import Contract from './Contract';
import * as types from './types';
import FabricClient from 'fabric-client';
import FabricClientLegacy from 'fabric-client-legacy';
import ChaincodeHandler from './helpers/ChaincodeHandler';
import { getLogger } from './utils/logger';
const logger = getLogger('Network');

/** This class repressents the fabric channel.
 * Get Network instance using the [[Gateway.getNetwork]] method.
 * Gateway can hold multiple network instances
 * hence can execute transactions on multiple fabric channels */
export default class Network implements types.Network {
  private gateway: types.Gateway;
  private channel: FabricClient.Channel | FabricClientLegacy.Channel;
  private contracts: Map<string, types.Contract>;
  private peerList: (FabricClient.Peer | FabricClientLegacy.Peer)[];
  /**
   * Represents a network object.
   * @constructor
   * @hideconstructor
   * @param {Gateway} gateway - Gateway object
   * @param {Channel} channel - Hyperledger fabric channel oject
   * @throws {Error}
   */
  constructor(
    gateway: types.Gateway,
    channel: FabricClient.Channel | FabricClientLegacy.Channel,
  ) {
    this.gateway = gateway;
    this.channel = channel;
    this.contracts = new Map();
  }
  /**
   * Get the underlying channel object representation of this network.
   */
  getChannel() {
    return this.channel;
  }
  /**
   * Get the list of contracts added to this network
   */
  getContractMap() {
    return this.contracts;
  }
  /**
   * Connect to the Gateway with a connection profile
   *
   * @throws {Error}
   * @example
   *     network.getContract('mychaincode')
   */
  getContract(chaincodeId: string) {
    if (!this.gateway || !this.channel || !this.gateway.getIsConnected()) {
      const message = 'Unable to return contract from disconnected network';
      logger.error(message);
      throw new Error(message);
    }
    const key = `${chaincodeId}`;
    let contract = this.contracts.get(key);
    if (!contract) {
      contract = new Contract(this, chaincodeId, this.gateway);
      this.contracts.set(key, contract);
    }
    return contract;
  }
  /**
   * This method installs new smart contract.
   * @param {string} chaincodeId Chaincode name.
   * @param {Buffer} chaincode buffer of chaincode zip/cds file.
   * @param {types.ChaincodeSpec} chaincodeSpec additional information about chaincode
   */

  installContract(chaincodeId: string, chaincode:Buffer, chaincodeSpec:types.ChaincodeSpec) {
    if (!chaincodeSpec.uploadType) {
      throw new Error('Upload type in required for chaincode install');
    }
    return new ChaincodeHandler(this.getPeerList()).
    installChaincode(this.gateway.getClient(), chaincodeId, chaincode, chaincodeSpec);
  }
  /**
   * This method instantiates the installed chaincode.
   * @param {string} chaincodeId Chaincode name.
   * @param {types.ChaincodeSpec} chaincodeSpec additional information about chaincode
   * @param {string} [functionName] Initialization function if any.
   * @param {string} [args] Initialization function arguments.
   */
  instantiateContract(chaincodeId: string, chaincodeSpec:types.ChaincodeSpec, functionName?:string, args?:string[]) {
    return this.chaincodeInstantiateUpgrade('instantiate',chaincodeId, chaincodeSpec, functionName, args);
  }
  /**
   * This method upgrades the instantiated chaincode.
   * @param {string} chaincodeId Chaincode name.
   * @param {types.ChaincodeSpec} chaincodeSpec additional information about chaincode
   * @param {string} [functionName] Initialization function if any.
   * @param {string} [args] Initialization function arguments.
   */
  upgradeContract(chaincodeId: string, chaincodeSpec:types.ChaincodeSpec,functionName?:string, args?:string[]) {
    return this.chaincodeInstantiateUpgrade('upgrade',chaincodeId, chaincodeSpec, functionName, args);
  }
  /**
   * Instantiates or Upgrades chaincode
   */
  chaincodeInstantiateUpgrade(functionType:types.AdminFunctions,
                              chaincodeId: string, chaincodeSpec:types.ChaincodeSpec,
                              functionName?:string, args?:string[]) {
    return new ChaincodeHandler(this.getPeerList()).instantiateOrUpgrade(
      functionType, this.getChannel(), this.gateway.getClient().newTransactionID(true),
      chaincodeId, chaincodeSpec, functionName, args);
  }
  /**
   * Clears contract map of this instance
   */
  dispose() {
    this.contracts.clear();
  }
  /**
   * Returns list of peers on underlying channel
   */
  getPeerList() {
    if (this.peerList) { return this.peerList; }
    const peersOnChannel = this.channel.getPeers();
    this.peerList = (peersOnChannel as any[]).map(item =>
      item instanceof FabricClientLegacy.Peer ? item : item.getPeer(),
    );
    return this.peerList;
  }
}
