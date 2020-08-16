/*
    dialog = api.root.add_resource("smt")

    return LambdaMicroserviceBuilder.create_microservice(
        service_name=identifier + "-smt-participation",
        asset="assets/smt-participation-service-1.0.0-SNAPSHOT.zip",
        runtime_calculator=always_node,
        handlers=[
            DynamoTableHandler.create_handler(name="campaigninfo", partition_key=dynamo.Attribute(
                name="Id",
                type=dynamo.AttributeType.STRING), sort_key=dynamo.Attribute(
                name="Sort",
                type=dynamo.AttributeType.STRING)),
            WebHandler.create_handler(name="smtparticipation.http", setup_resources=lambda l:
            build_resource_tree(l, dialog, integration_factory=simple_integration(), tree_definition={
                "smtcampaign": {
                    "POST": simple_method_integration(),
                    "GET": simple_method_integration(),
                    "{campaign_id}": {
                        "GET": simple_method_integration(),
                        "DELETE": simple_method_integration()
                    }
                }
            }))
        ]).build(scope=parent)

 */
import {AssetCode, Function} from "@aws-cdk/aws-lambda";
import {Queue} from "@aws-cdk/aws-sqs";
import {Topic} from "@aws-cdk/aws-sns";

import {Runtime} from "@aws-cdk/aws-lambda/lib/runtime";
import {Construct} from "@aws-cdk/core";
import {Optional} from "typescript-optional";
import {IGrantable} from "@aws-cdk/aws-iam"

export interface Configurator {
    name: string
    construct: Construct
    grant(grantable: IGrantable): void;
    setupEnvironment(setter: (key: string, value: string) => void): void
}

export type HandlerOptions = { parentName: string; deadLetterQueue: Queue; runtime: Runtime; topic: Topic; parentConstruct: Construct, asset: AssetCode }

export interface Handler {

    handle(config: HandlerOptions): Configurator
}


type MicroserviceData = {
    parentName: string
    deadLetterQueue: Queue
    runtime: Runtime
    topic: Topic
    parentConstruct: Construct
    handlers: Handler[]
}

class Microservice {
    private data: MicroserviceData;

    constructor(data: MicroserviceData) {
        this.data = data
    }

    interestedIn(micro: Microservice) {

    }
}

type MicroserviceBuilderData = {
    name: string
    assets: string
    runtime: Runtime
    handler: Handler[]
}

class MicroserviceBuilder {
    private data: MicroserviceBuilderData;

    constructor(data: MicroserviceBuilderData) {
        this.data = data;
    }

    private handlers: Handler[]

    build(construct: Construct): Microservice {

        const asset = AssetCode.fromAsset(this.data.assets)
        const serviceTopic = new Topic(construct, this.data.name + "Topic", {
            topicName: this.data.name + "Topic"
        })

        const deadLetterQueue = new Queue(construct, this.data.name + "DeadLetterTopic", {
                queueName: this.data.name + "DeadLetterTopic"
            }
        )

        const configurators = this.data.handler.map(h => h.handle({
            parentConstruct: construct,
            parentName: this.data.name,
            runtime: Optional.ofNullable(this.data.runtime).orElse(Runtime.NODEJS_12_X),
            topic: serviceTopic,
            deadLetterQueue: deadLetterQueue,
            asset: asset
        }))

        configurators.forEach((c) => configurators.filter(e => e.name != c.name).forEach(e => {
            if (c.construct instanceof IGrantable) {
                e.grant(c.construct)
            }

            c.setupEnvironment()
        }))
        return new Microservice({
            parentConstruct: construct,
            parentName: this.data.name,
            runtime: Optional.ofNullable(this.data.runtime).orElse(Runtime.NODEJS_12_X),
            topic: serviceTopic,
            deadLetterQueue: deadLetterQueue,
            handlers: this.data.handler
        })
    }

    static microservice(data: MicroserviceBuilderData): MicroserviceBuilder {
        return new MicroserviceBuilder(data)
    }
}