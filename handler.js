const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const {
	QueryCommand,
	PutItemCommand,
} = require("@aws-sdk/client-dynamodb");

const express = require("express");
const serverless = require("serverless-http");

const app = express();

const MESSAGES_TABLE = 'messages';

const client = new DynamoDBClient({
	region: "localhost",
	endpoint: "http://0.0.0.0:8000",
	credentials: {
		accessKeyId: "MockAccessKeyId",
		secretAccessKey: "MockSecretAccessKey",
	},
});

app.use(express.json());

app.get("/messages", async (_, res) => {
	try {
		const queryRes = await client.send(new QueryCommand({
			TableName: MESSAGES_TABLE,
			ExpressionAttributeValues: marshall({
				":topic": "masterclass"
			}),
			KeyConditionExpression: "topic = :topic",
			ScanIndexForward: false
		}));
		console.log("query successful")
		return res.status(200).json(queryRes.Items.map(unmarshall).map((item) => {
			return {
				"email": item.email,
				"message": item.message,
				"ts": item.ts
			}
		}));
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: "Could not retrieve user" });
	}
});

app.post("/messages", async (req, res) => {
	const { email, message } = req.body;
	if (typeof email !== "string" || email === "") {
		res.status(400).json({ error: 'invalid email' });
	} else if (typeof message !== "string" || message === "") {
		res.status(400).json({ error: 'invalid message' });
	}

	try {
		const command = new PutItemCommand({
			TableName: MESSAGES_TABLE,
			Item: marshall({
				topic: 'masterclass',
				ts: Date.now(),
				email: email,
				message, message
			}),
		});
		await client.send(command);
		res.status(201).end();
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Could not write message" });
	}
});

app.use((req, res) => {
	return res.status(404).json({
		error: "Not Found",
	});
});

exports.handler = serverless(app);
