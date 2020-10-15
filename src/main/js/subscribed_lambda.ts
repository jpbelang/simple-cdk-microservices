import {Configurator, DefaultConfigurator, Handler, HandlerOptions} from "./microservice";
import * as lambda from "@aws-cdk/aws-lambda";
import {ITopic, SubscriptionFilter} from "@aws-cdk/aws-sns"
import {Queue} from "@aws-cdk/aws-sqs"

import {LambdaSubscription} from "@aws-cdk/aws-sns-subscriptions";
import {Optional} from "typescript-optional";
import {configureFunction, LambdaSupportProps} from "./lambda_support";

type HandlerData = {
    topicEvents: string[]
} & LambdaSupportProps


function adjustData(data: HandlerData, deadLetterQueue: Queue) {

    return Object.assign({}, data, {
        deadLetterQueueEnabled: Optional.ofNullable(data.deadLetterQueueEnabled).orElse(true),
        deadLetterQueue: Optional.ofNullable(data.deadLetterQueue).orElse(deadLetterQueue),
        retryAttempts: Optional.ofNullable(data.retryAttempts).orElse(1)
    } as HandlerData)
}

export class SimpleLambdaSubscribed implements Handler {
    private data: HandlerData;

    constructor(data: HandlerData) {
        this.data = data
    }

    handle(config: HandlerOptions): Configurator {

        let id = `${this.data.handler}`;
        const data = adjustData(this.data, config.deadLetterQueue)
        const func = new lambda.Function(config.parentConstruct, id, data)
        configureFunction(data, config, func);

        return new LambdaConfigurator(id, func, config.deadLetterQueue, data.topicEvents)
    }

    static create(data: HandlerData) {

        return new SimpleLambdaSubscribed(data)
    }
}

export class LambdaConfigurator extends DefaultConfigurator {

    private readonly func: lambda.Function;
    private readonly deadLetterQueue: Queue
    private readonly events: string[]

    constructor(id: string, func: lambda.Function, deadLetterQueue: Queue, events: string[]) {
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

        const subscription = new LambdaSubscription(this.func, {
            filterPolicy: {
                "event-name": SubscriptionFilter.stringFilter({
                    whitelist: this.events
                })
            },
            deadLetterQueue: this.deadLetterQueue
        })
        topic.addSubscription(subscription)
    }
};