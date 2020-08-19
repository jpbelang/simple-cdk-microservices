import {SimpleLambdaSubscribed} from "../../main/js/subscribed_lambda";
import {Function} from "@aws-cdk/aws-lambda";
const {Runtime, AssetCode} = jest.requireActual("@aws-cdk/aws-lambda");
import { mocked } from 'ts-jest/utils';


import {Queue} from "@aws-cdk/aws-sqs";
import {Topic} from "@aws-cdk/aws-sns";
import '@aws-cdk/assert/jest';

import {Construct, Stack} from "@aws-cdk/core";
import {Optional} from "typescript-optional";
import {IGrantable} from "@aws-cdk/aws-iam"
import {haveResource} from "@aws-cdk/assert";
import { when } from 'jest-when'
import mock = jest.mock;


const addEnvironmentMock = jest.fn().mockImplementation()
jest.mock('@aws-cdk/aws-lambda', () => {
    const functionMock = jest.fn().mockImplementation(() => {
        return {
            addEnvironment: addEnvironmentMock
        };
    });
    return {
        Function: functionMock,
        AssetCode: jest.fn().mockImplementation()
    };
});

const grantPublishMock = jest.fn().mockImplementation()
jest.mock('@aws-cdk/aws-sns', () => {
    return {
        Topic: jest.fn().mockImplementation(() => {
            return {
                grantPublish: grantPublishMock,
                topicArn: "some::topic::arn"
            };
        })
    };
});

const sendMessageMock = jest.fn().mockImplementation()
jest.mock('@aws-cdk/aws-sqs', () => {
    return {
        Queue: jest.fn().mockImplementation(() => {
            return {
                grantSendMessages: sendMessageMock
            };
        })
    };
});


describe("mock subscribed lambda testing", () => {

        beforeEach(() => {

        })
        afterEach(() => {
            jest.clearAllMocks();
        });

        it("create lambda", () => {

            AssetCode.fromInline = jest.fn()

            const f = new Function(new Stack(), "allo", {
                functionName: "hello",
                runtime: Runtime.NODEJS_12_X,
                code: AssetCode.fromInline("doodah"),
                handler: "foo"
            })

            f.addEnvironment("allo", "bye");

            expect(addEnvironmentMock.mock.calls[0][0]).toEqual("allo")

        })

        it("thinkbig", () => {

            const functionMock = mocked(Function, true)

            const lh = SimpleLambdaSubscribed.create({
                events: ["please"], name: "my_lambda"
            })

            const actualFunction = Function.prototype.constructor() as Function
            let theStack = new Stack();
            lh.handle({
                asset: AssetCode.fromInline("doodah"),
                deadLetterQueue: new Queue(theStack, "dead"),
                parentConstruct: theStack,
                parentName: "hola",
                runtime: Runtime.NODEJS_12_X,
                topic: new Topic(theStack, "topic", {
                    topicName: "topicName"
                })
            })

            expect(addEnvironmentMock.mock.calls[0]).toEqual(["output", "some::topic::arn"])
            expect(grantPublishMock.mock.calls[0][0]).toEqual(actualFunction)
            expect(sendMessageMock.mock.calls[0][0]).toEqual(actualFunction)

        })

    }
);