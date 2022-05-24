import {IEventSource, Function} from "aws-cdk-lib/aws-lambda";
import {Queue} from "aws-cdk-lib/aws-sqs";
import {Topic, ITopic, SubscriptionFilter} from "aws-cdk-lib/aws-sns";
import {IGrantable} from "aws-cdk-lib/aws-iam"
import {Optional} from "typescript-optional";
import {Construct} from "constructs";
import {Tags} from "aws-cdk-lib";
import {LambdaSubscription} from "aws-cdk-lib/aws-sns-subscriptions";
import {Publisher, SNSPublisher} from "./publishers";
import {SNSSubscriber, Subscriber} from "./subscribers";

type HandlerObjectList = { [key: string]: Handler }
type HandlerList = HandlerObjectList | Handler[]

export interface Configurator {
    id: string

    wantSecurity(z: Configurator): void;

    wantEnvironment(z: Configurator): void;

    wantInternalEventsSource(z: Configurator): void

    setEnvironment(setter: (key: string, value: string) => void): void

    grantSecurityTo(grantable: IGrantable): void

    receiveInternalEvents(setter: (source: IEventSource) => void): void

    listenToServiceTopic(topic: Subscriber, isTopicFifo: boolean): void;
}

export class DefaultConfigurator implements Configurator {

    readonly id: string;

    constructor(id: string) {
        this.id = id
    }

    setEnvironment(setter: (key: string, value: string) => void): void {
    }

    grantSecurityTo(grantable: IGrantable): void {
    }

    receiveInternalEvents(setter: (source: IEventSource) => void): void {
    }

    wantInternalEventsSource(z: Configurator): void {
    }

    wantEnvironment(z: Configurator): void {
    }

    wantSecurity(z: Configurator): void {
    }

    listenToServiceTopic(topic: Subscriber, isTopicFifo: boolean): void {
    }


}

export type TaggingType = { project: string } & { [key: string]: string; }
export type NonMandatoryTaggingType = { [key: string]: string; }
export type SubscriptionData = {
    lambda:Function,
    deadLetterQueue: Queue,
    events: string[]
}
type PublisherFactory = (data: MicroserviceBuilderData, parent: Construct) => Publisher;
type SubscriberFactory = (data: MicroserviceBuilderData, parent: Construct) => Subscriber;

export type HandlerOptions = {
    handlerName: string,
    publisher: Publisher,
    subscriber: Subscriber,
    env: string,
    deadLetterQueue(): Queue;
    deadLetterFifoQueue(): Queue,
    parentConstruct: Construct
}

export interface Handler {

    handle(config: HandlerOptions): Configurator
}

export interface ServiceListener {
    topic(): Subscriber

    isTopicFifo(): boolean

    listensForEventsFrom(services: ServiceListener[]): void
}

export function snsPublisher(): PublisherFactory {
    return (data: MicroserviceBuilderData, construct: Construct) => {

        const topic = new Topic(construct, data.name + "PublisherTopic", {
            topicName: data.name + "PublisherTopic"
        })

        return new SNSPublisher(topic);
    }
}

export function snsSubscriber(): SubscriberFactory {
    return (data: MicroserviceBuilderData, construct: Construct) => {

        const topic = new Topic(construct, data.name + "SubscriberTopic", {
            topicName: data.name + "SubscriberTopic"
        })

        return new SNSSubscriber(topic);
    }
}

type MicroserviceData = {
    env: string,
    orderedEvents: boolean,
    tags: TaggingType,
    parentName: string
    deadLetterQueue: () => Queue
    deadLetterFifoQueue: () => Queue
    subscriber: Subscriber
    publisher: Publisher
    parentConstruct: Construct
    handlers: HandlerList
    configurators: Configurator[]
}

export class Microservice implements ServiceListener {
    private readonly data: MicroserviceData;

    constructor(data: MicroserviceData) {
        this.data = data
    }

    topic(): Subscriber {
        return this.data.subscriber;
    }

    dlq(): Queue {
        return this.data.deadLetterQueue()
    }

    isTopicFifo(): boolean {
        return this.data.orderedEvents;
    }


    listensForEventsFrom(services: ServiceListener[]) {

        services.forEach(s => this.data.configurators.forEach(x => x.listenToServiceTopic(s.topic(), s.isTopicFifo())))
    }
}

type MicroserviceBuilderData = {
    name: string,
    env: string,
    tags: TaggingType,
    messagePublisher: PublisherFactory
    messageSubscriber: SubscriberFactory,
    handlers: HandlerList
}

export class MicroserviceBuilder {
    private readonly data: MicroserviceBuilderData;

    constructor(data: MicroserviceBuilderData) {
        this.data = data;
    }

    private asObject(handlers: HandlerList): HandlerObjectList {

        if (Array.isArray(handlers)) {

            const object: HandlerObjectList = {}
            handlers.map(x => object[x.constructor.name] = x)
            return object;
        } else {
            return handlers;
        }
    }

    build(construct: Construct): Microservice {

        const publisherConstruct = this.data.messagePublisher(this.data, construct);
        const subscriberConstruct = this.data.messageSubscriber(this.data, construct);

        let dlq: Queue
        let dlfq: Queue
        const deadLetterQueueFunction = () => {
            if (dlq == undefined) {
                dlq = new Queue(construct, this.data.name + "DeadLetterTopic", {
                        queueName: this.data.name + "DeadLetterQueue"
                    }
                )
            }

            return dlq
        };
        const deadLetterFifoQueueFunction = () => {
            if (dlfq == undefined) {
                dlfq = new Queue(construct, this.data.name + "DeadLetterTopicFifo", {
                        queueName: this.data.name + "DeadLetterQueue.fifo",
                        fifo: true
                    }
                )
            }
            return dlfq
        };

        const configurators = Object.entries(this.asObject(this.data.handlers)).map(([handlerName, handler]) => {
            const containingConstruct = new Construct(construct, handlerName)
            return handler.handle({
                env: this.data.env,
                publisher: publisherConstruct,
                subscriber: subscriberConstruct,
                parentConstruct: containingConstruct,
                handlerName: handlerName,
                deadLetterQueue: deadLetterQueueFunction,
                deadLetterFifoQueue: deadLetterFifoQueueFunction
            });
        })

        configurators.forEach((c) => configurators.filter(e => e.id != c.id).forEach(e => {
            c.wantEnvironment(e)
            c.wantSecurity(e)
            c.wantInternalEventsSource(e)
        }))

        Object.entries(this.data.tags).forEach(([k, v]) => Tags.of(construct).add(k, v))

        return new Microservice({
            env: this.data.env,
            orderedEvents: subscriberConstruct.isFifo(),
            parentConstruct: construct,
            parentName: this.data.name,
            publisher: publisherConstruct,
            subscriber: subscriberConstruct,
            deadLetterQueue: deadLetterQueueFunction,
            deadLetterFifoQueue: deadLetterQueueFunction,
            handlers: this.data.handlers,
            configurators: configurators,
            tags: this.data.tags
        })
    }

    static microservice(data: MicroserviceBuilderData): MicroserviceBuilder {
        return new MicroserviceBuilder(data)
    }
}