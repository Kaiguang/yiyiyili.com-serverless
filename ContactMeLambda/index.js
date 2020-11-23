const AWS = require("aws-sdk");
const sesv2 = new AWS.SESV2();
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { name, email, message } = JSON.parse(event.body);

  try {
    await sendEmail(name, email, message);
  } catch (error) {
    return {
      statusCode: 500,
      body: `AWS SES error: ${error}`,
    };
  }

  try {
    await putMsgToDynamodb(name, email, message);
  } catch (error) {
    return {
      statusCode: 500,
      body: `DynamoDB error: ${error}`,
    };
  }

  return { statusCode: 200 };
};

const sendEmail = (name, email, message) => {
  const emailString = `Name: ${name}
Email: ${email}

${message}
`;

  const params = {
    Destination: {
      ToAddresses: ["hello@yiyiyili.com"],
    },
    FromEmailAddress: "hello@yiyiyili.com",
    Content: {
      Simple: {
        Body: {
          Text: {
            Data: emailString,
            Charset: "UTF-8",
          },
        },
        Subject: {
          Data: `Message from ${name}`,
          Charset: "UTF-8",
        },
      },
    },
  };

  return new Promise((resolve, reject) => {
    sesv2.sendEmail(params, (err) => {
      if (err) {
        console.log(`SESV2 sendEmail error: ${JSON.stringify(err, null, 2)}`);
        console.log(err, err.stack);
        reject(
          `Unable to send AWS SES email. Error JSON: ${JSON.stringify(
            err,
            null,
            2
          )}`
        );
      } else {
        console.log(`SESV2 sendEmail successful.`);
        resolve({ message: `AWS SES email sent successful` });
      }
    });
  });
};

const putMsgToDynamodb = (name, email, message) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE_NAME_CONTACT_ME,
    Item: {
      "time+email": `${new Date().toISOString()}+${email}`,
      name,
      email,
      message,
    },
  };

  return new Promise((resolve, reject) => {
    docClient.put(params, function (err) {
      if (err) {
        console.log(err);
        reject(
          `Unable to create item. Error JSON: ${JSON.stringify(err, null, 2)}`
        );
      } else {
        resolve({ message: `Create item success` });
      }
    });
  });
};
