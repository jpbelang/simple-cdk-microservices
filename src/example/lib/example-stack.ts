import {AttributeType, StreamViewType} from "@aws-cdk/aws-dynamodb";
import {AssetCode, Runtime} from "@aws-cdk/aws-lambda";
import {RestApi} from "@aws-cdk/aws-apigateway";
import {Construct, Stack, StackProps} from "@aws-cdk/core";
import {MicroserviceBuilder} from "../../main/js";
import {DynamoDBHandler} from "../../main/js";
import {SimpleLambdaSubscribed} from "../../main/js";
import {simpleMethod, WebLambda} from "../../main/js";
import {DynamoStreamLambda} from "../../main/js";
import {AsyncLambda} from "../../main/js/async_local_lambda";

export class ExampleStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const me = new RestApi(this, "GW");
        // The code that defines your stack goes here
        const service1 = MicroserviceBuilder.microservice({
            env: "Dev",
            name: "first-example",
            orderedEvents: true,
            handlers: [
                AsyncLambda.create({
                    runtime: Runtime.NODEJS_12_X,
                    code: AssetCode.fromAsset("../../dist/example/apps"),
                    handler: "async_app.worker"
                }),
                DynamoDBHandler.create({
                    partitionKey: {name: "pk", type: AttributeType.STRING},
                    sortKey: {name: "sk", type: AttributeType.STRING},
                    tableName: "myTable",
                }),
                SimpleLambdaSubscribed.create({
                    topicEvents: ["please"],
                    runtime: Runtime.NODEJS_12_X,
                    code: AssetCode.fromInline("/Users/jpbelang/Capsana/portal-lambda/portal-cdk-ts/assets/mail-service-1.0.0-SNAPSHOT.zip"),
                    handler: "my_lambda"
                }),
                WebLambda.create({
                    runtime: Runtime.NODEJS_12_X,
                    code: AssetCode.fromInline("doodah"),
                    handler: "anotherLambda",
                    resourceTree: {
                        human: {
                            GET: simpleMethod()
                        }
                    },
                    topResource: me.root

                })
            ]
        }).build(this);


        const service2 = MicroserviceBuilder.microservice({
            env: "Prod",
            name: "second-example",
            orderedEvents: true,
            handlers: [
                DynamoDBHandler.create({
                    partitionKey: {name: "pk", type: AttributeType.STRING},
                    sortKey: {name: "sk", type: AttributeType.STRING},
                    tableName: "otherTable",
                    stream: StreamViewType.NEW_AND_OLD_IMAGES
                }),
                DynamoStreamLambda.create({
                    runtime: Runtime.NODEJS_12_X,
                    code: AssetCode.fromInline("doodah"),
                    handler: "streamLambda"
                })
            ]
        }).build(this);

        service1.listensForEventsFrom([service2])
    }
}
