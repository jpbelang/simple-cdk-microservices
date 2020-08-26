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
import {IResource} from "@aws-cdk/aws-apigateway";

type HandlerData = {
    resourceTree: ResourceTree
    topResource: IResource
} & FunctionProps

type MethodIntegrator = (methodName: string, resource: IResource, func: Function ) => void
type ResourceIntegrator = (methodName: string, resource: IResource, func: Function ) => [IResource, ResourceTree]
type ResourceTree = { [key: string]: ResourceTree|MethodIntegrator|ResourceIntegrator }

const foo: ResourceTree = {
    "key": (m,r,f) => {},
    "more": {
        GET: (m,r,f) => {}
    },
    "resource": simpleResource({
        anotherKey: {
            POST: (m,r,f) => {}
        }
    })

}
export function simpleMethod():  MethodIntegrator {

    return (m,r, f) => {

        r.addMethod(m)
    }
}

export function simpleResource(built: ResourceTree):  ResourceIntegrator {

    return (m,r, f) => {

        const newResource = r.addResource(m)
        return [r, built]
    }
}

export function configureTree(func: Function, resource: IResource, tree: ResourceTree) {

    Object.entries(tree).forEach(
        ([key, treeOrIntegrator]) => {
            if ( /(GET)|(POST)|(PUT)|(DELETE)/.test(key)) {
                // we should have a function.  Type
                if ( typeof  treeOrIntegrator == "function") {
                    treeOrIntegrator(key, resource, func)
                }
            } else {

                if ( typeof  treeOrIntegrator == "function") {
                    const integrator = treeOrIntegrator as ResourceIntegrator
                    const values = integrator(key, resource, func)
                    configureTree(func, values[0], values[1])
                } else {
                    const newResource = resource.addResource(key)
                    configureTree(func, newResource, treeOrIntegrator)
                }
            }
        })
}

export class WebLambda implements Handler {
    private readonly data: HandlerData;

    constructor(data: HandlerData) {
        this.data = data
    }

    handle(config: HandlerOptions): Configurator {

        let id = `${config.parentName}-${this.data.handler}`;
        const func = new Function(config.parentConstruct, id, this.data)
        config.topic.grantPublish(func)
        config.deadLetterQueue.grantSendMessages(func)
        func.addEnvironment("output", config.topic.topicArn)

        configureTree(func, this.data.topResource, this.data.resourceTree)

        return new WebLambdaConfigurator(id, func)
    }

    static create(data: HandlerData) {

        return new WebLambda(data)
    }
}

export class WebLambdaConfigurator extends DefaultConfigurator {

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
};