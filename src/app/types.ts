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
export const EVENTHUBHANDLER_TIMEOUT = 10000;
export const EVENTHUBHANDLER_VALIDCODE = 'VALID';
export const FABRIC_CA_TIMEOUT = 20000;
export const INSTANTIATE_UPGRADE_TIMEOUT = 120000;
export const CONNECTION_PROFILE_PATH = 'network-connection-profile-path';
export const AFFILIATION_KEY = 'x-affiliations';
export type ChaincodeType = 'golang' | 'car' | 'java' | 'node';
export type AdminFunctions = 'install' | 'instantiate' | 'upgrade';
export type UploadType = 'zip' | 'cds';
export type eventCallback = (
  err: Error,
  event?: FabricClient.ChaincodeEvent,
  blockNumber?: number,
  tx?: any,
  code?: string,
) => Promise<void> | void;
export interface Options {
  identity: string;
  keystore: string;
}
export interface TxnCustomEvent {
  eventName: string;
  callback: eventCallback;
}
export interface TransactionOptions {
  txnCustomEvent?: TxnCustomEvent[];
  transiantMap?: TransientMap;
  transactionType?: string;
  chaincodeSpec?: ChaincodeSpec;
}
export interface ChaincodeSpec {
  language: ChaincodeType;
  version: string;
  uploadType?: UploadType;
}
export enum Response {
  Success = 'SUCCESS',
  Failure = 'FAILURE',
}
export interface ApiResponse {
  status: string;
  payload: string | string[];
}
export interface TransientMap {
  [key: string]: Buffer;
}
export interface Gateway {
  connect(config: string, options: Options): Promise<void>;
  getCurrentIdentity(): FabricClient.User;
  getClient(): FabricClient;
  disconnect(): void;
  getNetwork(networkName: string): Promise<Network>;
  getIsConnected(): boolean;
}

export interface Network {
  getChannel(): FabricClient.Channel;
  getContract(chaincodeId: string): Contract;
  dispose(): void;
  getPeerList(): FabricClient.Peer[];
  getContractMap(): Map<string, Contract>;
  installContract(
    chaincodeId: string,
    chaincode: Buffer,
    chaincodeSpec: Required<ChaincodeSpec>,
  ): Promise<ApiResponse>;
  upgradeContract(
    chaincodeId: string,
    chaincodeSpec: ChaincodeSpec,
    functionName?: string,
    args?: string[],
  ): Promise<ApiResponse>;
  instantiateContract(
    chaincodeId: string,
    chaincodeSpec: ChaincodeSpec,
    functionName?: string,
    args?: string[],
  ): Promise<ApiResponse>;
}

export interface Contract {
  getNetwork(): Network;
  createTransactionID(): FabricClient.TransactionId;
  getTransactionHandler(txnOptions?: TransactionOptions): TransactionHandler;
  getQueryHandler(): QueryHandler;
  getChaincodeId(): string;
  createTransaction(name: string): Transaction;
  submitTransaction(name: string, ...args: string[]): Promise<ApiResponse>;
  evaluateTransaction(name: string, ...args: string[]): Promise<ApiResponse>;
}
export interface TransactionHandler {
  setTxnOptions(txnOptions: TransactionOptions): void;
  submit(
    channel: FabricClient.Channel,
    txId: FabricClient.TransactionId,
    fcn: string,
    chaincodeId: string,
    args: string[],
  ): Promise<ApiResponse>;
}

export interface Transaction {
  getName(): string;
  getTransactionID(): FabricClient.TransactionId;
  submit(...args: string[]): Promise<ApiResponse>;
  setInvokedOrThrow(): void;
  evaluate(...args: string[]): Promise<ApiResponse>;
  setTransactionOptions(txnOptions: TransactionOptions): void;
}
export interface QueryHandler {
  queryChaincode(
    chaincodeId: string,
    channel: FabricClient.Channel,
    txId: FabricClient.TransactionId,
    fcn: string,
    args: string[],
  ): Promise<ApiResponse>;
}
export interface ChaincodeHandler {
  installChaincode(
    client: FabricClient,
    chaincodeId: string,
    chaincode: Buffer | string,
    chaincodeSpec: Required<ChaincodeSpec>,
  ): Promise<ApiResponse>;
  instantiateOrUpgrade(
    functionType: AdminFunctions,
    channel: FabricClient.Channel,
    txId: FabricClient.TransactionId,
    chaincodeId: string,
    chaincodeSpec: ChaincodeSpec,
    fcn: string,
    args: string[],
  ): Promise<ApiResponse>;
}
export interface EventHandler {
  registerChaincodeEvent(
    chaincodeId: string,
    eventName: string,
    callback: eventCallback,
  ): Promise<void>;
  registerTxEvent(
    txIdString: string,
    txCustomEvents?: TxnCustomEvent[],
    chaincodeId?: string,
  ): Promise<string>;
}
