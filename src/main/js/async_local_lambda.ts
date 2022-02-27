import {Queue} from "aws-cdk-lib/aws-sqs";
import {Optional} from "typescript-optional";
import {Configurator, DefaultConfigurator, Handler, HandlerOptions} from "./microservice";
import * as lambda from "aws-cdk-lib/aws-lambda";
import {configureFunction, LambdaSupportProps} from "./lambda_support";
import {SqsEventSource} from "aws-cdk-lib/aws-lambda-event-sources";
import {IGrantable} from "aws-cdk-lib/aws-iam";
import {Tags} from "aws-cdk-lib/core";

export type AsyncLambdaHandlerData = {
    fifo?: boolean
} & LambdaSupportProps

function adjustData(data: AsyncLambdaHandlerData, deadLetterQueue: Queue) {

    return Object.assign({}, data, {
        deadLetterQueueEnabled: Optional.ofNullable(data.deadLetterQueueEnabled).orElse(true),
        deadLetterQueue: Optional.ofNullable(data.deadLetterQueue).orElse(deadLetterQueue),
        retryAttempts: Optional.ofNullable(data.retryAttempts).orElse(1),
    } as AsyncLambdaHandlerData)
}

export class AsyncLambda implements Handler {
    private data: AsyncLambdaHandlerData;

    constructor(data: AsyncLambdaHandlerData) {
        this.data = data
    }

    handle(config: HandlerOptions): Configurator {

        let id = `${this.data.handler}`;
        const data = adjustData(this.data, config.deadLetterQueue())
        const func = new lambda.Function(config.parentConstruct, id, data)
        const queue = new Queue(func, "queue-for-func", {
            fifo: Optional.ofNullable(this.data.fifo).orUndefined(),
            deadLetterQueue: {
                queue: config.deadLetterQueue(),
                maxReceiveCount: 2
            }
        })
        func.addEventSource(new SqsEventSource(queue, {
            batchSize: 10
        }))
        queue.grantConsumeMessages(func)
        configureFunction(data, config, func);

        Object.entries(Optional.ofNullable(this.data.tags).orElse({})).forEach( ([k,v]) => Tags.of(queue).add(k,v, {
            priority: 101
        }))

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
        setter(`async_${this.data.handler.replace(/\./, "_")}_Queue`, this.queue.queueUrl)
    }

    wantEnvironment(z: Configurator) {
        z.setEnvironment((k, v) => this.func.addEnvironment(k, v))
    }

    grantSecurityTo(grantable: IGrantable) {
        this.queue.grantSendMessages(grantable)
    }
}