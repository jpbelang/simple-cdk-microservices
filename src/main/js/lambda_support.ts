import * as lambda from "@aws-cdk/aws-lambda";
import {Function, FunctionProps} from "@aws-cdk/aws-lambda";
import {HandlerOptions} from "./microservice";
import {Optional} from "typescript-optional";

export type LambdaSupportProps = {
    functionConfigurator?: <T extends LambdaSupportProps>(func: lambda.Function, data: T, config: HandlerOptions) => void
} & FunctionProps


export function configureFunction<T extends LambdaSupportProps>(data: T, config: HandlerOptions, func: Function) {
    config.topic.grantPublish(func)
    config.deadLetterQueue.grantSendMessages(func)
    func.addEnvironment("output", config.topic.topicArn)
    func.addEnvironment("env", config.env)
    Optional.ofNullable(data.functionConfigurator).ifPresent(f => f(func, data, config))
}
