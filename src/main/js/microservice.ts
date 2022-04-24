import {IEventSource, Function} from "aws-cdk-lib/aws-lambda";
import {Queue} from "aws-cdk-lib/aws-sqs";
import {Topic, ITopic, SubscriptionFilter} from "aws-cdk-lib/aws-sns";
import {IGrantable} from "aws-cdk-lib/aws-iam"
import {Optional} from "typescript-optional";
import {Construct} from "constructs";
import {Tags} from "aws-cdk-lib";
import {LambdaSubscription} from "aws-cdk-lib/aws-sns-subscriptions";

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

    listenToServiceTopic(topic: Publisher, isTopicFifo: boolean): void;
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

    listenToServiceTopic(topic: Publisher, isTopicFifo: boolean): void {
    }


}

export type TaggingType = { project: string } & { [key: string]: string; }
export type NonMandatoryTaggingType = { [key: string]: string; }
export type SubscriptionData = {
    lambda:Function,
    deadLetterQueue: Queue,
    events: string[]
}
type ReceiverFactory = (data: MicroserviceBuilderData, parent: Construct) => Publisher;
export interface Publisher {
    allowPublish(grantable: IGrantable): void
    subscribeLambda(data: SubscriptionData): void
    isFifo(): boolean
    identifier(): string
}

export type HandlerOptions = {
    handlerName: string,
    publisher: Publisher,
    env: string,
    deadLetterQueue(): Queue;
    deadLetterFifoQueue(): Queue,
    parentConstruct: Construct
}

export interface Handler {

    handle(config: HandlerOptions): Configurator
}

export interface ServiceListener {
    topic(): Publisher

    isTopicFifo(): boolean

    listensForEventsFrom(services: ServiceListener[]): void
}

export class SNSPublisher implements Publisher {

    constructor(private topic: ITopic) {

    }

    allowPublish(grantable: IGrantable): void {
        this.topic.grantPublish(grantable)
    }
    identifier(): string {
        return this.topic.topicArn;
    }
    isFifo(): boolean {
        return false;
    }
    subscribeLambda(data: SubscriptionData) {

        const subscription = new LambdaSubscription(data.lambda, {
            filterPolicy: {
                "event-name": SubscriptionFilter.stringFilter({
                    allowlist: data.events
                })
            },
            deadLetterQueue: data.deadLetterQueue
        })
        this.topic.addSubscription(subscription)
    }

}

export function snsReceiver(): ReceiverFactory {
    return (data: MicroserviceBuilderData, construct: Construct) => {

        const topic = new Topic(construct, data.name + "Topic", {
            topicName: data.name + "Topic"
        })

        return new SNSPublisher(topic);
    }
}

type MicroserviceData = {
    env: string,
    orderedEvents: boolean,
    tags: TaggingType,
    parentName: string
    deadLetterQueue: () => Queue
    deadLetterFifoQueue: () => Queue
    topic: Publisher
    parentConstruct: Construct
    handlers: HandlerList
    configurators: Configurator[]
}

export class Microservice implements ServiceListener {
    private readonly data: MicroserviceData;

    constructor(data: MicroserviceData) {
        this.data = data
    }

    topic(): Publisher {
        return this.data.topic;
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
    messageReceiver: ReceiverFactory,
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

        const receiverConstruct = this.data.messageReceiver(this.data, construct);

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
                publisher: receiverConstruct,
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
            orderedEvents: receiverConstruct.isFifo(),
            parentConstruct: construct,
            parentName: this.data.name,
            topic: receiverConstruct,
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