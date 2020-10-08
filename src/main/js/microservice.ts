
import {IEventSource} from "@aws-cdk/aws-lambda";
import {Queue} from "@aws-cdk/aws-sqs";
import {Topic, ITopic} from "@aws-cdk/aws-sns";
import {Construct} from "@aws-cdk/core";
import {IGrantable} from "@aws-cdk/aws-iam"

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

export type HandlerOptions = { parentName: string; deadLetterQueue: Queue; topic: Topic; parentConstruct: Construct }

export interface Handler {

    handle(config: HandlerOptions): Configurator
}

export interface ServiceListener {
    topic(): ITopic
    listensForEventsFrom(services: ServiceListener[]): void
}


type MicroserviceData = {
    parentName: string
    deadLetterQueue: Queue
    topic: Topic
    parentConstruct: Construct
    handlers: Handler[]
    configurators: Configurator[]
}

export class Microservice implements ServiceListener {
    private data: MicroserviceData;

    constructor(data: MicroserviceData) {
        this.data = data
    }

    topic(): ITopic {
        return this.data.topic;
    }


    listensForEventsFrom(services: ServiceListener[]) {

        services.forEach(s => this.data.configurators.forEach(x => x.listenToServiceTopic(s.topic())))
    }
}

type MicroserviceBuilderData = {
    name: string
    handlers: Handler[]
}

export class MicroserviceBuilder {
    private data: MicroserviceBuilderData;

    constructor(data: MicroserviceBuilderData) {
        this.data = data;
    }

    build(construct: Construct): Microservice {

        const serviceTopic = new Topic(construct, this.data.name + "Topic", {
            topicName: this.data.name + "Topic"
        })

        const deadLetterQueue = new Queue(construct, this.data.name + "DeadLetterTopic", {
                queueName: this.data.name + "DeadLetterQueue"
            }
        )

        const configurators = this.data.handlers.map(h => h.handle({
            parentConstruct: construct,
            parentName: this.data.name,
            topic: serviceTopic,
            deadLetterQueue: deadLetterQueue,
        }))

        configurators.forEach((c) => configurators.filter(e => e.id != c.id).forEach(e => {
            c.wantEnvironment(e)
            c.wantSecurity(e)
            c.wantInternalEventsSource(e)
        }))
        return new Microservice({
            parentConstruct: construct,
            parentName: this.data.name,
            topic: serviceTopic,
            deadLetterQueue: deadLetterQueue,
            handlers: this.data.handlers,
            configurators: configurators
        })
    }

    static microservice(data: MicroserviceBuilderData): MicroserviceBuilder {
        return new MicroserviceBuilder(data)
    }
}