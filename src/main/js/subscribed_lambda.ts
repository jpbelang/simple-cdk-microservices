import {Configurator, DefaultConfigurator, Handler, HandlerOptions} from "./microservice";
import * as lambda from "aws-cdk-lib/aws-lambda";
import {Queue} from "aws-cdk-lib/aws-sqs"
import {Optional} from "typescript-optional";
import {configureFunction, LambdaSupportProps} from "./lambda_support";
import {Subscriber} from "./subscribers";
import {calculateParentage, Compatibility} from "./compatibility";

export interface LambdaSubscribedHandlerData extends LambdaSupportProps, Compatibility<LambdaSubscribedHandlerData>{
    topicEvents: string[]
}


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

        const data = adjustData(this.data, config.deadLetterQueue())
        const parentage = calculateParentage(this.data, config)
        const func = new lambda.Function(parentage.parent, parentage.id, data)
        configureFunction(data, config, func);

        return new LambdaConfigurator(parentage.id, func, data, config)
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