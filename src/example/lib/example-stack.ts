import {AttributeType, StreamViewType} from "aws-cdk-lib/aws-dynamodb";
import {AssetCode, Runtime} from "aws-cdk-lib/aws-lambda";
import {RestApi} from "aws-cdk-lib/aws-apigateway";
import {Duration, Stack, StackProps} from "aws-cdk-lib";
import {MicroserviceBuilder} from "../../main/js";
import {DynamoDBHandler} from "../../main/js";
import {SimpleLambdaSubscribed} from "../../main/js";
import {simpleMethod, WebLambda} from "../../main/js";
import {DynamoStreamLambda} from "../../main/js";
import {AsyncLambda} from "../../main/js/async_local_lambda";
import {TimerLambda} from "../../main/js/timer_lambda";
import {Rule, Schedule, RuleTargetInput} from "aws-cdk-lib/aws-events"
import {Construct} from "constructs";
import {snsPublisher, snsSubscriber} from "../../main/js/microservice";

export class ExampleStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const me = new RestApi(this, "GW");
        // The code that defines your stack goes here
        const service1 = MicroserviceBuilder.microservice({
            env: "Dev",
            name: "first-example",
            tags: {
                project: "IT"
            },
            messagePublisher: snsPublisher(),
            messageSubscriber: snsSubscriber(),
            handlers: {
                something: AsyncLambda.create({
                    runtime: Runtime.NODEJS_14_X,
                    code: AssetCode.fromAsset("../../dist/example/apps"),
                    handler: "async_app.worker",
                    tags: {
                        project: "NotIT"
                    }
                }),
                database: DynamoDBHandler.create({
                    partitionKey: {name: "pk", type: AttributeType.STRING},
                    sortKey: {name: "sk", type: AttributeType.STRING},
                }),
                simpleSubscribed: SimpleLambdaSubscribed.create({
                    topicEvents: ["please"],
                    runtime: Runtime.NODEJS_14_X,
                    code: AssetCode.fromAsset("../../dist/example/apps"),
                    handler: "my_lambda.worker"
                }),
                webApi: WebLambda.create({
                    runtime: Runtime.NODEJS_14_X,
                    code: AssetCode.fromInline("doodah"),
                    handler: "anotherLambda",
                    resourceTree: {
                        human: {
                            GET: simpleMethod()
                        }
                    },
                    topResource: me.root

                }),
                secondApi: WebLambda.create({
                    runtime: Runtime.NODEJS_14_X,
                    code: AssetCode.fromInline("doodah"),
                    handler: "whole_tree",
                    basePath: "banana",
                    resourceTree: null
                })
            }
        }).build(this);


        const service2 = MicroserviceBuilder.microservice({
            env: "Prod",
            name: "second-example",
            tags: {
                project: "IT"
            },
            messagePublisher: snsPublisher(),
            messageSubscriber: snsSubscriber(),
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
                }),
                TimerLambda.create({
                    runtime: Runtime.NODEJS_12_X,
                    code: AssetCode.fromInline("doodah"),
                    handler: "timerLambda",
                    event: RuleTargetInput.fromText("thisevent"),
                    schedule: Schedule.cron({
                        hour: "1",
                        minute: "0"
                    })
                })
            ]
        }).build(this);

        service1.listensForEventsFrom([service2])
    }
}
