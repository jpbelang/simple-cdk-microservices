import {Configurator, DefaultConfigurator, Handler, HandlerOptions} from "./microservice";
import * as lambda from "aws-cdk-lib/aws-lambda";
import {ITopic, SubscriptionFilter} from "aws-cdk-lib/aws-sns"
import {Queue} from "aws-cdk-lib/aws-sqs"

import {LambdaSubscription, SqsSubscription} from "aws-cdk-lib/aws-sns-subscriptions";
import {Optional} from "typescript-optional";
import {configureFunction, LambdaSupportProps} from "./lambda_support";
import {SqsEventSource} from "aws-cdk-lib/aws-lambda-event-sources";
import {Publisher} from "./publishers";
import {Subscriber} from "./subscribers";

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
        const data = adjustData(this.data, config.deadLetterQueue())
        const func = new lambda.Function(config.parentConstruct, id, data)
        configureFunction(data, config, func);

        return new LambdaConfigurator(id, func, data, config)
    }

    static create(data: LambdaSubscribedHandlerData) {

        return new SimpleLambdaSubscribed(data)
    }
}

export class LambdaConfigurator extends DefaultConfigurator {

    private readonly func: lambda.Function;

    constructor(id: string, func: lambda.Function, private readonly data: LambdaSubscribedHandlerData, private readonly config: HandlerOptions) {
        super(id);
        this.func = func;
    }

    wantEnvironment(z: Configurator) {
        z.setEnvironment((k, v) => this.func.addEnvironment(k, v))
    }

    wantSecurity(z: Configurator) {
        z.grantSecurityTo(this.func)
    }

    listenToServiceTopic(topic: Subscriber, isTopicFifo: boolean): void {

        topic.subscribeLambda({
            events: this.data.topicEvents,
            lambda: this.func,
            deadLetterQueue: this.config.deadLetterQueue()
        })
    }
}