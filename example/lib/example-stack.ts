import {MicroserviceBuilder} from "./microservices/microservice"
import {DynamoDBHandler} from "./microservices/dynamo_db";
import {AttributeType} from "@aws-cdk/aws-dynamodb";
import {SimpleLambdaSubscribed} from "./microservices/subscribed_lambda";
import {AssetCode, Runtime} from "@aws-cdk/aws-lambda";
import {simpleMethod, WebLambda} from "./microservices/web_lambda";
import {RestApi} from "@aws-cdk/aws-apigateway";
import {Construct, Stack, StackProps} from "@aws-cdk/core";

export class ExampleStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const me = new RestApi(this, "GW");
        // The code that defines your stack goes here
        MicroserviceBuilder.microservice({
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
    }
}
