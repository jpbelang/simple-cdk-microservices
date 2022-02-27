import {SNSEvent, SNSMessageAttributes, SQSEvent, SQSMessageAttributes} from "aws-lambda";
import {SNSEventMetadata, SQSEventMetadata} from "../../../main/js/helpers/messaging_support";

type AttributeMap = { [id: string]: string; }
describe('using messages', () => {
    describe('from SQS', () => {

        function getSQSMessage(args: { attributes: AttributeMap }): SQSEvent {

            function keyValue(input: SQSMessageAttributes, k: string, v: string):  SQSMessageAttributes {
                const ret = {} as SQSMessageAttributes
                ret[k] = {
                    binaryListValues: [], binaryValue: "", dataType: "String", stringListValues: [], stringValue: v
                }

                return {
                    ...input,
                    ...ret
                };
            }

            return {
                Records: [
                    {
                        awsRegion: "",
                        body: "",
                        eventSource: "",
                        eventSourceARN: "",
                        md5OfBody: "",
                        messageId: "",
                        receiptHandle: "", attributes: {
                            ApproximateFirstReceiveTimestamp: "",
                            ApproximateReceiveCount: "",
                            SenderId: "",
                            SentTimestamp: "",
                        },

                        messageAttributes: Object.entries(args.attributes).reduce((p, c) => keyValue(p, c[0], c[1]), {})
                    }
                ]
            };
        }

        it('should parse metadata', () => {
            const now = new Date();
            const message: SQSEvent = getSQSMessage({
                attributes: {
                    "event-name": "boo",
                    "event-time": now.toISOString()
                }
            })

            const md = SQSEventMetadata.fromEvent(message, 0);
            expect(md.eventName()).toEqual("boo")
            expect(md.eventTime()).toEqual(now)
        });

        it('should parse metadata with defaults', () => {
            const now = new Date();
            const message: SQSEvent = getSQSMessage({
                attributes: {
                }
            })

            const md = SQSEventMetadata.fromEvent(message, 0, now);
            expect(md.eventName()).toEqual("_no_name_")
            expect(md.eventTime()).toEqual(now)
        });

    });

    describe('from SNS', () => {

        function getSQSMessage(args: { attributes: AttributeMap }): SNSEvent {

            function keyValue(input: SNSMessageAttributes, k: string, v: string):  SNSMessageAttributes {
                const ret = {} as SNSMessageAttributes
                ret[k] = {
                    Type: "String", Value: v

                }

                return {
                    ...input,
                    ...ret
                };
            }

            return {
                Records: [
                    {
                        EventSource: "", EventSubscriptionArn: "", EventVersion: "", Sns: {
                            Message: "",
                            MessageAttributes: Object.entries(args.attributes).reduce((p, c) => keyValue(p, c[0], c[1]), {}),
                            MessageId: "",
                            Signature: "",
                            SignatureVersion: "",
                            SigningCertUrl: "",
                            Subject: "",
                            Timestamp: "",
                            TopicArn: "",
                            Type: "",
                            UnsubscribeUrl: ""
                        }

                    }
                ]

            };
        }

        it('should parse metadata', () => {
            const now = new Date();
            const message: SNSEvent = getSQSMessage({
                attributes: {
                    "event-name": "boo",
                    "event-time": now.toISOString()
                }
            })

            const md = SNSEventMetadata.fromEvent(message);
            expect(md.eventName()).toEqual("boo")
            expect(md.eventTime()).toEqual(now)
        });

        it('should parse metadata with defaults', () => {
            const now = new Date();
            const message: SNSEvent = getSQSMessage({
                attributes: {
                }
            })

            const md = SNSEventMetadata.fromEvent(message, now);
            expect(md.eventName()).toEqual("_no_name_")
            expect(md.eventTime()).toEqual(now)
        });

    });

});