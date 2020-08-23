import {AssetCode, Runtime} from "@aws-cdk/aws-lambda";
import {Queue} from "@aws-cdk/aws-sqs";
import {Topic} from "@aws-cdk/aws-sns";
import '@aws-cdk/assert/jest';

import {Stack} from "@aws-cdk/core";
import {simpleMethod, WebLambda} from "../../main/js/web_lambda";
import {RestApi} from "@aws-cdk/aws-apigateway";


describe("web lambda testing", () => {

        it("create lambda", () => {

            let theStack = new Stack();

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
                deadLetterQueue: new Queue(theStack, "dead"),
                parentConstruct: theStack,
                parentName: "hola",
                topic: new Topic(theStack, "topic", {
                    topicName: "topicName"
                })
            })

            expect(theStack).toHaveResource("AWS::Lambda::Function", {
                "Handler": "my_lambda",
                "Runtime": "nodejs12.x"
            });

            expect(theStack).toHaveResource("AWS::ApiGateway::RestApi", {
                "Name": "myapi",
            });
        })
    }
);