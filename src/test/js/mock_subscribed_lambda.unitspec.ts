import {LambdaConfigurator, SimpleLambdaSubscribed} from "../../main/js/subscribed_lambda";
import {Function, IEventSource} from "@aws-cdk/aws-lambda";


import {Queue} from "@aws-cdk/aws-sqs";
import {Topic} from "@aws-cdk/aws-sns";
import '@aws-cdk/assert/jest';

import {Stack} from "@aws-cdk/core";
import {IGrantable} from "@aws-cdk/aws-iam"
import {Configurator} from "../../main/js/microservice";

const {Runtime, AssetCode} = jest.requireActual("@aws-cdk/aws-lambda");


const addEnvironmentMock = jest.fn().mockImplementation()
jest.mock('@aws-cdk/aws-lambda', () => {
    const functionMock = jest.fn().mockImplementation(() => {
        return {
            addEnvironment: addEnvironmentMock
        };
    });
    return {
        Function: functionMock,
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

        it("configuration of handler", () => {

            const lh = SimpleLambdaSubscribed.create({
                topicEvents: ["please"], handler: "my_lambda",
                runtime: Runtime, code: AssetCode.fromInline("doodah")
            })

            const actualFunction = Function.prototype.constructor() as Function
            let theStack = new Stack();
            const configurator = lh.handle({
                deadLetterQueue: new Queue(theStack, "dead"),
                parentConstruct: theStack,
                parentName: "hola",
                topic: new Topic(theStack, "topic", {
                    topicName: "topicName"
                })
            })

            expect(addEnvironmentMock.mock.calls[0]).toEqual(["output", "some::topic::arn"])
            expect(grantPublishMock.mock.calls[0][0]).toEqual(actualFunction)
            expect(sendMessageMock.mock.calls[0][0]).toEqual(actualFunction)

            configurator.wantEnvironment({
                id: "", setEnvironment(setter: (key: string, value: string) => void): void {
                    setter("hello", "goodbye")
                }, grantSecurityTo(grantable: IGrantable): void {
                }, wantEnvironment(z: Configurator): void {
                }, wantSecurity(z: Configurator): void {
                }, listenToServiceTopic(topic: Topic): void {
                }, receiveInternalEvents(setter: (source: IEventSource) => void): void {
                }, wantInternalEventsSource(z: Configurator): void {
                }

            });

            expect(addEnvironmentMock.mock.calls[1]).toEqual(["hello", "goodbye"])
            expect(configurator.id).toEqual("hola-my_lambda")
        })

        it("post configuration", () => {

            const actualFunction = Function.prototype.constructor() as Function

            const configurator = new LambdaConfigurator("foo", actualFunction, null as any, [])
            configurator.wantEnvironment({
                id: "",
                setEnvironment(setter: (key: string, value: string) => void): void {
                    setter("hello", "goodbye")
                },
                grantSecurityTo(grantable: IGrantable): void {
                },
                wantEnvironment(z: Configurator): void {
                },
                wantSecurity(z: Configurator): void {
                }, listenToServiceTopic(topic: Topic): void {
                }, receiveInternalEvents(setter: (source: IEventSource) => void): void {
                }, wantInternalEventsSource(z: Configurator): void {
                }


            });

            expect(addEnvironmentMock.mock.calls[0]).toEqual(["hello", "goodbye"])
        })

    }
);