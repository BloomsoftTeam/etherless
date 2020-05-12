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
TODO