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

export class LocalQueue implements Handler {

    private props: QueueHandlerData;
    constructor(props: QueueHandlerData) {
        this.props = props;
    }


    handle(config: HandlerOptions): Configurator {

        let id = `${this.props.queueName}`;

        const queue = new Queue(config.parentConstruct, id,  Object.assign({}, this.props, {
            queueName: id,
            deadLetterQueue: {
                queue: config.deadLetterQueue(),
                maxReceiveCount: 2
            },
            visibilityTimeout: Duration.seconds(30)
        } as QueueProps))

        return new LocalQueueConfigurator(this.props.queueName, queue)
    }

    static create(props: QueueHandlerData) {

        return new LocalQueue(props)
    }
}

class LocalQueueConfigurator extends DefaultConfigurator {
    private name: string;
    private queue: Queue;

    constructor(name: string, queue: Queue) {
        super(name)
        this.name = name;
        this.queue = queue;
    }

    setEnvironment(setter: (key: string, value: string) => void) {
        setter("queue_PortalQueue", this.queue.queueUrl)
    };

    receiveInternalEvents(setter: (source: IEventSource) => void) {
            setter(new SqsEventSource(this.queue, {
                batchSize: 1,
            }))
    }

    grantSecurityTo(grantable: IGrantable): void {

        this.queue.grantSendMessages(grantable)
    }
}