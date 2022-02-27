
import {Configurator, Handler, HandlerOptions, DefaultConfigurator} from '../../main/js'
import * as lambda from "aws-cdk-lib/aws-lambda";
import {Queue} from "aws-cdk-lib/aws-sqs"
import {SqsEventSource} from "aws-cdk-lib/aws-lambda-event-sources";
import {configureFunction, LambdaSupportProps} from "../../main/js";

type HandlerData = {
} & LambdaSupportProps



export class LocalQueueReceiver implements Handler {
    private data: HandlerData;

    constructor(data: HandlerData) {
        this.data = data
    }

    handle(config: HandlerOptions): Configurator {

        let id = `${this.data.handler}`;

        const func = new lambda.Function(config.parentConstruct, id, Object.assign({}, this.data, {deadLetterQueue: config.deadLetterQueue()}) as LambdaSupportProps)
        configureFunction(this.data, config, func)
        return new LocalQueueReceiverConfigurator(id, func, config.deadLetterQueue())
    }

    static create(data: HandlerData) {

        return new LocalQueueReceiver(data)
    }
}

export class LocalQueueReceiverConfigurator extends DefaultConfigurator {

    private readonly func: lambda.Function;
    private readonly deadLetterQueue: Queue

    constructor(id: string, func: lambda.Function, deadLetterQueue: Queue) {
        super(id);
        this.func = func;
        this.deadLetterQueue = deadLetterQueue
    }

    wantEnvironment(z: Configurator) {
        z.setEnvironment((k, v) => this.func.addEnvironment(k, v))
    }

    wantSecurity(z: Configurator) {
        z.grantSecurityTo(this.func)
    }

    wantInternalEventsSource(z: Configurator) {

        z.receiveInternalEvents((s) => s instanceof SqsEventSource? this.func.addEventSource(s):{})
    }
}