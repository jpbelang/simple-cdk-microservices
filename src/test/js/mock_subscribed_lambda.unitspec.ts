import {SimpleLambdaSubscribed} from "../../main/js/subscribed_lambda";
import {AssetCode, Function, Runtime} from "@aws-cdk/aws-lambda";
import {Queue} from "@aws-cdk/aws-sqs";
import {Topic} from "@aws-cdk/aws-sns";
import '@aws-cdk/assert/jest';

import {Construct, Stack} from "@aws-cdk/core";
import {Optional} from "typescript-optional";
import {IGrantable} from "@aws-cdk/aws-iam"
import {haveResource} from "@aws-cdk/assert";

jest.mock('@aws-cdk/aws-lambda', () => {
    return {
        Function: jest.fn().mockImplementation(() => {
            return {
                addEnvironment: () => {
                    console.log("Dammit")
                }
            };
        }),
        AssetCode: jest.fn().mockImplementation()
    };
});

describe("mock subscribed lambda testing", () => {

        beforeEach(() => {
            (Function as any).mockClear();
        });

        it("create lambda", () => {

            AssetCode.fromInline = jest.fn()

            const f = new Function(new Stack(), "allo", {
                functionName: "hello",
                runtime: null as any,
                code: AssetCode.fromInline("doodah"),
                handler: "foo"
            })

            f.addEnvironment("allo", "bye");

        })
        it("thinkbig", () => {

            AssetCode.fromInline = jest.fn()

            const lh = SimpleLambdaSubscribed.create({
                events: ["please"], name: "my_lambda"
            })

            let theStack = new Stack();
            lh.handle({
                asset: AssetCode.fromInline("doodah"),
                deadLetterQueue: new Queue(theStack, "dead"),
                parentConstruct: theStack,
                parentName: "hola",
                runtime: null as any,
                topic: new Topic(theStack, "topic", {
                    topicName: "topicName"
                })
            })

        })

    }
);