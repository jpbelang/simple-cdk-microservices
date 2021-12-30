import {
    DynamoDBHandler,
    DynamoStreamLambda,
    MicroserviceBuilder,
    SimpleLambdaSubscribed,
    simpleMethod,
    WebLambda,
    Handler, HandlerOptions, DefaultConfigurator, Configurator
} from '../../main/js'
import {Queue, QueueProps} from "@aws-cdk/aws-sqs"
import {IEventSource} from "@aws-cdk/aws-lambda";
import {SqsEventSource} from "@aws-cdk/aws-lambda-event-sources";
import {IGrantable} from "@aws-cdk/aws-iam";
import {Duration} from "@aws-cdk/core";


declare type QueueHandlerData = {
    queueName: string,
} & QueueProps;
