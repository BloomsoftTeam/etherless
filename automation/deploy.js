const fs = require('fs');
const { exec } = require("child_process");

const serverlessDirectory = (__dirname + '/serverless');
const deployEc2Directory = (__dirname + '/deploy-ec2');

exec(`cd ${serverlessDirectory} && npm i && node_modules/serverless/bin/serverless config credentials --provider aws --key ${process.env.AWS_ID} --secret ${process.env.AWS_KEY} --overwrite && node_modules/serverless/bin/serverless deploy`, (error, stdout, stderr) => {
  if (error) {
    console.log(error);
    return;
  }

  console.log(stdout);
  exec(`cd ${deployEc2Directory} && npm i && node deploy-ec2.js`, (error, stdout, stderr) => {
    if (error) {
      console.log(error);
      return;
    }
  
    console.log(stdout);
  });
});




