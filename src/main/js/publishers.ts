import {ITopic, SubscriptionFilter} from "aws-cdk-lib/aws-sns";
import {IGrantable} from "aws-cdk-lib/aws-iam";
import {LambdaSubscription} from "aws-cdk-lib/aws-sns-subscriptions";
import {SubscriptionData} from "./microservice";


export interface Publisher {
    allowPublish(grantable: IGrantable): void
    subscribeLambda(data: SubscriptionData): void
    isFifo(): boolean
    identifier(): string
}


export class SNSPublisher implements Publisher {

    constructor(private topic: ITopic) {

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
