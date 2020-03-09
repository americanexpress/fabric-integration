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
/**
 * This class provides functionality to read the world state of ledger .
 * It does not change the state of ledger . To change state of ledger
 *  see [[TransactionHandler]]
 */
export default class QueryHandler implements types.QueryHandler {
  private targets: FabricClient.Peer[];

  constructor(peerList: FabricClient.Peer[]) {
    this.targets = peerList;
  }
  /**
   * Queries the instantiated chaincode and return its results.
   * The transaction function will be evaluated on the endorsing peers but
   * the ledger state would not be changed in any way.
   * This is used for querying the world state.
   * @async
   * @param {string} chaincodeId - Chaincode id
   * @param {FabricClient.Channel} channel -
   *  Hyperledger fabric channel object (module:fabric-client.Channel)
   * @param {TransactionId} txId - TransactionId (module:fabric-client.TransactionId)
   * @param {string} fcn - Name of the chaincode function to be executed
   * @param {...string} [args] Transaction function arguments.
   */
  public async queryChaincode(
    chaincodeId: string,
    channel: FabricClient.Channel,
    txId: FabricClient.TransactionId,
    fcn: string,
    args: string[],
  ) {
    const response: types.ApiResponse = {
      status: types.Response.Failure,
      payload: null,
    };
    const queryRequest = {
      chaincodeId,
      txId,
      fcn,
      args,
      targets: this.targets,
    };
    const responsePayloads = await channel.queryByChaincode(queryRequest);
    if (responsePayloads) {
      const payload = responsePayloads.map(item => item.toString('utf8'));
      response.status = types.Response.Success;
      response.payload = payload;
    }
    return response;
  }
}
