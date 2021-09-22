import {Queue} from "@aws-cdk/aws-sqs";
import {Topic} from "@aws-cdk/aws-sns";
import '@aws-cdk/assert/jest';

import {Stack} from "@aws-cdk/core";
import {DynamoDBHandler} from "../../main/js/dynamo_db";
import {AttributeType} from "@aws-cdk/aws-dynamodb";
import {ExternalMicroservice} from "../../main/js/external_microservice";

describe('external services', () => {
    it('should build', () => {

        const theStack = new Stack();

        const nonFifo = ExternalMicroservice.createFromArn(theStack, "arn:aws:sns:ca-central-1:553315045420:Dev-TougoServiceTopic")
        const fifo = ExternalMicroservice.createFromArn(theStack, "arn:aws:sns:ca-central-1:553315045420:Int-TougoServiceTopic.fifo")

        expect(nonFifo.isTopicFifo()).toBeFalsy()
        expect(fifo.isTopicFifo()).toBeTruthy()
    });
});