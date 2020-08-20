import {SimpleLambdaSubscribed} from "../../main/js/subscribed_lambda";
import {AssetCode, Runtime} from "@aws-cdk/aws-lambda";
import {Queue} from "@aws-cdk/aws-sqs";
import {Topic} from "@aws-cdk/aws-sns";
import '@aws-cdk/assert/jest';

import {Stack} from "@aws-cdk/core";


describe("subscribed lambda testing", () => {

        it("create lambda", () => {

            const lh = SimpleLambdaSubscribed.create({
                events: ["please"], name: "my_lambda", runtime: Runtime.NODEJS_12_X,

            })

            let theStack = new Stack();
            lh.handle({
                asset: AssetCode.fromInline("doodah"),
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