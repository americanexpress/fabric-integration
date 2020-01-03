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
import util from 'util';
import * as types from '../types';
import FabricClient from 'fabric-client';
import FabricClientLegacy from 'fabric-client-legacy';
import { getLogger } from '../utils/logger';
import EventHandler from './EventHandler';
const logger = getLogger('TransactionHandler');

const validatePeerResponses = (responses: any[]) => {
  if (!responses.length) {
    logger.error(
      'validatePeerResponses: No results were returned from the request',
    );
    throw new Error('No results were returned from the request');
  }

  const validResponses:
    | FabricClient.ProposalResponse[]
    | FabricClientLegacy.ProposalResponse[] = [];
  const invalidResponses: string[] = [];
  const invalidResponseMsgs: string[] = [];

  responses.forEach((responseContent: any) => {
    if (responseContent instanceof Error) {
      const { message } = responseContent;
      logger.warn(
        'validatePeerResponses: Received error response from peer:',
        responseContent,
      );
      invalidResponseMsgs.push(message);
      invalidResponses.push(responseContent.message);
    } else {
      logger.debug(
        'validatePeerResponses: valid response from peer %j',
        responseContent.peer,
      );
      validResponses.push(responseContent);
    }
  });

  if (validResponses.length === 0) {
    const messages = Array.of(
      `No valid responses from any peers.
       ${invalidResponseMsgs.length} peer error responses:`,
      ...invalidResponseMsgs,
    );
    const msg = messages.join('\n    ');
    logger.error(`validatePeerResponses: ${msg}`);
    throw new Error(msg);
  }

  return { validResponses, invalidResponses };
};

const eventHubHandler = (
  eventHubs: (
    | FabricClient.ChannelEventHub
    | FabricClientLegacy.ChannelEventHub)[],
  txIdString: string,
  txCustomEvents : types.TxnCustomEvent[],
  chaincodeId : string,
) => {
  const promises: Promise<any>[] = [];
  eventHubs.forEach((eh: any) => {
    const eventHandler = new EventHandler(eh);
    promises.push(eventHandler.registerTxEvent(txIdString, txCustomEvents, chaincodeId));
  });
  return promises;
};
/**
 * This class provides functionality to write to the ledger .
 * State change depends upon the approval of endorcing peers.
 */
export default class TransactionHandler implements types.TransactionHandler {
  private txnOptions : types.TransactionOptions;
  constructor(txnOptions?:types.TransactionOptions) {
    this.txnOptions = txnOptions;

  }

  /**
   * This method sets the transaction options for each request
   * @param {types.TransactionOptions} txnOptions - Transaction options
   */
  setTxnOptions(txnOptions: types.TransactionOptions) {
    this.txnOptions = txnOptions;
  }

  /**
   * This method submits the transaction to the ledger .Transaction will be evaluated on
   * endorsing peers and then submitted to the ordering service
   * for committing to the ledger.
   * @async
   * @param {FabricClient.Channel | FabricClientLegacy.Channel} channel - Hyperledger fabric channel
   *  object (module:fabric-client.Channel)
   * @param {FabricClient.TransactionId} txId - Transaction Id (module:fabric-client.TransactionId)
   * @param {string} fcn - Name of the chaincode function to be executed
   * @param {string} chaincodeId - Id of chaincode
   * @param {...string} [args] Transaction function arguments.
   */
  async submit(
    channel: FabricClient.Channel | FabricClientLegacy.Channel,
    txId: FabricClient.TransactionId,
    fcn: string,
    chaincodeId: string,
    args: string[],
  ) {
    let response;
    let results;
    const fabricChannel: any = channel;
    const submitResponse: types.ApiResponse = {
      status: types.Response.Failure,
      payload: 'null',
    };
    let promises = [];
    const txIdString: string = txId.getTransactionID();
    const errorMessage = [];
    const transientMap = this.txnOptions.transiantMap;
    const request : any = {
      chaincodeId,
      fcn,
      args,
      txId,
      transientMap,
    };
    if (this.txnOptions.transactionType === 'instantiate' || this.txnOptions.transactionType === 'upgrade') {
      request.chaincodeType = this.txnOptions.chaincodeType;
      request.chaincodeVersion = this.txnOptions.chaincodeVersion;
      delete request.transientMap;
      results = this.txnOptions.transactionType === 'instantiate' ?
      await fabricChannel.sendInstantiateProposal(request, 120000) :
       await fabricChannel.sendUpgradeProposal(request, 120000);
    } else {
      results = await fabricChannel.sendTransactionProposal(request);
    }
    const proposalResponses = results[0];
    const proposal = results[1];
    const { validResponses, invalidResponses } = validatePeerResponses(
      proposalResponses,
    );
    if (invalidResponses.length !== 0 || validResponses.length === 0) {
      throw new Error('Did not receive all valid proposal responses');
    }
    const eventHubs = fabricChannel.getChannelEventHubsForOrg();
    promises = eventHubHandler(eventHubs, txIdString, this.txnOptions.txnCustomEvent, chaincodeId);

    const ordererRequest = {
      proposal,
      proposalResponses: validResponses,
    };
    const sendPromise = fabricChannel.sendTransaction(ordererRequest);

    promises.push(sendPromise);
    const sendTxnResponce = await Promise.all(promises);

    response = sendTxnResponce.pop();
    if (response.status === types.Response.Success) {
      logger.info('Successfully sent transaction to the orderer.');
    } else {
      const message = util.format(
        'Failed to order the transaction. Error code: %s',
        response.status,
      );
      errorMessage.push(message);
      logger.debug(message);
    }
    sendTxnResponce.forEach((eventHubResult, index) => {
      const eventHub = eventHubs[index];
      logger.debug('Event results for event hub :%s', eventHub.getPeerAddr());
      logger.debug(eventHubResult);
    });
    if (errorMessage.length === 0) {
      submitResponse.status = types.Response.Success;
      submitResponse.payload = txIdString;
      return submitResponse;
    }
    submitResponse.status = types.Response.Failure;
    submitResponse.payload = errorMessage.toString();
    return submitResponse;
  }
}
