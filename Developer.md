# Etherless
In this file there are the instructions for future developers who will improves the platform.

## Pre-requisites
- ```nodejs v12.13.0``` or above installed on your computer;
- ```serverless``` installed globally on your machine (```npm install -g serverless```);
- ```aws-sdk``` installed on the directory you are working. 

## Cli Installation and usage
- open a terminal window;
- clone the ```etherless repository```, using ```git clone https://github.com/BloomsoftTeam/etherless.git```;
- move inside the ```etherless``` directory and, by command line, type ```npm install```;
- differently from the user version, the cloned repository is wrote in ```TypeScript```, so, instead of typing ```etherless [command]```, you need to type ```ts-node cli/index.ts [command]``` to execute a user-like command (always from the ```etherless``` directory).

## Deploy of AWS Services
This section refer to the deploy of ```etherless DynamoDB table```, ```API Gateway``` to handle database interaction, and ```AWS Lambda function``` creation and removal.
- open a terminal inside the ```etherless/serverless``` directory;
- check the ```serverless.yml``` and ```app.js``` files for ```table configuration``` and ```API Gateway endpoint configuration```, and ```Lambda integration (endpoint implementation)```; 
- if you change the ```serverless.yml``` file, you need to delete the ```AWS CloudFormation Stack``` (which will delete all the resources previously deployed), or the deploy will be rejected (remember that ```API Gateway id endpoint will change```);
- if you added some ```node modules``` to the ```app.js``` file, you need to update the ```package.json``` file and the ```node_modules``` directory by typing ```npm install```;
- type ```serverless deploy``` to deploy into ```AWS``` the new modification;
- update the ```SERVER_EDGE``` in the ```.env``` file with the new prefix of ```API endpoint``` (if necessary), for example ```SERVER_EDGE=https://API_ID.execute-api.eu-west-2.amazonaws.com/dev/```.

## Deploy of AWS EC2 Istance
TODO

## Deploy of Smart Contracts
The @openzeppelin/cli npm module is needed to handle the lifecycle of smart contracts.
After you install it, you can create a new open zeppelin project with the command ```oz init```, which then asks you for a project name and a version number.
That command will initialize the directory creating a ```contracts``` and a ```.openzeppelin``` directory.
Once you've done that, you need to initialize the directory as a nodejs projects too, using the command ```npm init -y```, which will create a ```package.json``` file.
Now, all you need to do is to create a ```networks.js``` file to specify the networks you want to your smaert contracts to interact with.
Since we're working with upgradable smart contracts you also need to install the module @openzeppelin/upgrades and you also another module @openzeppelin/contracts-ethereum-package since we're inheriting the Ownable functionality provided by the Ownable contract defined by Open Zeppelin.
You can install them with a single command ```npm i --save-dev @openzeppelin/upgrades @openzeppelin/contracts-ethereum-package```.
Now, you're all set up and you can start interact with the smart contracts.

First, you need to compile the smaert contracts with the command ```oz compile```.
Then, you can deploy the contracts with the command ```oz deploy``` which will asks you which kind of contracts you're deploying (either upgradable or not) and then which network you want to deploy it in.
At the end of the deployment, open zeppelin will ask you if you want to call a function of the contract (usually to let you call an initialize function).

In the case of a deployment in a public network, you'll need to verify the contract after the deployment of it.
All you need to do is calling the command ```oz verify``` then select the contract you want to verify and then the service you want to use to verify it (we're using the service etherscan).
