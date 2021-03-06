import {SimpleLambdaSubscribed} from "../../main/js";
import {AssetCode, Runtime} from "@aws-cdk/aws-lambda";
import {Queue} from "@aws-cdk/aws-sqs";
import {Topic} from "@aws-cdk/aws-sns";
import '@aws-cdk/assert/jest';

import {Stack} from "@aws-cdk/core";


describe("subscribed lambda testing", () => {

        it("create lambda", () => {

            const lh = SimpleLambdaSubscribed.create({
                topicEvents: ["please"], runtime: Runtime.NODEJS_12_X, code: AssetCode.fromInline("doodah"), handler: "my_lambda"

            })

            let theStack = new Stack();
            lh.handle({
                env: "Dev",
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

        })
    }
);