import {IEventSource} from "aws-cdk-lib/aws-lambda";
import {Queue} from "aws-cdk-lib/aws-sqs";
import {Topic, ITopic} from "aws-cdk-lib/aws-sns";
import {IGrantable} from "aws-cdk-lib/aws-iam"
import {Optional} from "typescript-optional";
import {Construct} from "constructs";
import {Tags} from "aws-cdk-lib";

export interface Configurator {
    id: string

    wantSecurity(z: Configurator): void;

    wantEnvironment(z: Configurator): void;

    wantInternalEventsSource(z: Configurator): void

    setEnvironment(setter: (key: string, value: string) => void): void

    grantSecurityTo(grantable: IGrantable): void

    receiveInternalEvents(setter: (source: IEventSource) => void): void

    listenToServiceTopic(topic: ITopic, isTopicFifo: boolean): void;
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

    listenToServiceTopic(topic: ITopic, isTopicFifo: boolean): void {
    }


}

export type TaggingType = { project: string } & { [key: string]: string; }
export type NonMandatoryTaggingType = { [key: string]: string; }

export type HandlerOptions = {
    parentName: string;
    env: string,
    deadLetterQueue(): Queue;
    deadLetterFifoQueue(): Queue,
    topic: Topic;
    parentConstruct: Construct
}

export interface Handler {

    handle(config: HandlerOptions): Configurator
}

export interface ServiceListener {
    topic(): ITopic

    isTopicFifo(): boolean

    listensForEventsFrom(services: ServiceListener[]): void
}


type MicroserviceData = {
    env: string,
    orderedEvents: boolean,
    tags: TaggingType,
    parentName: string
    deadLetterQueue: () => Queue
    deadLetterFifoQueue: () => Queue
    topic: Topic
    parentConstruct: Construct
    handlers: Handler[]
    configurators: Configurator[]
}

export class Microservice implements ServiceListener {
    private readonly data: MicroserviceData;

    constructor(data: MicroserviceData) {
        this.data = data
    }

    topic(): ITopic {
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
    orderedEvents?: boolean,
    handlers: Handler[]
}

export class MicroserviceBuilder {
    private data: MicroserviceBuilderData;

    constructor(data: MicroserviceBuilderData) {
        this.data = data;
    }

    build(construct: Construct): Microservice {

        const orderedEvents = Optional.ofNullable(this.data.orderedEvents).orElse(false)
        let serviceTopic: Topic;

        if (orderedEvents) {

            serviceTopic = new Topic(construct, this.data.name + "Topic", {
                topicName: this.data.name + "Topic.fifo",
                fifo: true
            })

        } else {

            serviceTopic = new Topic(construct, this.data.name + "Topic", {
                topicName: this.data.name + "Topic"
            })

        }

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

        const configurators = this.data.handlers.map(h => {
            return h.handle({
                env: this.data.env,
                parentConstruct: construct,
                parentName: this.data.name,
                topic: serviceTopic,
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
            orderedEvents: orderedEvents,
            parentConstruct: construct,
            parentName: this.data.name,
            topic: serviceTopic,
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