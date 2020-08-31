import {Queue} from "@aws-cdk/aws-sqs";
import {Topic} from "@aws-cdk/aws-sns";
import '@aws-cdk/assert/jest';

import {Stack} from "@aws-cdk/core";
import {DynamoDBHandler} from "../../main/js/dynamo_db";
import {AttributeType} from "@aws-cdk/aws-dynamodb";


describe("dynamo db testing", () => {

        it("create dynamodb", () => {

            const lh = DynamoDBHandler.create({
                partitionKey: {name: "pk", type: AttributeType.STRING},
                sortKey: {name: "sk", type: AttributeType.STRING},
                tableName: "myTable",
            })

            let theStack = new Stack();
            lh.handle({
                deadLetterQueue: new Queue(theStack, "dead"),
                parentConstruct: theStack,
                parentName: "hola",
                topic: new Topic(theStack, "topic", {
                    topicName: "topicName"
                })
            })

            expect(theStack).toHaveResource("AWS::DynamoDB::Table", {
                    "KeySchema": [
                        {
                            "AttributeName": "pk",
                            "KeyType": "HASH"
                        },
                        {
                            "AttributeName": "sk",
                            "KeyType": "RANGE"
                        }
                    ],
                    "AttributeDefinitions": [
                        {
                            "AttributeName": "pk",
                            "AttributeType": "S"
                        },
                        {
                            "AttributeName": "sk",
                            "AttributeType": "S"
                        }
                    ],
                    "BillingMode": "PAY_PER_REQUEST",
                    "TableName": "hola-myTable"
                }
            )

        })
    }
)
