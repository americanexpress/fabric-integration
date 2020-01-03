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
import * as types from './types';
import Transaction from './Transaction';
import TransactionHandler from './helpers/TransactionHandler';
import QueryHandler from './helpers/QueryHandler';
import FabricClient from 'fabric-client';
import FabricClientLegacy from 'fabric-client-legacy';
import { getLogger } from './utils/logger';
const logger = getLogger('Contract');
const STRING_TYPE = 'string';

/**
 * Verify transaction name - only non-empty string allowed.
 * @private
 * @param {*} name Transaction name.
 * @throws {Error} if the name is invalid.
 */
const verifyTransactionName = (name: string) => {
  if (typeof name !== STRING_TYPE || name.length === 0) {
    const msg = 'Transaction name must be a non-empty string: '.concat(name);
    logger.error('verifyTransactionName:', msg);
    throw new Error(msg);
  }
};
/** This class provides access to [[TransactionHandler]] and [[QueryHandler]] objects which controls
 * communication and execution of transactions on fabric network. Transactions can
 * be created using [[createTransaction]] method of this class .
 * Get Contract instance using [[Network.getContract]].
 */
export default class Contract implements types.Contract {
  private network: types.Network;
  private peerList: (FabricClient.Peer | FabricClientLegacy.Peer)[];
  private chaincodeId: string;
  private gateway: types.Gateway;
  private transactionHandler: types.TransactionHandler;
  private queryHandler: types.QueryHandler;
  /**
   * Represents a contract object.
   * @constructor
   * @hideconstructor
   * @param {Network} network - Network object
   * @param {string} chaincodeId - Chaincode Id of installed chaincode
   * @param {Gateway} gateway - Gateway object
   */
  constructor(
    network: types.Network,
    chaincodeId: string,
    gateway: types.Gateway,
  ) {
    this.network = network;
    this.peerList = network.getPeerList();
    this.chaincodeId = chaincodeId;
    this.gateway = gateway;
  }
  /**
   * Get the parent network on which this contract exists.
   */
  getNetwork() {
    return this.network;
  }
  /**
   * Creates a new transaction ID.
   */
  createTransactionID() {
    return this.gateway.getClient().newTransactionID();
  }
  /**
   * Get the transaction handler for this contract. Used by transaction submit.
   */
  getTransactionHandler(txnOptions?:types.TransactionOptions) {
    if (this.transactionHandler) {
      this.transactionHandler.setTxnOptions(txnOptions);
      return this.transactionHandler;
    }
    this.transactionHandler = new TransactionHandler(txnOptions);
    return this.transactionHandler;
  }
  /**
   * Get the query handler for this contract. Used by transaction evaluate.
   */
  getQueryHandler() {
    if (this.queryHandler) { return this.queryHandler; }
    this.queryHandler = new QueryHandler(this.peerList);
    return this.queryHandler;
  }
  /**
   * Get the chaincode ID of this contract.
   */
  getChaincodeId() {
    return this.chaincodeId;
  }

  /**
   * This method creates and returns a [[Transaction]] object.
   *  A new transaction object <strong>must</strong>
   * be created for each transaction invocation.
   */
  createTransaction(name: string) {
    verifyTransactionName(name);
    const transaction: Transaction = new Transaction(this, name);
    return transaction;
  }

  /**
   * This method submits a transaction to the ledger. This method is used
   * when intention of transaction is to change the state of ledger. Transaction will be evaluated
   * on the endorsing peers and then submitted to the ordering service which then be committed
   * to the ledger
   */
  async submitTransaction(
    name: string,
    ...args: any[]
  ): Promise<types.ApiResponse> {
    return this.createTransaction(name).submit(...args);
  }

  /**
   * This method only evaluates the transaction function , hence the response is not sent to
   * orderer. This method is used to query the state of ledger.
   */
  async evaluateTransaction(
    name: string,
    ...args: any[]
  ): Promise<types.ApiResponse> {
    return this.createTransaction(name).evaluate(...args);
  }
}
