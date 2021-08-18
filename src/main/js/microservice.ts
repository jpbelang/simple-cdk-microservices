
import {IEventSource} from "@aws-cdk/aws-lambda";
import {Queue} from "@aws-cdk/aws-sqs";
import {Topic, ITopic} from "@aws-cdk/aws-sns";
import {Construct} from "@aws-cdk/core";
import {IGrantable} from "@aws-cdk/aws-iam"
import {Optional} from "typescript-optional";

export interface Configurator {
    id: string

    wantSecurity(z: Configurator): void;
    wantEnvironment(z: Configurator): void;
    wantInternalEventsSource(z: Configurator): void

    setEnvironment(setter: (key: string, value: string) => void): void
    grantSecurityTo(grantable: IGrantable): void
    receiveInternalEvents(setter: (source: IEventSource) => void): void

    listenToServiceTopic(topic: ITopic): void;
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

    listenToServiceTopic(topic: ITopic): void {
    }


}

export interface DLQFactory {

    createFifo(): Queue
    createQueue(): Queue
}

export type HandlerOptions = { parentName: string; env: string, deadLetterQueue: DLQFactory; topic: Topic; parentConstruct: Construct }

export interface Handler {

    handle(config: HandlerOptions): Configurator
}

export interface ServiceListener {
    topic(): ITopic
    listensForEventsFrom(services: ServiceListener[]): void
}


type MicroserviceData = {
    env: string
    parentName: string
    deadLetterQueue: DLQFactory
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

    dlq(): Queue  {
        // todo fix this
        return this.data.deadLetterQueue.createQueue()
    }

    listensForEventsFrom(services: ServiceListener[]) {

        services.forEach(s => this.data.configurators.forEach(x => x.listenToServiceTopic(s.topic())))
    }
}

type MicroserviceBuilderData = {
    name: string,
    env: string,
    orderedOutput?: boolean
    handlers: Handler[]
}

export class MicroserviceBuilder {
    private data: MicroserviceBuilderData;

    constructor(data: MicroserviceBuilderData) {
        this.data = data;
    }

    private topicName(base: string) {

        return Optional.ofNullable(this.data.orderedOutput).orElse(false)? base + ".fifo": base
    }

    build(construct: Construct): Microservice {

        const serviceTopic = new Topic(construct, this.data.name + "Topic", {
            topicName: this.topicName(this.data.name + "Topic"),
            fifo: Optional.ofNullable(this.data.orderedOutput).orElse(false)
        })

        const data = this.data
        const dlqFactory: DLQFactory = new class implements DLQFactory {
            private fifo: Queue
            private queue: Queue

            createFifo(): Queue {
                if ( this.fifo == undefined) {
                    this.fifo = new Queue(construct, data.name + "DeadLetterTopic.fifo", {
                            queueName: data.name + "DeadLetterQueue.fifo",
                            fifo: true
                        }
                    )
                }

                return this.fifo
            }

            createQueue(): Queue {
                if ( this.queue == undefined) {
                    this.queue = new Queue(construct, data.name + "DeadLetterTopic", {
                            queueName: data.name + "DeadLetterQueue"
                        }
                    )
                }

                return this.queue
            }
        }

        const configurators = this.data.handlers.map(h => h.handle({
            env: this.data.env,
            parentConstruct: construct,
            parentName: this.data.name,
            topic: serviceTopic,
            deadLetterQueue: dlqFactory,
        }))

        configurators.forEach((c) => configurators.filter(e => e.id != c.id).forEach(e => {
            c.wantEnvironment(e)
            c.wantSecurity(e)
            c.wantInternalEventsSource(e)
        }))

        return new Microservice({
            env: this.data.env,
            parentConstruct: construct,
            parentName: this.data.name,
            topic: serviceTopic,
            deadLetterQueue: dlqFactory,
            handlers: this.data.handlers,
            configurators: configurators
        })
    }

    static microservice(data: MicroserviceBuilderData): MicroserviceBuilder {
        return new MicroserviceBuilder(data)
    }
}