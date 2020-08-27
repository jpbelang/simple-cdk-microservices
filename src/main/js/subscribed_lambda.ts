
import {Configurator, DefaultConfigurator, Handler, HandlerOptions} from "./microservice";
import * as lambda from "@aws-cdk/aws-lambda";
import {SubscriptionFilter, Topic} from "@aws-cdk/aws-sns"
import {Queue} from "@aws-cdk/aws-sqs"

import {LambdaSubscription} from "@aws-cdk/aws-sns-subscriptions";

type HandlerData = {
    topicEvents: string[]
} & lambda.FunctionProps


export class SimpleLambdaSubscribed implements Handler {
    private data: HandlerData;

    constructor(data: HandlerData) {
        this.data = data
    }

    handle(config: HandlerOptions): Configurator {

        let id = `${config.parentName}-${this.data.handler}`;
        const func = new lambda.Function(config.parentConstruct, id + "foo", this.data)
        config.topic.grantPublish(func)
        config.deadLetterQueue.grantSendMessages(func)
        func.addEnvironment("output", config.topic.topicArn)

        return new LambdaConfigurator(id, func, config.deadLetterQueue, this.data.topicEvents)
    }

    static create(data: HandlerData) {

        return new SimpleLambdaSubscribed(data)
    }
}

export class LambdaConfigurator extends DefaultConfigurator {

    private readonly func: lambda.Function;
    private readonly deadLetterQueue: Queue
    private readonly events: string[]

    constructor(id: string, func: lambda.Function, deadLetterQueue: Queue, events: string[]) {
        super(id);
        this.func = func;
        this.deadLetterQueue = deadLetterQueue
        this.events = events
    }

    wantEnvironment(z: Configurator) {
        z.setEnvironment((k, v) => this.func.addEnvironment(k, v))
    }

    wantSecurity(z: Configurator) {
        z.grantSecurityTo(this.func)
    }

    listenToServiceTopic(topic: Topic) {

        const subscription = new LambdaSubscription(this.func, {deadLetterQueue: this.deadLetterQueue, filterPolicy: {
            "event-name": SubscriptionFilter.stringFilter({
                whitelist:this.events
            })
        }})
        topic.addSubscription(subscription)
    }
};