# Fabric Integration

Fabric Integration is a high-level framework that abstracts connectivity details and focuses on the business aspects.It allows you to interact with hyperledger fabric network , which could be running on your local machine or remote server. It also connects to networks running on Blockchain as Service (BaaS) platforms.

## **Apis**

You can use this project to do the following

- Register user (supports both ca-server and local keystore)
- Query chaincode (evaluate)
- Invoke chaincode (submit)
- Install chaincode
- Instantiate chaincode
## **Getting Started**

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See usage for notes on how to use this project to connect to your running fabric network.

### Prerequisites

What things you need to install the software and how to install them

```
Node >=8.9.4 <9.0
yarn
```

### Installing

A step by step series of examples that tell you how to get a development env running

Download and Install

```
git clone {repo-url}
cd fabric-integration
yarn
```

## Running tests and eslint

Connection profile files for tests are located in `src/test/config` directory

### Unit tests

```
yarn test
```

### Integration tests

There are different scenarios for integration tests, each is listed below

> **Integration with local `Latest-(V4/V3/V2)` network.**

```
yarn test:integration:latest
```

For this command to work you should have V1.2/V1.3/V1.4 fabric network running on your local machine. You can use following steps to run fabric v1.4 network on you local.

1. Open up new terminal window and execute following script. This will spin up version 1.4 fabric network

```sh
cd $HOME && mkdir blockchain-fabric-v4 && cd blockchain-fabric-v4
git clone -b release-1.4 https://github.com/hyperledger/fabric-samples.git
cd fabric-samples/balance-transfer
./runApp.sh
```

2. Open new terminal and execute below script. This will initialize your fabric network with users, chaincode, channnel etc

```sh
cd $HOME/blockchain-fabric-v4/fabric-samples/balance-transfer
./testAPIs.sh
```

> **Integration with local `Legacy-(V1)` network.**

```
yarn test:integration:legacy
```

For this command to work you should have V1.1 fabric network running on your local machine. You can use following steps to run fabbric v1.1 network on you local. Make sure you run this network using V1.1 docker images, one way to achieve that is to change image tags in docker compose and base files

1. Open up new terminal window and execute following script. This will spin up version 1.4 fabric network

```sh
cd $HOME && mkdir blockchain-fabric-v1 && cd blockchain-fabric-v1
git clone -b release-1.1 https://github.com/hyperledger/fabric-samples.git
cd fabric-samples/balance-transfer
./runApp.sh
```

2. Open new terminal and execute below script. This will initialize your fabric network with users, chaincode, channnel etc

```sh
cd $HOME/blockchain-fabric-v1/fabric-samples/balance-transfer
./testAPIs.sh
```

### eslint

```
yarn lint
```

## Documentation

```
yarn docs
```

Run above command to generate documentation. You can find documentation under `docs`directory. Open `docs/index.html`in you browser to see documentation.

## Usage

### Install the package

`yarn add fabric-integration`

### Example

```javascript
import Gateway from "fabric-integration";

try {
  /* For versions lower than 1.1 use
     const gateway = new Gateway(true);
     For more details check documentation.*/

  const storePath = path.join(__dirname, "path to wallet");
  const configLocation = path.join(__dirname, "path to configuration file");
  const chaincodeId = "chaincode_example02";
  const identity = "bcUser";

  const gateway = new Gateway();
  await gateway.connect(
    configLocation,
    {
      identity,
      keystore: storePath
    }
  );

  const network = await gateway.getNetwork(channelName);

  /* Install chaincode */
  const chaincodeSpec = {language:'node', version:'1.0.0', uploadType:'zip'}
  const chaincodeBuffer =  readfile('path/to/chaincode_example02.zip or chaincode_example02.cds');
  let installResult = await network.installContract(chaincodeId, chaincodeBuffer, chaincodeSpec);
  console.log(`--${installResult.payload}--`);

  /* Instantiate chaincode */

  const resultInstantiate = await network.instantiateContract(chaincodeId,chaincodeSpec, 'init', ['a', '100', 'b', '200']);
  console.log(`--${resultInstantiate.payload}--`);

  /* Upgrade chaincode */
  
  chaincodeSpec.version='1.0.1';
  const resultUpgrade = await network.upgradeContract(chaincodeId,chaincodeSpec, 'init', ['a', '100', 'b', '200']);
  console.log(`--${resultUpgrade.payload}--`);

  const contract = network.getContract(chaincodeId);

  /* Query chaincode */
  let result = await contract.createTransaction("query").evaluate("a");
  console.log(`--${result.payload}--`);

  /* Register events (chaincode event listners)
  #####################################################################
  ### const transaction = await contract.createTransaction("move"); ###
  ### transaction.addEventListner('testEvent', () => {});           ###
  ### transaction.submit("a", "b", "10");                           ###
  #####################################################################
  */

  /* Add Transaiant fields (e.g passing keys for encryption/decryption)
  #####################################################################
  ### const transaction = await contract.createTransaction("move"); ###
  ### transaction.setTransient({"encrypt-key":"abc","iv":"xyz"});   ###
  ### transaction.submit("a", "b", "10");                           ###
  #####################################################################
  */

  /* Submit Transaction */
  result = await contract.createTransaction("move").submit("a", "b", "10");
  console.log(`--${result.payload}--`);
  gateway.disconnect();
} catch (error) {
  console.error(`Error: ${error}`);
}
```

## Authors

* Tajamul Fazili <tajamul.fazili@aexp.com> [TajamulFazili](https://github.com/tajamulfazili)
* Andras L Ferenczi <andras.l.ferenczi@aexp.com> [andrasfe](https://github.com/andrasfe)

## Contributing

We welcome Your interest in the American Express Open Source Community on Github. Any Contributor to any Open Source
Project managed by the American Express Open Source Community must accept and sign an Agreement indicating agreement to
the terms below. Except for the rights granted in this Agreement to American Express and to recipients of software
distributed by American Express, You reserve all right, title, and interest, if any, in and to Your Contributions.
Please [fill out the Agreement](https://cla-assistant.io/americanexpress/fabric-integration).

Please feel free to open pull requests and see `CONTRIBUTING.md` for commit formatting details.

## License

Any contributions made under this project will be governed by the [Apache License 2.0](LICENSE.txt).

## Code of Conduct

This project adheres to the [American Express Community Guidelines](CODE_OF_CONDUCT.md). By participating, you are
expected to honor these guidelines.
