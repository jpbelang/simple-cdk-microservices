import * as lambda from "aws-cdk-lib/aws-lambda";
import {Function, FunctionProps} from "aws-cdk-lib/aws-lambda";
import {ITopic} from 'aws-cdk-lib/aws-sns'
import {HandlerOptions, NonMandatoryTaggingType} from "./microservice";
import {Optional} from "typescript-optional";
import {Tags} from "aws-cdk-lib";

export type LambdaSupportProps = {
    functionConfigurator?: <T extends LambdaSupportProps>(func: lambda.Function, data: T, config: HandlerOptions) => void
    tags?: NonMandatoryTaggingType
} & FunctionProps


export function configureFunction<T extends LambdaSupportProps>(data: T, config: HandlerOptions, func: Function) {
    config.topic.grantPublish(func)
    config.deadLetterQueue().grantSendMessages(func)
    func.addEnvironment("output", config.topic.topicArn)
    func.addEnvironment("env", config.env)
    Optional.ofNullable(data.functionConfigurator).ifPresent(f => f(func, data, config))

    Object.entries(Optional.ofNullable(data.tags).orElse({})).forEach( ([k,v]) => Tags.of(func).add(k,v, {
        priority: 101
    }))
}

export type BaseEnvironmentInfo = { hostName: string, domainName: string, zoneId: string, aliasTarget: string }
export type EnvironmentInfo = BaseEnvironmentInfo & { portalTopic: (actualId: string) => ITopic }
