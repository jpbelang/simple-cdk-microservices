import {SimpleLambdaSubscribed} from "../../main/js";
import {AssetCode, Runtime} from "aws-cdk-lib/aws-lambda";
import { Capture, Match, Template } from "aws-cdk-lib/assertions";
import {Queue} from "aws-cdk-lib/aws-sqs";
import {Topic} from "aws-cdk-lib/aws-sns";
import {Stack} from "aws-cdk-lib";
import {snsPublisher, snsSubscriber} from "../../main/js/microservice";


describe("subscribed lambda testing", () => {

        it("create lambda", () => {

            const lh = SimpleLambdaSubscribed.create({
                topicEvents: ["please"], runtime: Runtime.NODEJS_12_X, code: AssetCode.fromInline("doodah"), handler: "my_lambda"

            })

            let theStack = new Stack();
            const subscriber = snsSubscriber()({
                name: "boo"
            } as any, theStack)
            const publisher = snsPublisher()({
                name: "boo"
            } as any, theStack)

            let queue: Queue = new Queue(theStack, "dead")
            lh.handle({
                env: "Dev",
                deadLetterQueue: () => queue,
                deadLetterFifoQueue: () => new Queue(theStack, "deadFifo"),
                parentConstruct: theStack,
                handlerName: "hola",
                publisher: publisher,
                subscriber: subscriber
            })

            const template = Template.fromStack(theStack);
            template.hasResource("AWS::Lambda::Function",   {
                "Type": "AWS::Lambda::Function",
                "Properties": {
                    "Code": {
                        "ZipFile": "doodah"
                    },
                    "Role": {
                        "Fn::GetAtt": [
                            "mylambdaServiceRole8D7BC871",
                            "Arn"
                        ]
                    },
                    "DeadLetterConfig": {
                        "TargetArn": {
                            "Fn::GetAtt": [
                                "dead9A6F9BCE",
                                "Arn"
                            ]
                        }
                    },
                    "Environment": {
                        "Variables": {
                            "output": {
                                "Ref": "booPublisherTopicBE965723"
                            },
                            "env": "Dev"
                        }
                    },
                    "Handler": "my_lambda",
                    "Runtime": "nodejs12.x"
                },
                "DependsOn": [
                    "mylambdaServiceRoleDefaultPolicy4394AD8A",
                    "mylambdaServiceRole8D7BC871"
                ]
            });

        })
    }
);