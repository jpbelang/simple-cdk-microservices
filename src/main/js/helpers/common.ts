import {Context, EventBridgeEvent, SNSEvent} from "aws-lambda";
import middy from '@middy/core'
import * as AWS from 'aws-sdk'
import {Optional} from "typescript-optional";
import * as Process from "process";


export type ExtendedSNSEvent<T> = SNSEvent & {
    parsedMessage: T
}

export type ExtendedEventBridgeEvent<T> = EventBridgeEvent<string, object> & {
    parsedMessage: T
}

const log_call = (): middy.MiddlewareObj => {
    return {
        before: async (request): Promise<void> => {
            console.log("incoming event", JSON.stringify(request.event, null, 2))
        },
        after: async (request): Promise<void> => {
            console.log("successfully ran")
        },
        onError: async (request): Promise<Error> => {
            console.log("failed", request.error)
            return Promise.resolve(request.error!)
        }
    }
}

export const parse_sns_data = <T, B>(factory: (ev: ExtendedSNSEvent<T>, message: any) => T): middy.MiddlewareObj<ExtendedSNSEvent<T>, any> => {
    return {
        before: async (request): Promise<void> => {

            request.event.parsedMessage = factory(request.event, JSON.parse(request.event.Records[0].Sns.Message))
        }
    };
}

export const parse_eventbridge_data = <T, B>(factory: (ev: ExtendedEventBridgeEvent<T>, message: any) => T): middy.MiddlewareObj<ExtendedEventBridgeEvent<T>, any> => {
    return {
        before: async (request): Promise<void> => {

            request.event.parsedMessage = factory(request.event, request.event.detail)
        }
    };
}

export type Message<T> = {
    message: T
    type: string
    time: Date
}

export interface Publisher<T> {
    publish(message: Message<T>): Promise<PublishResult>
}

export interface PublisherFactory {

    create<T>(): Publisher<T>
}

export function fixed<T>(publisher: Publisher<T>): PublisherFactory {

    return new class implements PublisherFactory {
        create(): Publisher<any> {
            return publisher;
        }
    }
}

export class LambdaAwarePublisherFactory implements PublisherFactory {
    create<T>(): Publisher<T> {

        if (Optional.ofNullable(process.env['output']).orElse("__none__").match(/^arn:aws:sns:/)) {

            return new SNSPublisher<T>()
        } else if (Optional.ofNullable(process.env['output']).orElse("__none__").match(/^arn:aws:events:/)) {

            return new EventBridgePublisher()
        } else {

            return InProcessPublisher.publisher()
        }
    }
}

export type PublishResult = {
    MessageId: string,
    SequenceNumber: string
}

export class SNSPublisher<T> implements Publisher<T> {
    private client = new AWS.SNS({apiVersion: '2010-03-31'})

    async publish(message: Message<T>): Promise<PublishResult> {

        const result = await this.client.publish({
            Message: JSON.stringify(message.message),
            MessageAttributes: {
                "event-name": {
                    StringValue: message.type,
                    DataType: "String"
                },
                "event-time": {
                    StringValue: message.time.toISOString(),
                    DataType: "String"
                }
            },
            TopicArn: process.env['output']
        }).promise()

        return {
            MessageId: Optional.ofNullable(result.MessageId).orElse(""),
            SequenceNumber: Optional.ofNullable(result.SequenceNumber).orElse("0")
        }
    }
}

export class EventBridgePublisher<T> implements Publisher<T> {
    private client = new AWS.EventBridge({apiVersion: '2015-10-07'});

    async publish(message: Message<T>): Promise<PublishResult> {

        const result = await this.client.putEvents({

            Entries: [{
                Detail: JSON.stringify(message.message),
                DetailType: message.type,
                Time: message.time,
                EventBusName: process.env['output']
            }]

        }).promise()

        if (result.FailedEntryCount != 0) {
            return {
                MessageId: Optional.ofNullable(result.Entries![0].EventId).orElse(""),
                SequenceNumber: "0"
            }
        } else {
            throw new Error(result.Entries![0].ErrorMessage)
        }
    }
}

export class InProcessPublisher<M> implements Publisher<M> {

    private messages: Message<any>[] = []

    private static singlePublisher: InProcessPublisher<any> = new InProcessPublisher();

    public static publisher<M>(): InProcessPublisher<M> {
        return InProcessPublisher.singlePublisher
    }

    async publish(message: Message<any>): Promise<PublishResult> {

        this.messages.push(message)
        return {
            MessageId: "1",
            SequenceNumber: "1"
        }
    }

    public findFirstMessage(predicate: (check: Message<M>) => boolean): Optional<Message<M>> {

        return Optional.ofNullable(this.messages.filter(predicate)[0])
    }

    public findAllMessages<M>(predicate: (check: Message<M>) => boolean): Message<M>[] {

        return this.messages.filter(predicate)
    }

}