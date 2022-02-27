
import {QueueProps} from "aws-cdk-lib/aws-sqs"

declare type QueueHandlerData = {
    queueName: string,
} & QueueProps;
