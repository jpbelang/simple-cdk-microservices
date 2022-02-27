import {Configurator, DefaultConfigurator, Handler, HandlerOptions} from "./microservice";
import {Function} from "aws-cdk-lib/aws-lambda";
import {DynamoEventSource} from "aws-cdk-lib/aws-lambda-event-sources";
import {configureFunction, LambdaSupportProps} from "./lambda_support";

export type DynamoStreamHandlerData = {
} & LambdaSupportProps

export class DynamoStreamLambda implements Handler {
    private data: DynamoStreamHandlerData;

    constructor(data: DynamoStreamHandlerData) {
        this.data = data
    }

    handle(config: HandlerOptions): Configurator {

        let id = `${this.data.handler}`;
        const func = new Function(config.parentConstruct, id, this.data)
        configureFunction(this.data, config, func);
        return new LambdaConfigurator(id, func)
    }

    static create(data: DynamoStreamHandlerData) {

        return new DynamoStreamLambda(data)
    }
}

export class LambdaConfigurator extends DefaultConfigurator {

    private readonly func: Function;

    constructor(id: string, func: Function) {
        super(id);
        this.func = func;
    }

    wantEnvironment(z: Configurator) {
        z.setEnvironment((k, v) => this.func.addEnvironment(k, v))
    }

    wantSecurity(z: Configurator) {
        z.grantSecurityTo(this.func)
    }


    wantInternalEventsSource(z: Configurator) {

        z.receiveInternalEvents((s) => s instanceof DynamoEventSource? this.func.addEventSource(s):{})
    }
}