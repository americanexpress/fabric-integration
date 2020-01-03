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
import { TransactionId } from 'fabric-client';
import { getLogger } from './utils/logger';
const logger = getLogger('Transaction');

/**
 * Represents a specific transaction invocation.
 * This class holds methods to read and write to the ledger.
 * Get instances of this class by calling [[Contract.createTransaction]]
 * A new instance must be created for each transaction invocation.
 * @hideconstructor
 */
export default class Transaction {
  /*
   * @param {Contract} contract - Contract to which this transaction belongs.
   * @param {String} name  - transaction name.
   */
  private contract: types.Contract;
  private name: string;
  private transactionId: TransactionId;
  private isInvoked: boolean;
  private txnOptions : types.TransactionOptions;
  /*
   * @param {Contract} contract Contract to which this transaction belongs.
   * @param {String} name Fully qualified transaction name.
   */
  constructor(contract: types.Contract, name: string) {
    this.contract = contract;
    this.name = name;
    this.transactionId = contract.createTransactionID();
    this.isInvoked = false;
    this.txnOptions = { };

  }
  /**
   * Get the name of the transaction function.
   */
  getName() {
    return this.name;
  }
  /**
   * Get the ID that will be used for this transaction invocation.
   */
  getTransactionID() {
    return this.transactionId;
  }
  /**
 * Add event listner to transaction.
 */
  addEventListner(eventName:string, callback:types.eventCallback) {
    if (!this.txnOptions.txnCustomEvent) {
      this.txnOptions.txnCustomEvent = [];
    }
    return this.txnOptions.txnCustomEvent.push({ eventName, callback });
  }

  /**
 * Add Transaiant map to transaction.
 */
  setTransient(transientdata : types.TransientMap) {
    this.txnOptions.transiantMap = transientdata;
  }
  /**
   * This method submits the transaction to the ledger .Transaction will be evaluated on
   * endorsing peers and then submitted to the ordering service
   * for committing to the ledger.
   * @async
   * @param {...String} [args] Transaction function arguments.
   */
  async submit(...args: string[]) {
    this.setInvokedOrThrow();
    const network = this.contract.getNetwork();
    const channel = network.getChannel();
    const txId = this.transactionId;
    const transactionHandler = this.contract.getTransactionHandler(this.txnOptions);
    const chaincodeId = this.contract.getChaincodeId();
    const submitResponse = await transactionHandler.submit(
      channel,
      txId,
      this.name,
      chaincodeId,
      args,
    );
    return submitResponse;
  }
  /**
   * Checks if the transaction has already been invoked
   */
  setInvokedOrThrow() {
    if (this.isInvoked) {
      const errorMessage = 'Transaction has already been invoked';
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    this.isInvoked = true;
  }
  /**
   * Queries the instantiated chaincode and return its results.
   * The transaction function will be evaluated on the endorsing peers but
   * the ledger state would not be changed in any way.
   * This is used for querying the world state.
   * @async
   * @param {...String} [args] Transaction function arguments.
   */
  async evaluate(...args: string[]) {
    this.setInvokedOrThrow();

    const queryHandler = this.contract.getQueryHandler();
    const chaincodeId = this.contract.getChaincodeId();
    const network = this.contract.getNetwork();
    const channel = network.getChannel();
    return queryHandler.queryChaincode(
      chaincodeId,
      channel,
      this.transactionId,
      this.name,
      args,
    );
  }
}
