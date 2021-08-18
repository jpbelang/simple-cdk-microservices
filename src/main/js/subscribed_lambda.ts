import {Configurator, DefaultConfigurator, DLQFactory, Handler, HandlerOptions} from "./microservice";
import * as lambda from "@aws-cdk/aws-lambda";
import {ITopic, SubscriptionFilter} from "@aws-cdk/aws-sns"
import {Queue} from "@aws-cdk/aws-sqs"

import {LambdaSubscription, SqsSubscription} from "@aws-cdk/aws-sns-subscriptions";
import {Optional} from "typescript-optional";
import {configureFunction, LambdaSupportProps} from "./lambda_support";
import {SqsEventSource} from "@aws-cdk/aws-lambda-event-sources";

export type LambdaSubscribedHandlerData = {
    topicEvents: string[]
} & LambdaSupportProps


function adjustData(data: LambdaSubscribedHandlerData, deadLetterQueue: Queue) {

    return Object.assign({}, data, {
        deadLetterQueueEnabled: Optional.ofNullable(data.deadLetterQueueEnabled).orElse(true),
        deadLetterQueue: Optional.ofNullable(data.deadLetterQueue).orElse(deadLetterQueue),
        retryAttempts: Optional.ofNullable(data.retryAttempts).orElse(1)
    } as LambdaSubscribedHandlerData)
}

export class SimpleLambdaSubscribed implements Handler {
    private data: LambdaSubscribedHandlerData;

    constructor(data: LambdaSubscribedHandlerData) {
        this.data = data
    }

    handle(config: HandlerOptions): Configurator {

        let id = `${this.data.handler}`;
        const data = adjustData(this.data, config.deadLetterQueue.createQueue())
        const func = new lambda.Function(config.parentConstruct, id, data)
        configureFunction(data, config, func);

        return new LambdaConfigurator(id, func, config.deadLetterQueue, data.topicEvents)
    }

    static create(data: LambdaSubscribedHandlerData) {

        return new SimpleLambdaSubscribed(data)
    }
}

export class LambdaConfigurator extends DefaultConfigurator {

    private readonly func: lambda.Function;
    private readonly deadLetterQueue: DLQFactory
    private readonly events: string[]

    constructor(id: string, func: lambda.Function, deadLetterQueue: DLQFactory, events: string[]) {
        super(id);
        this.func = func;
        this.deadLetterQueue = deadLetterQueue
        this.events = events
    }

    wantEnvironment(z: Configurator) {
        z.setEnvironment((k, v) => this.func.addEnvironment(k, v))
    }

    wantSecurity(z: Configurator) {
        z.grantSecurityTo(this.func)
    }

    listenToServiceTopic(topic: ITopic) {

        if (topic.topicName.endsWith(".fifo")) {

            const id = `${topic.topicName}To${this.func.functionName}QueueId`
            const name = `${topic.topicName}To${this.func.functionName}Queue.fifo`
            const fifo = new Queue(this.func.stack, id, {
                fifo: true,
                queueName: name,
                deadLetterQueue: {
                    queue: this.deadLetterQueue.createFifo(),
                    maxReceiveCount: 2
                }
            })

            const subscription = new SqsSubscription(fifo, {
                deadLetterQueue: this.deadLetterQueue.createFifo()
            })
            topic.addSubscription(subscription)

            const source = new SqsEventSource(fifo)
            this.func.addEventSource(source)
        } else {
            const subscription = new LambdaSubscription(this.func, {
                filterPolicy: {
                    "event-name": SubscriptionFilter.stringFilter({
                        whitelist: this.events
                    })
                },
                deadLetterQueue: this.deadLetterQueue.createQueue()
            })
            topic.addSubscription(subscription)
        }
    }
}