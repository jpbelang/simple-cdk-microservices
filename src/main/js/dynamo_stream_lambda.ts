/*
class SimpleLambdaSubscribed(RequestHandler):
    def __init__(self, name: str, events: List[str], connection_callback: Optional[Callable[[sns.Topic], None]]) -> None:
        super().__init__(connection_callback=connection_callback)
        self._events = events
        self._name = name

    def handler(self, scope: core.Construct, name: str, asset: lambdas.AssetCode, runtime: lambdas.Runtime,
                environment_configuration: EnvironmentConfiguration, service_topic: sns.Topic, dead_letter_queue) -> Tuple[
        core.Construct, Callable[[core.Construct], None]]:

        function = create_and_customise_lambda(scope=scope, id="{0}-{1}".format(name, self._name),
                                               runtime=runtime, code=asset, handler=self._name,
                                               dead_letter_queue=dead_letter_queue, service_topic=service_topic)

        def connect_to_peers(topic: Topic):
            subscription: ITopicSubscription = LambdaSubscription(fn=function, dead_letter_queue=dead_letter_queue, filter_policy={
                "event-name": SubscriptionFilter.string_filter(whitelist=self._events)
            })
            topic.add_subscription(subscription)

        self._connection_callback = connect_to_peers
        return function, lambda target: None

   @classmethod
    def create_handler(cls, name: str, events: Optional[List[str]] = [],
                       connection_callback: Optional[Callable[[sns.Topic], None]] = lambda target: None):
        return SimpleLambdaSubscribed(name=name, events=events, connection_callback=connection_callback)


        def create_and_customise_lambda(scope: core.Construct, id: str, runtime: lambdas.Runtime, code: lambdas.AssetCode,
                                handler: str, service_topic: sns.Topic, dead_letter_queue: sqs.Queue,
                                memory: Optional[int] = 128,
                                timeout: Optional[Duration] = Duration.seconds(10),
                                configure_chain: Optional[
                                    Callable[[lambdas.Function], None]] = lambda target: None) -> lambdas.Function:
    function = lambdas.Function(scope=scope, id=id, runtime=runtime, code=code, dead_letter_queue=dead_letter_queue,
                                handler=handler, memory_size=memory, timeout=timeout)
    service_topic.grant_publish(function)
    dead_letter_queue.grant_send_messages(function)
    function.add_environment("output", service_topic.topic_arn)
    configure_chain(function)
    return function
 */
import {Configurator, DefaultConfigurator, Handler, HandlerOptions} from "./microservice";
import {Function, FunctionProps} from "@aws-cdk/aws-lambda";
import {Table} from "@aws-cdk/aws-dynamodb";
import {DynamoEventSource} from "@aws-cdk/aws-lambda-event-sources";

type HandlerData = {
} & FunctionProps

export class DynamoStreamLambda implements Handler {
    private data: HandlerData;

    constructor(data: HandlerData) {
        this.data = data
    }

    handle(config: HandlerOptions): Configurator {

        let id = `${config.parentName}-${this.data.handler}`;
        const func = new Function(config.parentConstruct, id, this.data)
        config.topic.grantPublish(func)
        config.deadLetterQueue.grantSendMessages(func)
        func.addEnvironment("output", config.topic.topicArn)
        return new LambdaConfigurator(id, func)
    }

    static create(data: HandlerData) {

        return new DynamoStreamLambda(data)
    }
}

export class LambdaConfigurator extends DefaultConfigurator {

    private readonly func: Function;

    constructor(id: string, func: Function) {
        super(id);
        this.func = func;
    }

    wantEnvironment(z: Configurator) {
        z.setEnvironment((k, v) => this.func.addEnvironment(k, v))
    }

    wantSecurity(z: Configurator) {
        z.grantSecurityTo(this.func)
    }


    wantInternalEventsSource(z: Configurator) {

        z.receiveInternalEvents((s) => s instanceof DynamoEventSource? this.func.addEventSource(s):{})
    }
};