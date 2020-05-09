// app.js 
const sls = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express')
const app = express()
const AWS = require('aws-sdk');
const TABLE_NAME = 'etherless';
const hiddenIndex = 'unavailable-index';
const ownerIndex = 'devAddress-index';
const cors = require ('cors');
const fileUpload = require ('express-fileupload');
const config = { accessKeyId: process.env.AWS_ID, secretAccessKey: process.env.AWS_KEY, region: 'eu-west-2' };
const dynamoDb = new AWS.DynamoDB.DocumentClient(config);

app.use(bodyParser.json({ strict: false }));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload({
  createParentPath: true,
  limits: {
    fileSize: 50 * 1024 * 1024 * 1024,
  },
}));

// List generico (funzioni disponibili)
app.get('/list', function (req, res) {
  const parametri = {
    TableName: TABLE_NAME,
    IndexName: hiddenIndex,
    KeyConditionExpression: "unavailable = :availableFun",
    ExpressionAttributeValues: {
      ":availableFun": "false"
    },
  };
  dynamoDb.query(parametri, (error, result) => {
    if (error) {
      res.status(400).json({ error: `Could not get available functions` });
    }
    if (result) {
      if(result.Count == 0){
        res.status(404).json({ error: `There isn't any available function` });
      }
      res.status(200).json(result.Items);
    } else {
      res.status(404).json({ error: `There isn't any available function` });
    }
  });
})
// Etherless List --hidden
app.get('/list/hidden', function (req, res) {
  const parametri = {
    TableName: TABLE_NAME,
    IndexName: hiddenIndex,
    KeyConditionExpression: "unavailable = :availableFun",
    ExpressionAttributeValues: {
      ":availableFun": "true"
    },
  };
  dynamoDb.query(parametri, (error, result) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: `Could not get hidden functions` });
    }
    if (result) {
      if(result.Count == 0){
        res.status(404).json({ error: `There isn't any hidden function` });
      }
      res.status(200).json(result.Items);
    } else {
      res.status(404).json({ error: `There isn't any hidden function` });
    }    
  });
})
// Etherless List --owner
app.get('/list/owner/:devAddress', function (req, res) {
  const parametri = {
    TableName: TABLE_NAME,
    IndexName: ownerIndex,
    KeyConditionExpression: "devAddress = :ownerAddress",
    ExpressionAttributeValues: {
      ":ownerAddress": req.params.devAddress
    },
  };
  dynamoDb.query(parametri, (error, result) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: `Could not get owned functions` });
    }
    if (result) {
      if(result.Count == 0){
        res.status(404).json({ error: `You don't own any function` });
      }
      res.status(200).json(result.Items);
    } else {
      res.status(404).json({ error: `You don't own any function` });
    }
  });
})
// Etherless Search endpoint
app.get('/search/:keyword', function(req, res){
  const parametri = {
    TableName: TABLE_NAME,
    IndexName: hiddenIndex,
    ExpressionAttributeValues: {
        ':fName': req.params.keyword,
        ':descrizione': req.params.keyword,
        ':availableFun': "false"
    },
    KeyConditionExpression: 'unavailable = :availableFun',
    FilterExpression: 'contains (funcName, :fName) OR contains (description, :descrizione)'
  };
  dynamoDb.query(parametri, (error, result) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: `Could not get functions` });
    }
    if (result) {
      if(result.Count == 0){
        res.status(404).json({ error: `There isn't any function with the keyword ${req.params.keyword} searched` });
      }
      res.status(200).json(result.Items);
    } else {
      res.status(404).json({ error: `There isn't any function with the keyword ${req.params.keyword} searched` });
    }
  })
});
module.exports.server = sls(app)
