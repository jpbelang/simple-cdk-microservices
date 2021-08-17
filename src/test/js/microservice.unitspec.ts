import {Configurator, DefaultConfigurator, Handler, Microservice, MicroserviceBuilder} from "../../main/js";
import {Construct, Stack, Token} from "@aws-cdk/core";
import {anything, capture, instance, mock, verify, when} from "ts-mockito";
import '@aws-cdk/assert/jest';

describe('using microservice builder', () => {

    it('should work ?', () => {

        const mockHandler = mock<Handler>()
        when(mockHandler.handle(anything())).thenReturn(new DefaultConfigurator("a"))
        const m =MicroserviceBuilder.microservice({
            env: "something", handlers: [
                instance(mockHandler)
            ], name: "blah", orderedOutput: false
        })


        let theStack = new Stack();
        m.build(theStack)

        // keeping this as information....
        const a = capture(mockHandler.handle).first()[0]
        console.log(theStack.resolve(a.topic.topicName))

        expect(theStack).toHaveResource("AWS::SNS::Topic", {
            TopicName: "blahTopic"
        });

        expect(theStack).toHaveResource("AWS::SQS::Queue", {
            QueueName: "blahDeadLetterQueue"
        });
    });
});