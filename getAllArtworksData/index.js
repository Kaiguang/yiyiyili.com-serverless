const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();

const TableName = process.env.DYNAMODB_TABLE_NAME_ARTWORKS;

const scanTable = () => {
  return new Promise((resolve, reject) => {
    const scanParams = {
      TableName,
      ExpressionAttributeNames: {
        "#name": "name",
        "#size": "size",
      },
      ProjectionExpression: "id, #name, price, qty, #size",
    };

    const scanCallback = (err, data) => {
      if (err) {
        console.error(
          "Unable to scan the table. Error JSON:",
          JSON.stringify(err, null, 2)
        );
        reject({
          statusCode: 500,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify(err, null, 2),
        });
      } else {
        resolve({
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify(data, null, 2),
        });
      }
    };

    docClient.scan(scanParams, scanCallback);
  });
};

exports.handler = async () => {
  try {
    const response = await scanTable();
    return response;
  } catch (error) {
    return error;
  }
};
