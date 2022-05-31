import {SubscriptionData} from "./microservice";
import {ITopic, SubscriptionFilter} from "aws-cdk-lib/aws-sns";
import {LambdaSubscription} from "aws-cdk-lib/aws-sns-subscriptions";
import {EventBus, Rule} from "aws-cdk-lib/aws-events";
import {LambdaFunction} from "aws-cdk-lib/aws-events-targets"

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

export class EventBridgeSubscriber implements Subscriber {
    constructor(private eventBridge: EventBus) {

    }

    public static create(eventBus: EventBus) {
        return new EventBridgeSubscriber(eventBus)
    }

    identifier(): string {
        return "";
    }

    isFifo(): boolean {
        return false;
    }

    subscribeLambda(data: SubscriptionData): void {
        new Rule(data.lambda, "subscription", {
            eventBus: this.eventBridge,
            eventPattern: {source: data.events},
            targets: [new LambdaFunction(data.lambda, {deadLetterQueue: data.deadLetterQueue})]
        })
    }
}