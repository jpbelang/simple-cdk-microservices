
import {ITopic, Topic} from "aws-cdk-lib/aws-sns"
import {Construct} from "constructs";
import {Publisher, ServiceListener, SNSPublisher} from "./microservice";
import {SnsPublish} from "aws-cdk-lib/aws-stepfunctions-tasks";

export class ExternalMicroservice implements ServiceListener {
    private readonly externalTopic: Publisher;

    constructor(externalTopic: Publisher, private readonly isFifo: boolean) {
        this.externalTopic = externalTopic;
    }

    topic(): Publisher {

        return this.externalTopic
    }

    listensForEventsFrom(services: ServiceListener[]): void {

    }

    isTopicFifo(): boolean {
        return this.isFifo;
    }


    static create(externalTopic: Publisher) {
        return new ExternalMicroservice(externalTopic, false)
    }

    static createFromArn(parent: Construct, arn: string): ExternalMicroservice {

        const id = arn.split(":")
        const last = id[id.length - 1].replace(/.fifo$/, "")
        return new ExternalMicroservice(new SNSPublisher(Topic.fromTopicArn(parent, last, arn)),arn.endsWith(".fifo"))
    }
}