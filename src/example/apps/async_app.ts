import {Context, SQSEvent, SQSHandler, SQSMessageAttributes, SQSRecord} from "aws-lambda";


const worker: SQSHandler = async (event: SQSEvent, context: Context) => {
    const queueForResponse = 'sqsTestTsQueueResult'
    for (const record of event.Records) {
        const messageAttributes: SQSMessageAttributes = record.messageAttributes;
        const msg = JSON.parse(record.body)
        msg['originalMessageId'] = record.messageId
        const processedBody = JSON.stringify(msg).toUpperCase()
    }
};