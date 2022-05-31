
import {Topic} from "aws-cdk-lib/aws-sns"
import {Construct} from "constructs";
import {ServiceListener} from "./microservice";
import {Publisher, SNSPublisher} from "./publishers";
import {SNSSubscriber, Subscriber} from "./subscribers";

export class ExternalMicroservice implements ServiceListener {
    private readonly externalTopic: Subscriber;

    constructor(externalTopic: Subscriber, private readonly isFifo: boolean) {
        this.externalTopic = externalTopic;
    }

    topic(): Subscriber {

        return this.externalTopic
    }

    listensForEventsFrom(services: ServiceListener[]): void {

    }

    isTopicFifo(): boolean {
        return this.isFifo;
    }


    static create(externalTopic: Subscriber) {
        return new ExternalMicroservice(externalTopic, false)
    }

    static createFromArn(parent: Construct, arn: string): ExternalMicroservice {

        const id = arn.split(":")
        const last = id[id.length - 1].replace(/.fifo$/, "")
        return new ExternalMicroservice(new SNSSubscriber(Topic.fromTopicArn(parent, last, arn)),arn.endsWith(".fifo"))
    }
}