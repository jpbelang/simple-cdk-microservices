import {Configurator, DefaultConfigurator, Handler, HandlerOptions} from "./microservice";
import * as lambda from "aws-cdk-lib/aws-lambda";
import {Queue} from "aws-cdk-lib/aws-sqs"

import {Optional} from "typescript-optional";
import {configureFunction, LambdaSupportProps} from "./lambda_support";
import {LambdaFunction} from "aws-cdk-lib/aws-events-targets";
import {Rule, RuleTargetInput, Schedule} from "aws-cdk-lib/aws-events";

export type TimerLambdaHandlerData = {
    schedule: Schedule,
    event: RuleTargetInput,
} & LambdaSupportProps


function adjustData(data: TimerLambdaHandlerData, deadLetterQueue: Queue) {

    return Object.assign({}, data, {
        deadLetterQueueEnabled: Optional.ofNullable(data.deadLetterQueueEnabled).orElse(true),
        deadLetterQueue: Optional.ofNullable(data.deadLetterQueue).orElse(deadLetterQueue),
        retryAttempts: Optional.ofNullable(data.retryAttempts).orElse(1)
    } as TimerLambdaHandlerData)
}

export class TimerLambda implements Handler {
    private data: TimerLambdaHandlerData;

    constructor(data: TimerLambdaHandlerData) {
        this.data = data
    }

    handle(config: HandlerOptions): Configurator {

        let id = `${this.data.handler}`;
        const data = adjustData(this.data, config.deadLetterQueue())
        const func = new lambda.Function(config.parentConstruct, id, data)
        configureFunction(data, config, func);
        const rule = new Rule(func, "timer", {
            schedule: this.data.schedule,
            targets:[new LambdaFunction(func, {
                retryAttempts: this.data.retryAttempts,
                event: this.data.event
            })]
        })

        return new LambdaConfigurator(id, func, data, config)
    }

    static create(data: TimerLambdaHandlerData) {

        return new TimerLambda(data)
    }
}

export class LambdaConfigurator extends DefaultConfigurator {

    private readonly func: lambda.Function;

    constructor(id: string, func: lambda.Function, private readonly data: TimerLambdaHandlerData, private readonly config: HandlerOptions) {
        super(id);
        this.func = func;
    }

    wantEnvironment(z: Configurator) {
        z.setEnvironment((k, v) => this.func.addEnvironment(k, v))
    }

    wantSecurity(z: Configurator) {
        z.grantSecurityTo(this.func)
    }
}