import {ITopic, SubscriptionFilter} from "aws-cdk-lib/aws-sns";
import {IGrantable} from "aws-cdk-lib/aws-iam";
import {EventBus} from "aws-cdk-lib/aws-events"
import {LambdaSubscription} from "aws-cdk-lib/aws-sns-subscriptions";
import {SubscriptionData} from "./microservice";


export interface Publisher {
    allowPublish(grantable: IGrantable): void
    isFifo(): boolean
    identifier(): string
}

export class SNSPublisher implements Publisher {

    constructor(private topic: ITopic) {

    }

    public static create(topic: ITopic) {
        return new SNSPublisher(topic)
    }

    allowPublish(grantable: IGrantable): void {
        this.topic.grantPublish(grantable)
    }
    identifier(): string {
        return this.topic.topicArn;
    }
    isFifo(): boolean {
        return false;
    }
}

export class EventBridgePublisher implements Publisher {
    constructor(private eventBridge: EventBus) {

    }

    public static create(eventBus: EventBus) {
        return new EventBridgePublisher(eventBus)
    }

    allowPublish(grantable: IGrantable): void {

        this.eventBridge.grantPutEventsTo(grantable)
    }

    identifier(): string {
        return this.eventBridge.eventBusArn;
    }

    isFifo(): boolean {
        return false;
    }

}
