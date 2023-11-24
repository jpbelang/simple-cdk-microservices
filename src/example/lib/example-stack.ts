import {AttributeType, StreamViewType} from "aws-cdk-lib/aws-dynamodb";
import {AssetCode, Code, Function, InlineCode, Runtime} from "aws-cdk-lib/aws-lambda";
import {RestApi} from "aws-cdk-lib/aws-apigateway";
import {Duration, Stack, StackProps} from "aws-cdk-lib";
import {MicroserviceBuilder} from "../../main/js";
import {DynamoDBHandler} from "../../main/js";
import {SimpleLambdaSubscribed} from "../../main/js";
import {simpleMethod, WebLambda} from "../../main/js";
import {DynamoStreamLambda} from "../../main/js";
import {AsyncLambda} from "../../main/js/async_local_lambda";
import {TimerLambda} from "../../main/js/timer_lambda";
import {Rule, Schedule, RuleTargetInput, EventBus} from "aws-cdk-lib/aws-events"
import {Construct} from "constructs";
import {eventBridgePublisher, eventBridgeSubscriber, snsPublisher, snsSubscriber} from "../../main/js/microservice";
import {CognitoHandler} from "../../main/js/cognito_handler";
import {AccountRecovery} from "aws-cdk-lib/aws-cognito";
import {V1ToV2Table} from "../../main/js/compatibility";

export class ExampleStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const me = new RestApi(this, "GW");
        const bus = new EventBus(this, "bus", {
            eventBusName: "ApplicationBus"
        });

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
                myTable: DynamoDBHandler.create({
                    compatibility: V1ToV2Table,
                    partitionKey: {name: "pk", type: AttributeType.STRING},
                    sortKey: {name: "sk", type: AttributeType.STRING},
                }),
                one: SimpleLambdaSubscribed.create({
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
                }),
                cognito: CognitoHandler.create({

                    selfSignUpEnabled: true,

                    signInAliases: {
                        username: true,
                        email: true
                    },
                    standardAttributes: {
                        email: {
                            required: true,
                            mutable: true
                        },
                        givenName: {
                            required: true,
                            mutable: true
                        },
                        familyName: {
                            required: true,
                            mutable: true,
                        },
                        fullname: {
                            required: true,
                            mutable: true,
                        },
                        address: {
                            required: false,
                            mutable: true,
                        },
                        birthdate: {
                            required: true,
                            mutable: true,
                        },
                        phoneNumber: {
                            required: false,
                            mutable: true,
                        },

                    },
                    passwordPolicy: {
                        minLength: 12,
                        requireLowercase: true,
                        requireUppercase: true,
                        requireDigits: true,
                        requireSymbols: true,
                        tempPasswordValidity: Duration.days(3),
                    },
                    accountRecovery: AccountRecovery.EMAIL_ONLY,
                    autoVerify: {email: true, phone: false},
                    lambdaTriggerFactories: {
                        preSignUp: (c) => new Function(c, 'preSignup', {
                            runtime: Runtime.NODEJS_14_X,
                            handler: 'noconfirmation.entry',
                            code: AssetCode.fromInline("doodah"),
                        })
                    },

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

        const service3 = MicroserviceBuilder.microservice({
            env: "Dev",
            name: "third-example",
            tags: {
                project: "IT"
            },
            messagePublisher: eventBridgePublisher(bus),
            messageSubscriber: eventBridgeSubscriber(bus),
            handlers: {
                one: SimpleLambdaSubscribed.create({
                    topicEvents: ["please"],
                    runtime: Runtime.NODEJS_14_X,
                    code: new InlineCode("def main(event, context):\n\tprint(event)\n\treturn {'statusCode': 200, 'body': 'Hello, World'}"),
                    handler: "index.main",
                })
            }
        }).build(this);

        const service4 = MicroserviceBuilder.microservice({
            env: "Dev",
            name: "fourth-example",
            tags: {
                project: "IT"
            },
            messagePublisher: eventBridgePublisher(bus),
            messageSubscriber: eventBridgeSubscriber(bus),
            handlers: {
                lastly: SimpleLambdaSubscribed.create({
                    topicEvents: ["please"],
                    runtime: Runtime.NODEJS_14_X,
                    code: new InlineCode("def main(event, context):\n\tprint(event)\n\treturn {'statusCode': 200, 'body': 'Hello, World'}"),
                    handler: "index.main",
                })
            }
        }).build(this);

        service3.listensForEventsFrom([service4])
    }
}
