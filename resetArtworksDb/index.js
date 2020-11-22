const AWS = require("aws-sdk");
const dynamoDb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();
const { artworks } = require("./artworks.js");

const TableName = process.env.DYNAMODB_TABLE_NAME_ARTWORKS;

const deleteTableAndCheckStatusAndContinue = () => {
  dynamoDb.deleteTable({ TableName }, (err, data) => {
    if (err) {
      if (err.code === "ResourceNotFoundException") {
        checkStatusCreateAndPopulateTable();
      } else {
        console.error(`DeleteTable failed:\n${JSON.stringify(err, null, 2)}`);
      }
    } else {
      console.log(`DeleteTable success:\n${JSON.stringify(data, null, 2)}`);
      console.log(`Checking TableStatus in 5 seconds...`);
      setTimeout(checkStatusCreateAndPopulateTable, 5000);
    }
  });
};

const createTable = () => {
  dynamoDb.createTable(
    {
      TableName,
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
      BillingMode: "PAY_PER_REQUEST",
      Tags: [{ Key: "projectName", Value: "yiyiyili.com" }],
    },
    (err, data) => {
      if (err) {
        console.error(`CreateTable failed:\n${JSON.stringify(err, null, 2)}`);
      } else {
        console.log(`CreateTable success:\n${JSON.stringify(data, null, 2)}`);
        console.log(`Checking TableStatus in 5 seconds...`);
        setTimeout(checkStatusCreateAndPopulateTable, 5000);
      }
    }
  );
};

const populateTable = () => {
  const timeUpdated = new Date().toISOString();

  artworks.forEach((work) => {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_ARTWORKS,
      Item: {
        id: work.id,
        size: work.size,
        price: work.price,
        qty: work.qty,
        name: work.name,
        timeUpdated,
      },
    };

    docClient.put(params, function (err) {
      if (err) {
        console.error(JSON.stringify(err, null, 2));
      } else {
        console.log(`PutItem success:\n${JSON.stringify(params, null, 2)}`);
      }
    });
  });
};

const checkStatusCreateAndPopulateTable = () => {
  dynamoDb.describeTable({ TableName }, (err, data) => {
    if (err) {
      if (err.code === "ResourceNotFoundException") {
        console.log(`Table ${TableName} not found, creating a new one...`);
        createTable();
      } else {
        console.error(`DescribeTable failed:\n${JSON.stringify(err, null, 2)}`);
      }
    } else if (data.Table.TableStatus === "ACTIVE") {
      console.log(
        `Current TableStatus ${data.Table.TableStatus}, populating table...`
      );
      populateTable();
    } else if (data.Table.TableStatus !== "ACTIVE") {
      console.log(
        `Current TableStatus ${data.Table.TableStatus}, will check again in 5 seconds...`
      );
      setTimeout(checkStatusCreateAndPopulateTable, 5000);
    }
  });
};

exports.handler = () => {
  deleteTableAndCheckStatusAndContinue();
};
