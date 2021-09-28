import {Context, SNSEvent, SNSHandler, SQSEvent, SQSHandler, SQSMessageAttributes, SQSRecord} from "aws-lambda";
import {SQS} from "aws-sdk";
import Process from "process";

export function localQueueEnvName(handler: string): string|undefined {

    return Process.env[ `async_${handler.replace(/\./, "_")}_Queue`]
}

export const worker: SNSHandler = async (event: SNSEvent, context: Context) => {

    const sqs = new SQS({
        apiVersion: "latest"
    })

    console.log("received event");

    await sqs.sendMessage({
        MessageBody: event.Records[0].Sns.Message,
        QueueUrl: localQueueEnvName("async_app.worker")!
    }).promise()
};