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
import FabricClientLegacy from 'fabric-client-legacy';
export const EVENTHUBHANDLER_TIMEOUT = 10000;
export const EVENTHUBHANDLER_VALIDCODE = 'VALID';
export const FABRIC_CA_TIMEOUT = 20000;
export const CONNECTION_PROFILE_PATH = 'network-connection-profile-path';
export const CLIENT_LEGACY_CONFIG_PATH =
  './node_modules/fabric-client-legacy/config/default.json';
export const CLIENT_CONFIG_PATH =
  './node_modules/fabric-client/config/default.json';

export const AFFILIATION_KEY = 'x-affiliations';
export type ChaincodeType = 'golang' | 'car' | 'java' | 'node';
export type AdminFunctions = 'install' | 'instantiate' | 'upgrade';
export type UploadType = 'zip' | 'cds';
export type eventCallback =  (err:Error,
                              event?:FabricClient.ChaincodeEvent |
   FabricClientLegacy.ChaincodeEvent,
                              blockNumber?: number, tx?: any, code?: string)
 => Promise<void> | void;
export type Options = {
  identity: string;
  keystore: string;
};
export type TxnCustomEvent = {
  eventName: string;
  callback: eventCallback;
};
export type TransactionOptions = {
  txnCustomEvent?: TxnCustomEvent[];
  transiantMap?: Object;
  transactionType?:string;
  chaincodeVersion?:string;
  chaincodeType?:ChaincodeType;
};

export type ChaincodeSpec = {
  language: ChaincodeType;
  version: string;
  uploadType?:UploadType;
};
export enum Versions {
  Latest = '1.4',
  Legacy = '1.1',
}
export enum Response {
  Success = 'SUCCESS',
  Failure = 'FAILURE',
}
export type ApiResponse = {
  status: string;
  payload: string | string[];
};
export interface TransientMap {
  [key: string]: Buffer;
}
export interface Gateway {
  setLegacyVersion(): void;
  setLatestVersion(): void;
  connect(config: string, options: Options): Promise<any>;
  getCurrentIdentity(): FabricClient.User | FabricClientLegacy.User;
  getClient(): FabricClient | FabricClientLegacy;
  disconnect(): void;
  getNetwork(networkName: string): Promise<Network>;
  getIsConnected(): boolean;
  getVersion(): string;
}

export interface Network {
  getChannel(): FabricClient.Channel | FabricClientLegacy.Channel;
  getContract(chaincodeId: string): Contract;
  dispose(): void;
  getPeerList(): (FabricClient.Peer | FabricClientLegacy.Peer)[];
  getContractMap(): Map<string, Contract>;
  installContract(chaincodeId: string, chaincode:Buffer, chaincodeSpec:ChaincodeSpec):
   Promise<ApiResponse>;
  upgradeContract(
      chaincodeId: string, chaincodeSpec:ChaincodeSpec, functionName?:string, args?:string[]) :
      Promise<ApiResponse>;
  instantiateContract(
    chaincodeId: string, chaincodeSpec:ChaincodeSpec, functionName?:string, args?:string[]) :
    Promise<ApiResponse>;
}

export interface Contract {
  getNetwork(): Network;
  createTransactionID(): FabricClient.TransactionId;
  getTransactionHandler(txnOptions?: TransactionOptions): TransactionHandler;
  getQueryHandler(): QueryHandler;
  getChaincodeId(): string;
  createTransaction(name: string): Transaction;
  submitTransaction(name: string, ...args: any[]): Promise<ApiResponse>;
  evaluateTransaction(
    name: string,
    ...args: any[]
  ): Promise<ApiResponse>;
}
export interface TransactionHandler {
  setTxnOptions(txnOptions: TransactionOptions): void;
  submit(
    channel: FabricClient.Channel | FabricClientLegacy.Channel,
    txId: FabricClient.TransactionId,
    fcn: string,
    chaincodeId: string,
    args: any,
  ): Promise<any>;
}

export interface Transaction {
  getName(): string;
  getTransactionID(): FabricClient.TransactionId;
  addEventListner(event:string, callback:eventCallback): void;
  submit(...args: string[]): Promise<any>;
  setInvokedOrThrow(): void;
  evaluate(...args: string[]): Promise<ApiResponse>;
  setTransient(transientdata : TransientMap): void;
}
export interface QueryHandler {
  queryChaincode(
    chaincodeId: string,
    channel: FabricClient.Channel | FabricClientLegacy.Channel,
    txId: FabricClient.TransactionId,
    fcn: string,
    args: any,
  ): Promise<any>;
}
export interface ChaincodeHandler {
  installChaincode(
client:FabricClient | FabricClientLegacy, chaincodeId: string,
chaincode:Buffer|string, chaincodeSpec:ChaincodeSpec,
  ): Promise<ApiResponse>;
  instantiateOrUpgrade(
    functionType:AdminFunctions,
    channel: FabricClient.Channel | FabricClientLegacy.Channel,
    txId: FabricClient.TransactionId,
    chaincodeId: string,
    chaincodeSpec:ChaincodeSpec,
    fcn: string,
    args: string[],
  ): Promise<ApiResponse>;
}
export interface EventHandler {
  registerChaincodeEvent(
    chaincodeId: string,
    eventName: string,
    callback: eventCallback,
  ): Promise<any>;
  registerTxEvent(
    txIdString: string,
    txCustomEvents?: TxnCustomEvent[],
    chaincodeId?: string,
  ): Promise<any>;
}
