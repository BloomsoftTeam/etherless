import { expect, assert } from 'chai';
import { describe, it } from 'mocha';
import AWSManager from '../server/AWSManager';
import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';

// se li pesca dai secret di github, in locale fa undefined
const AWS_ID = process.env.AWS_ID;
const AWS_KEY= process.env.AWS_KEY;
const AWS_LAMBDA_ROLE = process.env.AWS_LAMBDA_ROLE;
// console.log(AWS_ID);
// console.log(AWS_KEY);
// console.log(AWS_LAMBDA_ROLE);
const config = new AWS.Config({
  accessKeyId: AWS_ID,
  secretAccessKey: AWS_KEY,
  region: 'eu-west-2',
});
const lambda = new AWS.Lambda(config);
const docClient = new AWS.DynamoDB.DocumentClient(config);
const awsManager = new AWSManager(AWS_ID, AWS_KEY, AWS_LAMBDA_ROLE);
const table = 'etherless';
const funcName = 'FunctionDeployedTesting';
const devAddress = 'TestingDevAddress';
const description = 'random description just for testing';
const params = 'void';
const price = 1;
const unavailable = 'false';
const usage = 'use only for testing, don\'t run this function';
const queryParams = {
  TableName: table,
  Key: {
    devAddress,
    funcName 
  }
};
const recordParam = {
  TableName: table,
  Item: {
    devAddress,
    funcName,
    description,
    params,
    price,
    unavailable,
    usage,
  },
};
const JSONpayLoad = {
  params: [3, 4],
};
const payLoad = JSON.stringify(JSONpayLoad);
const lambdaFuncName = 'sommaTesting';
const testingPath = path.resolve('test/DeployDeleteTestingFiles/');
const zipFile = fs.readFileSync(`${testingPath}/etherlessDeployTesting.zip`);
const configFile = JSON.parse((fs.readFileSync(`${testingPath}/etherlessDeployTesting.json`)).toString());
const deleteDBParams = {
  TableName: table,
  Key: {
    devAddress: 'TestingAdminAddress',
    funcName: 'EtherlessDeployTesting'
  }
};
const deleteLambdaParams = {
  FunctionName: 'EtherlessDeployTesting'
};

describe('updateRecord', () => {
  it('updateRecord is working', (done) => {
    new Promise((resolve, reject) => {
      docClient.put(recordParam, (err, data) => {
        if (err) {
          console.log(err);
          reject(new Error('Can\'t create record for testing'));
        } else {
          awsManager.updateRecord(funcName, devAddress)
            .then(() => {
              docClient.get(queryParams, (err2, data2) => {
                docClient.delete(queryParams, (err3) => {
                  if (err2 || err3) {
                    console.log(err2);
                    console.log(err3);
                    reject(new Error('Can\'t get or delete record after update for testing'));
                  }
                  expect(data2.Item.unavailable).to.be.equal('true');
                  done();
                  resolve();
                });
              });
            }).catch((err3) => {
              console.log(err3);
              docClient.delete(queryParams, (err4) => {
                if (err4){
                  console.log(err4);
                  reject(new Error('Can\'t delete record after test fail'))
                }
              });
              reject(new Error('Can\'t update record for testing'));
            });
        }
      });
    }).catch(assert.fail);
  });
});

describe('deployFunction', () => {
  it('deployFunction is working', (done) => {
    new Promise((resolve, reject) => {
      awsManager.deployFunction(zipFile, configFile)
        .then(() => {
          docClient.delete(deleteDBParams, (err, data) => {
            if (err) {
              reject(new Error(err.toString()));
            } else {
              lambda.deleteFunction(deleteLambdaParams, (err2, data2) => {
                if (err2) {
                  reject(new Error(err2.toString()));
                } else {
                  done();
                  resolve();
                }
              })
            }
          })
        }).catch((error) => {
          reject(error);
        }); 
    }).catch(assert.fail);
  });
});

// Necessaria la funzione sommaTesting su AWS Lambda nello stesso stile della somma di esempio
describe('invokeLambda', () => {
  it('invokeLambda is working', (done) => {
    new Promise((resolve, reject) => {
      awsManager.invokeLambda(lambdaFuncName, payLoad)
        .then((result) => {
          const lambdaResult = JSON.parse(JSON.parse(result.Payload).body).sum;
          expect(lambdaResult).to.be.equal(7);
          done();
          resolve();
        }).catch(reject);
    }).catch(assert.fail);
  });
});


describe('deleteFunction', () => {
  it('deleteFunction is working', (done) => {
    const lambdaParams = {
      Code: {
        ZipFile: zipFile,
      },
      Description: configFile.description,
      FunctionName: configFile.funcName,
      Handler: `${configFile.indexPath}.handler`,
      MemorySize: 128,
      Publish: true,
      Role: AWS_LAMBDA_ROLE,
      Runtime: 'nodejs12.x',
      Timeout: configFile.timeout,
      VpcConfig: {
      },
    };
    new Promise((resolve, reject) => {
      lambda.createFunction(lambdaParams, (err, data) => {
        if (err) {
          reject(err);
        }

        const unavailable = 'false';
        const itemValue = {
          TableName: table,
          Item: {
            devAddress: configFile.owner,
            funcName: configFile.funcName,
            description: configFile.description,
            params: configFile.params,
            price: configFile.fee,
            unavailable: unavailable,
            usage: configFile.usage,
          },
        };
        docClient.put(itemValue, (docErr, docData) => {
          if (docErr) {
            reject(docErr);
          } else {
            awsManager.deleteFunction(configFile.funcName, configFile.owner)
              .then(() => {
                done();
                resolve();
              }).catch((error) => {
                console.log(error);
                reject(new Error(error));
              });
          }
        });
      });
    }).catch(() => {
      const deleteDBParams2 = {
        TableName: table,
        Key: {
          devAddress: configFile.owner,
          funcName: configFile.funcName
        }
      };
      const deleteLambdaParams2 = {
        FunctionName: configFile.funcName
      };
      docClient.delete(deleteDBParams2, (err, data) => {
        if (err) {
          assert.fail('Unable to delete item');
        } else {
          lambda.deleteFunction(deleteLambdaParams2, (err2, data2) => {
            if (err2) {
              assert.fail('Unable to delete lambda');
            } else {
              assert.fail('Test failed, function deleted with success');
            }           
          })
        }
      })
    });
  });
});