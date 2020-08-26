import {AttributeType, StreamViewType} from "@aws-cdk/aws-dynamodb";
import {AssetCode, Runtime} from "@aws-cdk/aws-lambda";
import {RestApi} from "@aws-cdk/aws-apigateway";
import {Construct, Stack, StackProps} from "@aws-cdk/core";
import {MicroserviceBuilder} from "../../main/js/microservice";
import {DynamoDBHandler} from "../../main/js/dynamo_db";
import {SimpleLambdaSubscribed} from "../../main/js/subscribed_lambda";
import {simpleMethod, WebLambda} from "../../main/js/web_lambda";
import {DynamoStreamLambda} from "../../main/js/dynamo_stream_lambda";

export class ExampleStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const me = new RestApi(this, "GW");
        // The code that defines your stack goes here
        const service1 = MicroserviceBuilder.microservice({
            name: "first-example",
            handlers: [
                DynamoDBHandler.create({
                    partitionKey: {name: "pk", type: AttributeType.STRING},
                    sortKey: {name: "sk", type: AttributeType.STRING},
                    tableName: "myTable",
                }),
                SimpleLambdaSubscribed.create({
                    topicEvents: ["please"],
                    runtime: Runtime.NODEJS_12_X,
                    code: AssetCode.fromInline("doodah"),
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


       const service2 =  MicroserviceBuilder.microservice({
            name: "second-example",
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
