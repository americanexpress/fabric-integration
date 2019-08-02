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
export type Options = {
  identity: string;
  keystore: string;
};
export type SubmissionResponse = {
  status: string;
  payload: string;
};
export enum Versions {
  Latest = '1.4',
  Legacy = '1.1',
}
export enum Response {
  Success = 'SUCCESS',
  Failure = 'FAILURE',
}
export type EvaluationResponse = {
  status: string;
  payload: string[];
};

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
}

export interface Contract {
  getNetwork(): Network;
  createTransactionID(): FabricClient.TransactionId;
  getTransactionHandler(): TransactionHandler;
  getQueryHandler(): QueryHandler;
  getChaincodeId(): string;
  createTransaction(name: string): Transaction;
  submitTransaction(name: string, ...args: any[]): Promise<SubmissionResponse>;
  evaluateTransaction(
    name: string,
    ...args: any[]
  ): Promise<EvaluationResponse>;
}
export interface TransactionHandler {
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
  submit(...args: string[]): Promise<any>;
  setInvokedOrThrow(): void;
  evaluate(...args: string[]): Promise<EvaluationResponse>;
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
