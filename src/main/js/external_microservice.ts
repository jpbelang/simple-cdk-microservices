
import {ITopic, Topic} from "aws-cdk-lib/aws-sns"
import {Construct} from "constructs";
import {ServiceListener} from "./microservice";

export class ExternalMicroservice implements ServiceListener {
    private readonly externalTopic: ITopic;

    constructor(externalTopic: ITopic, private readonly isFifo: boolean) {
        this.externalTopic = externalTopic;
    }

    topic(): ITopic {

        return this.externalTopic
    }

    listensForEventsFrom(services: ServiceListener[]): void {

    }

    isTopicFifo(): boolean {
        return this.isFifo;
    }


    static create(externalTopic: ITopic) {
        return new ExternalMicroservice(externalTopic, false)
    }

    static createFromArn(parent: Construct, arn: string): ExternalMicroservice {

        const id = arn.split(":")
        const last = id[id.length - 1].replace(/.fifo$/, "")
        return new ExternalMicroservice(Topic.fromTopicArn(parent, last, arn),arn.endsWith(".fifo"))
    }
}