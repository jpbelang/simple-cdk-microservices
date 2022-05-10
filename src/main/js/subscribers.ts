import {SubscriptionData} from "./microservice";
import {ITopic, SubscriptionFilter} from "aws-cdk-lib/aws-sns";
import {IGrantable} from "aws-cdk-lib/aws-iam";
import {LambdaSubscription} from "aws-cdk-lib/aws-sns-subscriptions";
import {Publisher} from "./publishers";

export interface Subscriber {
    subscribeLambda(data: SubscriptionData): void
    isFifo(): boolean
    identifier(): string
}


export class SNSSubscriber implements Subscriber {

    constructor(private topic: ITopic) {

    }

    identifier(): string {
        return this.topic.topicArn;
    }
    isFifo(): boolean {
        return false;
    }

    subscribeLambda(data: SubscriptionData) {

        const subscription = new LambdaSubscription(data.lambda, {
            filterPolicy: {
                "event-name": SubscriptionFilter.stringFilter({
                    allowlist: data.events
                })
            },
            deadLetterQueue: data.deadLetterQueue
        })
        this.topic.addSubscription(subscription)
    }

}
