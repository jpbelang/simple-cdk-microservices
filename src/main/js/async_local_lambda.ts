import {Queue} from "@aws-cdk/aws-sqs";
import {Optional} from "typescript-optional";
import {Configurator, DefaultConfigurator, Handler, HandlerOptions} from "./microservice";
import * as lambda from "@aws-cdk/aws-lambda";
import {configureFunction, LambdaSupportProps} from "./lambda_support";
import {ITopic, SubscriptionFilter} from "@aws-cdk/aws-sns";
import {LambdaSubscription, SqsSubscription} from "@aws-cdk/aws-sns-subscriptions";
import {SqsEventSource} from "@aws-cdk/aws-lambda-event-sources";
import {IGrantable} from "@aws-cdk/aws-iam";

export type AsyncLambdaHandlerData = {
    fifo?: boolean
} & LambdaSupportProps

function adjustData(data: AsyncLambdaHandlerData, deadLetterQueue: Queue) {

    return Object.assign({}, data, {
        deadLetterQueueEnabled: Optional.ofNullable(data.deadLetterQueueEnabled).orElse(true),
        deadLetterQueue: Optional.ofNullable(data.deadLetterQueue).orElse(deadLetterQueue),
        retryAttempts: Optional.ofNullable(data.retryAttempts).orElse(1)
    } as AsyncLambdaHandlerData)
}

export class AsyncLambda implements Handler {
    private data: AsyncLambdaHandlerData;

    constructor(data: AsyncLambdaHandlerData) {
        this.data = data
    }

    handle(config: HandlerOptions): Configurator {

        let id = `${this.data.handler}`;
        const data = adjustData(this.data, config.deadLetterQueue)
        const func = new lambda.Function(config.parentConstruct, id, data)
        const queue = new Queue(func, "queue-for-func", {
            fifo: Optional.ofNullable(this.data.fifo).orUndefined()
        })
        func.addEventSource(new SqsEventSource(queue, {
            batchSize: 10
        }))
        queue.grantConsumeMessages(func)
        configureFunction(data, config, func);

        return new AsyncLambdaConfigurator(id, func, queue, data, config)
    }

    static create(data: AsyncLambdaHandlerData) {

        return new AsyncLambda(data)
    }
}

export class AsyncLambdaConfigurator extends DefaultConfigurator {

    constructor(id: string, private readonly func: lambda.Function, private readonly queue: Queue, private readonly data: AsyncLambdaHandlerData, private readonly config: HandlerOptions) {
        super(id);
    }

    setEnvironment(setter: (key: string, value: string) => void) {
        setter(`async_${this.data.handler.replace(/\./, "_")}_Queue`, this.queue.queueArn)
    }

    wantEnvironment(z: Configurator) {
        z.setEnvironment((k, v) => this.func.addEnvironment(k, v))
    }

    grantSecurityTo(grantable: IGrantable) {
        this.queue.grantSendMessages(grantable)
    }
}