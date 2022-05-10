import {AssetCode, Runtime} from "aws-cdk-lib/aws-lambda";
import {Queue} from "aws-cdk-lib/aws-sqs";
import {Topic} from "aws-cdk-lib/aws-sns";
import {Stack} from "aws-cdk-lib";
import {simpleMethod, WebLambda} from "../../main/js";
import {RestApi} from "aws-cdk-lib/aws-apigateway";
import {Template} from "aws-cdk-lib/assertions";
import {snsPublisher, snsSubscriber} from "../../main/js/microservice";


describe("web lambda testing", () => {

        it("create lambda", () => {

            let theStack = new Stack();
            const subscriber = snsSubscriber()({
                name: "boo"
            } as any, theStack)
            const publisher = snsPublisher()({
                name: "boo"
            } as any, theStack)
            const lh = WebLambda.create({
                runtime: Runtime.NODEJS_12_X,
                resourceTree: {
                  "fun": {
                      POST: simpleMethod()
                  }
                },
                topResource: new RestApi(theStack, "myapi").root,
                code: AssetCode.fromInline("doodah"),
                handler: "my_lambda"

            })

            lh.handle({
                env: "Dev",
                deadLetterQueue: () => new Queue(theStack, "dead"),
                deadLetterFifoQueue: () => new Queue(theStack, "deadFifo"),
                parentConstruct: theStack,
                handlerName: "hola",
                subscriber: subscriber,
                publisher: publisher
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

            template.hasResource("AWS::ApiGateway::RestApi",   {
                "Type": "AWS::ApiGateway::RestApi",
                "Properties": {
                    "Name": "myapi"
                }
            });
        })
    }
);